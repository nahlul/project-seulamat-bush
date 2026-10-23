import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { app } from '../src/server';

const prisma = new PrismaClient();
test('health endpoint', async () => {
  const server = app.listen(0);
  const address = server.address() as { port: number };
  try { const r = await fetch(`http://127.0.0.1:${address.port}/health`); assert.equal(r.status, 200); assert.deepEqual(await r.json(), {ok:true}); }
  finally { server.close(); }
});

test('admin route CRUD validates input, RBAC, and persists changes', async () => {
  const suffix = crypto.randomUUID().replaceAll('-', '');
  const password = 'QaRoute123!';
  const adminEmail = `admin-${suffix}@contoh.com`;
  const userEmail = `user-${suffix}@contoh.com`;
  const [adminUser, normalUser] = await Promise.all([
    prisma.user.create({data:{nama_lengkap:'Admin QA',email:adminEmail,password:await bcrypt.hash(password,4),nik:`11${suffix.slice(0,14)}`,role:'ADMIN'}}),
    prisma.user.create({data:{nama_lengkap:'User QA',email:userEmail,password:await bcrypt.hash(password,4),nik:`12${suffix.slice(0,14)}`,role:'USER'}}),
  ]);
  const server = app.listen(0);
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  let routeId: number | undefined;
  const previousTZ = process.env.TZ;
  try {
    const login = async (email:string) => {
      const response = await fetch(`${base}/api/auth/login`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
      assert.equal(response.status,200);
      return (await response.json() as {token:string}).token;
    };
    const [adminToken,userToken] = await Promise.all([login(adminEmail),login(userEmail)]);
    const headers = (token:string) => ({'content-type':'application/json',authorization:`Bearer ${token}`});
    const body = {asal:'Banda Aceh',tujuan:`Tujuan QA ${suffix.slice(0,6)}`,kuota_total:40,tanggal_keberangkatan:'2027-01-01T08:30:00'};
    process.env.TZ = 'Asia/Jakarta';

    assert.equal((await fetch(`${base}/api/rute`,{method:'POST',headers:headers(userToken),body:JSON.stringify(body)})).status,403);
    assert.equal((await fetch(`${base}/api/rute`,{method:'POST',headers:headers(adminToken),body:JSON.stringify({...body,tanggal_keberangkatan:'invalid'})})).status,400);
    assert.equal((await fetch(`${base}/api/rute`,{method:'POST',headers:headers(adminToken),body:JSON.stringify({...body,tanggal_keberangkatan:'2027-01-01'})})).status,400);
    assert.equal((await fetch(`${base}/api/rute`,{method:'POST',headers:headers(adminToken),body:JSON.stringify({...body,tanggal_keberangkatan:'2027-02-30T08:30:00'})})).status,400);
    assert.equal((await fetch(`${base}/api/rute`,{method:'POST',headers:headers(adminToken),body:JSON.stringify({...body,tanggal_keberangkatan:'2027-01-01T24:00:00'})})).status,400);

    const created = await fetch(`${base}/api/rute`,{method:'POST',headers:headers(adminToken),body:JSON.stringify(body)});
    assert.equal(created.status,201);
    const createdJson = await created.json() as {rute_id:number;tujuan:string;tanggal_berangkat:string;jam_berangkat:string};
    routeId = createdJson.rute_id;
    assert.equal(createdJson.tujuan,body.tujuan);
    assert.equal(createdJson.tanggal_berangkat,'2027-01-01');
    assert.equal(createdJson.jam_berangkat,'08:30');

    await prisma.rute.update({where:{id:routeId},data:{kuota_terisi:5}});
    const tooSmall = await fetch(`${base}/api/rute/${routeId}`,{method:'PUT',headers:headers(adminToken),body:JSON.stringify({...body,kuota_total:4})});
    assert.equal(tooSmall.status,409);
    const unchanged = await prisma.rute.findUnique({where:{id:routeId},select:{kuota_total:true,kuota_terisi:true}});
    assert.deepEqual(unchanged,{kuota_total:40,kuota_terisi:5});
    await prisma.rute.update({where:{id:routeId},data:{kuota_terisi:0}});

    const updated = await fetch(`${base}/api/rute/${routeId}`,{method:'PUT',headers:headers(adminToken),body:JSON.stringify({...body,tujuan:`${body.tujuan} Edit`,kuota_total:80,tanggal_keberangkatan:'2027-01-02T09:45:00'})});
    assert.equal(updated.status,200);
    const updatedJson = await updated.json() as {tujuan:string;kuota_total:number;tanggal_berangkat:string;jam_berangkat:string};
    assert.equal(updatedJson.tujuan,`${body.tujuan} Edit`);
    assert.equal(updatedJson.kuota_total,80);
    assert.equal(updatedJson.tanggal_berangkat,'2027-01-02');
    assert.equal(updatedJson.jam_berangkat,'09:45');

    assert.equal((await fetch(`${base}/api/rute/${routeId}`,{method:'DELETE',headers:headers(userToken)})).status,403);
    assert.equal((await fetch(`${base}/api/rute/${routeId}`,{method:'DELETE',headers:{authorization:`Bearer ${adminToken}`}})).status,200);
    routeId = undefined;
  } finally {
    server.close();
    if (routeId) await prisma.rute.deleteMany({where:{id:routeId}});
    await prisma.user.deleteMany({where:{id:{in:[adminUser.id,normalUser.id]}}});
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test('multipart registration stores the frontend passenger arrays as one family', async () => {
  const suffix = crypto.randomUUID().replaceAll('-', '');
  const password = 'QaRegistration123!';
  const digitStem = crypto.randomBytes(8).readBigUInt64BE().toString().padStart(20, '0').slice(0, 15);
  const passwordHash = await bcrypt.hash(password, 4);
  const [user, adminUser, otherUser] = await Promise.all([
    prisma.user.create({data:{nama_lengkap:'Rahmat Fadli',email:`pendaftar-${suffix}@contoh.com`,password:passwordHash,nik:`${digitStem}0`,role:'USER'}}),
    prisma.user.create({data:{nama_lengkap:'Admin Pendaftaran',email:`admin-pendaftaran-${suffix}@contoh.com`,password:passwordHash,nik:`${digitStem}3`,role:'ADMIN'}}),
    prisma.user.create({data:{nama_lengkap:'Pengguna Lain',email:`pengguna-lain-${suffix}@contoh.com`,password:passwordHash,nik:`${digitStem}4`,role:'USER'}}),
  ]);
  const route = await prisma.rute.create({
    data: {
      asal: 'Banda Aceh',
      tujuan: `Meulaboh QA ${suffix.slice(0, 6)}`,
      waktu_berangkat: new Date('2027-03-12T07:00:00.000Z'),
      kuota_total: 40,
    },
  });
  const server = app.listen(0);
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({email: user.email, password}),
    });
    assert.equal(login.status, 200);
    const {token} = await login.json() as {token: string};

    const form = new FormData();
    const passengers = [
      {
        nama: 'Rahmat Fadli', nik: `${digitStem}1`, gender: 'LAKI-LAKI',
        lahir: '1990-05-12', identitas: 'KTP', alamat: 'Ulee Kareng, Banda Aceh', hp: '081234567891',
      },
      {
        nama: 'Aisyah Rahma', nik: `${digitStem}2`, gender: 'PEREMPUAN',
        lahir: '2015-08-20', identitas: 'KIA', alamat: 'Ulee Kareng, Banda Aceh', hp: '-',
      },
    ];
    for (const passenger of passengers) {
      form.append('nama_peserta', passenger.nama);
      form.append('nik_peserta', passenger.nik);
      form.append('jenis_kelamin', passenger.gender);
      form.append('tanggal_lahir', passenger.lahir);
      form.append('jenis_identitas', passenger.identitas);
      form.append('alamat_rumah', passenger.alamat);
      form.append('no_hp_peserta', passenger.hp);
      form.append('jenis_barang', 'Bawaan Standar');
      form.append('ukuran_barang', 'Sedang');
      form.append('fotoBukti', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], {type: 'image/png'}), `${passenger.nik}.png`);
    }

    const response = await fetch(`${base}/api/pendaftaran?rute_id=${route.id}`, {
      method: 'POST',
      headers: {authorization: `Bearer ${token}`, userId: String(user.id)},
      body: form,
    });
    const responseText = await response.text();
    assert.equal(response.status, 201, responseText);
    const responseBody = JSON.parse(responseText) as {pesan?: string; data?: {pendaftaran_id?: number; kode_booking?: string}};
    assert.equal(responseBody.pesan, 'Pendaftaran berhasil');
    assert.ok(responseBody.data?.pendaftaran_id);
    assert.match(responseBody.data?.kode_booking || '', /^MDK-\d+$/);

    const rows = await prisma.pendaftaran.findMany({where: {user_id: user.id}, orderBy: {id: 'asc'}});
    assert.equal(rows.length, 2);
    assert.equal(rows[0].nama_kepala_keluarga, 'Rahmat Fadli');
    assert.equal(rows[0].is_kepala_keluarga, true);
    assert.equal(rows[0].id_keluarga, null);
    assert.equal(rows[0].kategori_penumpang, 'DEWASA');
    assert.equal(rows[1].nama_kepala_keluarga, 'Rahmat Fadli');
    assert.equal(rows[1].is_kepala_keluarga, false);
    assert.equal(rows[1].id_keluarga, rows[0].id);
    assert.equal(rows[1].kategori_penumpang, 'ANAK-ANAK');
    assert.match(rows[0].foto_bukti || '', /^\/api\/uploads\/[a-f0-9-]+\.png$/);

    const loginAs = async (email: string) => {
      const loginResponse = await fetch(`${base}/api/auth/login`, {
        method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({email, password}),
      });
      assert.equal(loginResponse.status, 200);
      return (await loginResponse.json() as {token: string}).token;
    };
    const [adminToken, otherToken] = await Promise.all([loginAs(adminUser.email), loginAs(otherUser.email)]);

    const historyResponse = await fetch(`${base}/api/pendaftaran/riwayat`, {headers: {authorization: `Bearer ${token}`}});
    assert.equal(historyResponse.status, 200);
    const history = await historyResponse.json() as any[];
    assert.equal(history.length, 2);
    assert.ok(history.every(item => Number.isInteger(item.pendaftaran_id)));
    assert.ok(history.every(item => item.status_pendaftaran === 'MENUNGGU VERIFIKASI'));
    assert.ok(history.every(item => item.tujuan === route.tujuan));
    assert.ok(history.every(item => item.rute?.rute_id === route.id));

    assert.equal((await fetch(`${base}/api/admin/pendaftar/paginated`, {headers: {authorization: `Bearer ${token}`}})).status, 403);
    const adminResponse = await fetch(`${base}/api/admin/pendaftar/paginated?page=1&limit=20&rute_id=${route.id}`, {headers: {authorization: `Bearer ${adminToken}`}});
    assert.equal(adminResponse.status, 200);
    const adminBody = await adminResponse.json() as any;
    assert.equal(adminBody.totalKeluarga, 1);
    assert.equal(adminBody.totalPages, 1);
    assert.equal(adminBody.currentPage, 1);
    assert.equal(adminBody.data.length, 2);
    assert.ok(adminBody.data.every((item: any) => item.rute_tujuan === route.tujuan));
    assert.ok(adminBody.data.every((item: any) => item.kategori));
    assert.ok(!JSON.stringify(adminBody).includes(passwordHash));
    assert.ok(!JSON.stringify(adminBody).includes('reset_token'));

    const photoPath = rows[0].foto_bukti!;
    assert.equal((await fetch(`${base}${photoPath}`, {headers: {authorization: `Bearer ${otherToken}`}})).status, 403);
    assert.equal((await fetch(`${base}${photoPath}`, {headers: {authorization: `Bearer ${token}`}})).status, 200);
    assert.equal((await fetch(`${base}${photoPath}`, {headers: {authorization: `Bearer ${adminToken}`}})).status, 200);

    const invalidBooking = await fetch(`${base}/api/book`, {
      method: 'POST', headers: {'content-type': 'application/json', authorization: `Bearer ${token}`}, body: '{}',
    });
    assert.equal(invalidBooking.status, 400);
    const safeErrorText = await invalidBooking.text();
    assert.match(safeErrorText, /Rute keberangkatan|wajib|valid|number|nan/i);
    assert.doesNotMatch(safeErrorText, /prisma|server\\.ts|invocation/i);
  } finally {
    const rows = await prisma.pendaftaran.findMany({where: {user_id: user.id}, select: {foto_bukti: true}});
    await prisma.pendaftaran.deleteMany({where: {user_id: user.id}});
    await prisma.rute.delete({where: {id: route.id}});
    await prisma.user.deleteMany({where: {id: {in: [user.id, adminUser.id, otherUser.id]}}});
    for (const row of rows) {
      const filename = row.foto_bukti ? path.basename(row.foto_bukti) : '';
      if (filename) await fs.promises.rm(path.resolve(process.env.UPLOADS_DIR || './uploads', filename), {force: true});
    }
    server.close();
  }
});

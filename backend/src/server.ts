import 'dotenv/config'; import crypto from 'crypto'; import path from 'path'; import fs from 'fs';
import express,{Request,Response,NextFunction} from 'express'; import multer from 'multer'; import cors from 'cors'; import helmet from 'helmet'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import {z} from 'zod'; import {Prisma,PrismaClient} from '@prisma/client';
const env=z.object({DATABASE_URL:z.string().min(1),JWT_SECRET:z.string().min(16),PORT:z.coerce.number().default(3000),CORS_ORIGIN:z.string().default('*'),UPLOADS_DIR:z.string().default('./uploads')}).parse(process.env); const prisma=new PrismaClient();
const uploadsDir=path.resolve(env.UPLOADS_DIR); fs.mkdirSync(uploadsDir,{recursive:true});
const app=express(); const upload=multer({storage:multer.memoryStorage(), limits:{fileSize:10*1024*1024},fileFilter:(_,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype))}); app.use(helmet()); const corsOrigins=env.CORS_ORIGIN.split(',').map(x=>x.trim()).filter(Boolean); app.use(cors({origin:(origin,callback)=>{if(!origin||corsOrigins.includes('*')||corsOrigins.includes(origin))return callback(null,true);return callback(null,false)}})); app.use(express.json());
function token(u:any){return jwt.sign({id:u.id,email:u.email,nama_lengkap:u.nama_lengkap,role:u.role},env.JWT_SECRET,{expiresIn:'24h'})} function auth(req:Request,res:Response,next:NextFunction){try{const h=req.headers.authorization;if(!h?.startsWith('Bearer ')) throw 0;const claims:any=jwt.verify(h.slice(7),env.JWT_SECRET);const id=Number(claims.id);if(!Number.isInteger(id)||id<1)throw 0;prisma.user.findUnique({where:{id},select:{id:true,email:true,nama_lengkap:true,role:true,status_akun:true}}).then(u=>{if(!u||u.status_akun!=='AKTIF')return res.status(401).json({error:'Sesi tidak valid atau akun tidak aktif.'});(req as any).user={...claims,id:u.id,email:u.email,nama_lengkap:u.nama_lengkap,role:u.role};next()}).catch(next)}catch{res.status(401).json({error:'Token tidak valid.'})}} function admin(req:Request,res:Response,next:NextFunction){if((req as any).user?.role!=='ADMIN')return res.status(403).json({error:'Akses admin diperlukan.'});next()}
const REJECTED_STATUSES=['DITOLAK','DIBATALKAN'] as const;
const APPROVED_STATUSES=['DISETUJUI','DITERIMA','DITERIMA H-3','TERKONFIRMASI','SIAP BERANGKAT'] as const;
const activeStatusWhere={status:{notIn:[...REJECTED_STATUSES]}};
const approvedStatusWhere={status:{in:[...APPROVED_STATUSES]}};
const routeCounts=async(ruteId:number)=>{const [total,accepted,pending,active]=await Promise.all([prisma.pendaftaran.count({where:{rute_id:ruteId}}),prisma.pendaftaran.count({where:{rute_id:ruteId,...approvedStatusWhere}}),prisma.pendaftaran.count({where:{rute_id:ruteId,status:'MENUNGGU VERIFIKASI'}}),prisma.pendaftaran.count({where:{rute_id:ruteId,...activeStatusWhere}})]);return {total,accepted,pending,active}};
const syncRouteCounters=async(tx:any,ruteId:number)=>{const counts=await tx.pendaftaran.groupBy({by:['status'],where:{rute_id:ruteId},_count:{_all:true}});const accepted=counts.filter((row:any)=>APPROVED_STATUSES.includes(row.status as typeof APPROVED_STATUSES[number])).reduce((sum:number,row:any)=>sum+row._count._all,0);const pending=counts.filter((row:any)=>row.status==='MENUNGGU VERIFIKASI').reduce((sum:number,row:any)=>sum+row._count._all,0);await tx.rute.update({where:{id:ruteId},data:{kuota_terisi:accepted,kuota_fix:accepted,kuota_menunggu:pending}});return {accepted,pending}};
const passengerCountWhere=(ruteId:number,kendaraanId?:number)=>({rute_id:ruteId,...(kendaraanId?{kendaraan_id:kendaraanId}:{}),status:{in:[...APPROVED_STATUSES]}});
const vehicleCounts=async(kendaraanId:number,ruteId:number,kapasitasTotal:number)=>{const terisi=await prisma.pendaftaran.count({where:passengerCountWhere(ruteId,kendaraanId)});return {terisi,sisa_kursi:Math.max(0,kapasitasTotal-terisi)}};
const routeSummary=async(x:any)=>{const counts=await routeCounts(x.id);return {...routeOut(x),total_daftar:counts.total,diterima:counts.accepted,kuota_terisi:counts.accepted,kuota_fix:counts.accepted,kuota_menunggu:counts.pending,kuota_tersisa:Math.max(0,x.kuota_total-counts.accepted),sisa_kuota:Math.max(0,x.kuota_total-counts.accepted)}};
const vehicleSummary=async(k:any)=>{const counts=await vehicleCounts(k.id,k.rute_id,k.kapasitas_total);return {...vehicleOut(k),terisi:counts.terisi,sisa_kursi:counts.sisa_kursi}};
const safeIso=(value:any)=>{const d=value instanceof Date?value:(value?new Date(value):null);return d&&!Number.isNaN(d.getTime())?d.toISOString():''};
const manifestPassenger=(p:any,no:number)=>({...p,no,nik:p.nik_peserta,kategori:p.kategori_penumpang,no_hp:p.no_hp_peserta});
const manifestForRoute=async(ruteId:number)=>{const route=await prisma.rute.findUnique({where:{id:ruteId},include:{kendaraan:true}});if(!route)return null;const passengers=await prisma.pendaftaran.findMany({where:{rute_id:ruteId,kendaraan_id:{not:null},...approvedStatusWhere},include:{kendaraan:true},orderBy:{id:'asc'}});const buses=await Promise.all(route.kendaraan.map(async bus=>{const counts=await vehicleCounts(bus.id,ruteId,bus.kapasitas_total);return {...bus,...counts};}));const perBus=buses.map(bus=>{const ps=passengers.filter(p=>p.kendaraan_id===bus.id);return {id:bus.id,nama_bus:bus.nama_armada,jumlah_penumpang:ps.length,dewasa:ps.filter(p=>p.kategori_penumpang==='DEWASA').length,anak:ps.filter(p=>p.kategori_penumpang==='ANAK-ANAK').length,bayi:ps.filter(p=>p.kategori_penumpang==='BAYI').length,terisi:bus.terisi,sisa_kursi:bus.sisa_kursi};});return {rute_id:route.id,asal:route.asal,tujuan:route.tujuan,waktu_berangkat:safeIso(route.waktu_berangkat),total_penumpang:passengers.length,per_bus:perBus,bus:buses.map(bus=>({id:bus.id,nama_armada:bus.nama_armada,kapasitas_total:bus.kapasitas_total,terisi:bus.terisi,sisa_kursi:bus.sisa_kursi})),penumpang:passengers.map(manifestPassenger)};};
const manifestForBus=async(busId:number)=>{const bus=await prisma.kendaraan.findUnique({where:{id:busId},include:{rute:true}});if(!bus)return null;const rows=await prisma.pendaftaran.findMany({where:{rute_id:bus.rute_id,kendaraan_id:bus.id,...approvedStatusWhere},orderBy:{id:'asc'}});const counts=await vehicleCounts(bus.id,bus.rute_id,bus.kapasitas_total);return {id:bus.id,nama_armada:bus.nama_armada,plat_nomor:bus.plat_nomor,nama_supir:bus.nama_supir,kontak_supir:bus.kontak_supir,kapasitas_total:bus.kapasitas_total,terisi:counts.terisi,sisa_kursi:counts.sisa_kursi,rute_id:bus.rute_id,rute_asal:bus.rute.asal,rute_tujuan:bus.rute.tujuan,waktu_berangkat:safeIso(bus.rute?.waktu_berangkat),total_penumpang:rows.length,jumlah_dewasa:rows.filter(p=>p.kategori_penumpang==='DEWASA').length,jumlah_anak:rows.filter(p=>p.kategori_penumpang==='ANAK-ANAK').length,jumlah_bayi:rows.filter(p=>p.kategori_penumpang==='BAYI').length,penumpang:rows.map(manifestPassenger)};};
const setting=()=>prisma.portalSetting.upsert({where:{id:1},create:{},update:{}}); app.get('/health',(_,r)=>r.json({ok:true}));
app.post('/api/auth/register',async(req,res,next)=>{try{const s=await setting();if(!s.portal_register_open)return res.status(403).json({error:s.pesan_register_tutup});const b=z.object({nama_lengkap:z.string().min(2),email:z.string().email(),password:z.string().min(8),nik:z.string().regex(/^\d{16}$/),no_hp:z.string().optional(),jenis_kelamin:z.string().optional()}).parse(req.body);const u=await prisma.user.create({data:{...b,password:await bcrypt.hash(b.password,12)}});res.status(201).json({token:token(u),userId:u.id,id_user:u.id,nama:u.nama_lengkap,role:u.role})}catch(e:any){if(e.code==='P2002')return res.status(409).json({error:String(e.meta?.target||'email atau nik').toLowerCase()+' sudah terdaftar'});next(e)}});
app.post('/api/auth/login',async(req,res,next)=>{try{const s=await setting();if(!s.portal_login_open)return res.status(403).json({error:s.pesan_login_tutup});const u=await prisma.user.findUnique({where:{email:String(req.body.email)}});if(!u||!(await bcrypt.compare(String(req.body.password),u.password)))return res.status(401).json({error:'Email atau password salah.'});if(u.status_akun!=='AKTIF')return res.status(403).json({error:'Akun belum aktif atau telah dinonaktifkan.'});res.json({token:token(u),userId:u.id,id_user:u.id,nama:u.nama_lengkap,role:u.role})}catch(e){next(e)}});
app.post('/api/auth/request-reset-password',async(req,res,next)=>{try{const u=await prisma.user.findUnique({where:{email:String(req.body.email)}});if(!u)return res.status(404).json({error:'Email tidak ditemukan.'});await prisma.user.update({where:{id:u.id},data:{reset_token:crypto.randomUUID(),reset_token_exp:new Date(Date.now()+3*60*60*1000)}});res.json({message:'Link reset dikirim ke email Anda.'})}catch(e){next(e)}});
app.get('/api/user/profile',auth,async(req,res,next)=>{try{const u=await prisma.user.findUnique({where:{id:(req as any).user.id},select:{id:true,nama_lengkap:true,email:true,nik:true,no_hp:true,jenis_kelamin:true,role:true,status_akun:true}});res.json(u)}catch(e){next(e)}});
function routeOut(x:any){const raw=x?.waktu_berangkat; const dateValue=raw instanceof Date?raw:(raw?new Date(raw):null); const d=dateValue&&!Number.isNaN(dateValue.getTime())?dateValue.toISOString():''; const date=d.slice(0,10); const time=d.slice(11,16); const [year,month,day]=date.split('-').map(Number); const [hour,minute]=time.split(':').map(Number); return {...x,tanggal_raw:[year,month,day,hour,minute],rute_id:x.id,tanggal_keberangkatan:d,tanggalKeberangkatan:d,tanggal_berangkat:date,jam_berangkat:time,kuota_tersisa:Math.max(0,x.kuota_total-(x.kuota_terisi||0)),sisa_kuota:Math.max(0,x.kuota_total-(x.kuota_terisi||0))}}
const dateTimePattern=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const parseRouteDateTime=(value:string)=>{
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),hour=Number(match[4]),minute=Number(match[5]),second=Number(match[6]||0);
  const fraction=(match[7]||'').padEnd(3,'0');
  const millisecond=Number(fraction||0);
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1||year>9999||month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59)return null;
  const zone=match[8]||'';
  if(zone&&zone!=='Z'&&(Number(zone.slice(1,3))>23||Number(zone.slice(4,6))>59))return null;
  const base=`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${String(second).padStart(2,'0')}.${String(millisecond).padStart(3,'0')}`;
  // datetime-local dari form admin tidak memiliki offset. Perlakukan sebagai
  // wall-clock UTC agar jam yang dipilih tetap sama di semua timezone proses;
  // offset eksplisit tetap dihormati bila caller mengirimkannya.
  const date=new Date(`${base}${zone||'Z'}`);
  return Number.isNaN(date.getTime())?null:date;
};
const routeSchema=z.object({
  asal:z.string().trim().min(2,'Kota asal wajib diisi.').max(100),
  tujuan:z.string().trim().min(2,'Kota tujuan wajib diisi.').max(150),
  kuota_total:z.coerce.number().int().min(1,'Kuota minimal 1.').max(10000),
  tanggal_keberangkatan:z.string().regex(dateTimePattern,'Tanggal dan jam keberangkatan wajib diisi lengkap.').refine(v=>parseRouteDateTime(v)!==null,'Tanggal atau waktu tidak valid.')
});
const routeData=(body:any)=>{const b=routeSchema.parse(body);const waktu_berangkat=parseRouteDateTime(b.tanggal_keberangkatan);if(!waktu_berangkat)throw new z.ZodError([{code:'custom',path:['tanggal_keberangkatan'],message:'Tanggal atau waktu tidak valid.'}]);return {asal:b.asal,tujuan:b.tujuan,kuota_total:b.kuota_total,waktu_berangkat}};
app.get('/api/rute',async(_,res,next)=>{try{const xs=await prisma.rute.findMany({orderBy:{waktu_berangkat:'asc'}});res.json(await Promise.all(xs.map(routeSummary)))}catch(e){next(e)}});
app.get('/api/rute/admin',auth,admin,async(_,res,next)=>{try{const xs=await prisma.rute.findMany({include:{terminal:true,kendaraan:true},orderBy:{waktu_berangkat:'asc'}});res.json(await Promise.all(xs.map(routeSummary)))}catch(e){next(e)}});
app.post('/api/rute',auth,admin,async(req,res,next)=>{try{const out=await prisma.rute.create({data:routeData(req.body)});res.status(201).json(routeOut(out))}catch(e){next(e)}});
app.put('/api/rute/:id',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID rute tidak valid.'});const current=await prisma.rute.findUnique({where:{id},select:{kuota_terisi:true}});if(!current)return res.status(404).json({error:'Rute tidak ditemukan.'});const data=routeData(req.body);const changed=await prisma.rute.updateMany({where:{id,kuota_terisi:{lte:data.kuota_total}},data});if(!changed.count){const latest=await prisma.rute.findUnique({where:{id},select:{kuota_terisi:true}});if(!latest)return res.status(404).json({error:'Rute tidak ditemukan.'});return res.status(409).json({error:`Kuota minimal ${latest.kuota_terisi} karena sudah ada peserta terisi.`})}const out=await prisma.rute.findUnique({where:{id}});if(!out)return res.status(404).json({error:'Rute tidak ditemukan.'});res.json(routeOut(out))}catch(e){next(e)}});
app.put('/api/rute/:id/portal',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);const b=z.object({is_portal_open:z.boolean()}).parse(req.body);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID rute tidak valid.'});if(!(await prisma.rute.findUnique({where:{id}})))return res.status(404).json({error:'Rute tidak ditemukan.'});res.json(routeOut(await prisma.rute.update({where:{id},data:b})))}catch(e){next(e)}});
app.delete('/api/rute/:id',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID rute tidak valid.'});if(!(await prisma.rute.findUnique({where:{id}})))return res.status(404).json({error:'Rute tidak ditemukan.'});const [pendaftar,kendaraan]=await Promise.all([prisma.pendaftaran.count({where:{rute_id:id}}),prisma.kendaraan.count({where:{rute_id:id}})]);if(pendaftar||kendaraan)return res.status(409).json({error:'Rute masih memiliki pendaftar atau kendaraan dan tidak dapat dihapus.'});await prisma.rute.delete({where:{id}});res.json({success:true})}catch(e){next(e)}});
app.get('/api/terminal',async(_,res,next)=>{try{res.json(await prisma.terminal.findMany())}catch(e){next(e)}}); app.get('/api/terminal/:id',auth,async(req,res,next)=>{try{res.json(await prisma.terminal.findUnique({where:{id:+req.params.id}}))}catch(e){next(e)}});
app.get('/api/portal/status',async(_,res,next)=>{try{const s=await setting();const {id,...out}=s;res.json(out)}catch(e){next(e)}});
const toggles:any={register:['portal_register_open','pesan_register_tutup'],login:['portal_login_open','pesan_login_tutup'],mudik:['portal_mudik_open','pesan_mudik_tutup'],tiket:['portal_tiket_open','pesan_tiket_tutup'],sesi:['sesi_aktif','pesan_sesi_berakhir'],ulasan:['ulasan_open',null]}; for(const [name,[flag,msg]] of Object.entries(toggles) as [string, any][])app.put('/api/portal/'+name,auth,admin,async(req,res,next)=>{try{const d:any={[flag]:Boolean(req.body.open),updated_by:req.body.admin||String((req as any).user.email)};if(msg&&req.body.pesan)d[msg]=req.body.pesan;res.json(await prisma.portalSetting.upsert({where:{id:1},create:d,update:d}))}catch(e){next(e)}});
app.put('/api/portal/semua',auth,admin,async(req,res,next)=>{try{const b=z.object({sesi_aktif:z.boolean().optional(),portal_register_open:z.boolean().optional(),portal_login_open:z.boolean().optional(),portal_mudik_open:z.boolean().optional(),portal_tiket_open:z.boolean().optional(),ulasan_open:z.boolean().optional(),pesan_sesi_berakhir:z.string().max(500).optional(),pesan_register_tutup:z.string().max(500).optional(),pesan_login_tutup:z.string().max(500).optional(),pesan_mudik_tutup:z.string().max(500).optional(),pesan_tiket_tutup:z.string().max(500).optional(),pesan_home:z.string().max(1000).optional(),pesan_dashboard:z.string().max(1000).optional(),countdown_aktif:z.boolean().optional(),countdown_target:z.string().nullable().optional(),countdown_label:z.string().max(200).optional()}).parse(req.body);const data:any={...b,updated_by:String((req as any).user.email)};res.json(await prisma.portalSetting.upsert({where:{id:1},create:data,update:data}))}catch(e){next(e)}});
// Compatibility and frontend vertical-slice endpoints
const own=async(req:Request,res:Response,id:number)=>{const u=(req as any).user; const p=await prisma.pendaftaran.findUnique({where:{id}}); if(!p)return res.status(404).json({error:'Data tidak ditemukan.'}) as any; if(u.role!=='ADMIN'&&p.user_id!==u.id)return res.status(403).json({error:'Tidak berwenang.'}) as any; return p as any};
app.post('/api/auth/reset-password',async(req,res,next)=>{try{const {token,password}=req.body;const u=await prisma.user.findFirst({where:{reset_token:String(token),reset_token_exp:{gt:new Date()}}});if(!u)return res.status(400).json({error:'Token reset tidak valid.'});await prisma.user.update({where:{id:u.id},data:{password:await bcrypt.hash(String(password),12),reset_token:null,reset_token_exp:null}});res.json({message:'Password berhasil diubah.'})}catch(e){next(e)}});
const registrationOut=(p:any)=>{const departure=p.rute?.waktu_berangkat instanceof Date?p.rute.waktu_berangkat.toISOString():(p.tgl_berangkat||null);return {...p,pendaftaran_id:p.id,status_pendaftaran:p.status,kategori:p.kategori_penumpang,tujuan:p.rute?.tujuan||p.rute_tujuan||'',tanggal_keberangkatan:departure,nama_bus:p.kendaraan?.nama_armada||null,plat_nomor:p.kendaraan?.plat_nomor||null,rute:p.rute?routeOut(p.rute):null,kendaraan:p.kendaraan||null}};
const vehicleOut=(k:any)=>({...k,rute_tujuan:k.rute?.tujuan||'',rute_asal:k.rute?.asal||'',waktu_berangkat:k.rute?.waktu_berangkat?(k.rute.waktu_berangkat instanceof Date?k.rute.waktu_berangkat.toISOString():String(k.rute.waktu_berangkat)):''});
app.get('/api/pendaftaran',auth,async(req,res,next)=>{try{const rows=await prisma.pendaftaran.findMany({where:(req as any).user.role==='ADMIN'?{}:{user_id:(req as any).user.id},include:{rute:true,kendaraan:true}});res.json(rows.map(registrationOut))}catch(e){next(e)}});
const historyHandler=async(req:Request,res:Response,next:NextFunction)=>{try{const userId=Number((req as any).user.id);const confirmationUuid=String(req.query.konfirmasi_uuid||'').trim();let where:any={user_id:userId};if(confirmationUuid){const seed=await prisma.pendaftaran.findUnique({where:{konfirmasi_uuid:confirmationUuid},select:{id:true,id_keluarga:true,user_id:true}});if(!seed)return res.status(404).json({error:'Link konfirmasi tidak ditemukan.'});if(seed.user_id!==userId)return res.status(403).json({error:'Link konfirmasi bukan milik akun ini.'});const familyRoot=seed.id_keluarga||seed.id;where={user_id:userId,OR:[{id:familyRoot},{id_keluarga:familyRoot}]}}const rows=await prisma.pendaftaran.findMany({where,orderBy:{created_at:'desc'},include:{rute:true,kendaraan:true}});res.json(rows.map(registrationOut))}catch(e){next(e)}}; app.get('/api/riwayat',auth,historyHandler); app.get('/api/pendaftaran/riwayat',auth,historyHandler);
const formValues=(value:any):string[]=>value===undefined?[]:(Array.isArray(value)?value:[value]).map(v=>String(v));
const validDateOnly=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T00:00:00.000Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value};
const passengerSchema=z.object({
  nama_peserta:z.string().trim().min(2,'Nama peserta wajib diisi.').max(150),
  nik_peserta:z.string().regex(/^\d{16}$/,'NIK peserta harus 16 digit.'),
  jenis_kelamin:z.enum(['LAKI-LAKI','PEREMPUAN']),
  tanggal_lahir:z.string().refine(validDateOnly,'Tanggal lahir tidak valid.'),
  jenis_identitas:z.enum(['KTP','KIA','KK']),
  alamat_rumah:z.string().trim().min(5,'Alamat rumah wajib diisi.').max(500),
  no_hp_peserta:z.string().trim().max(30).default('-')
});
const passengerCategory=(birthDate:string)=>{const birth=new Date(`${birthDate}T00:00:00.000Z`);const now=new Date();let age=now.getUTCFullYear()-birth.getUTCFullYear();if(now.getUTCMonth()<birth.getUTCMonth()||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate()))age--;if(age<0)throw new z.ZodError([{code:'custom',path:['tanggal_lahir'],message:'Tanggal lahir tidak boleh di masa depan.'}]);return age<2?'BAYI':age<17?'ANAK-ANAK':'DEWASA'};
const uploadExtension=(mime:string)=>({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf'} as Record<string,string>)[mime];
app.post('/api/pendaftaran',auth,upload.any(),async(req,res,next)=>{const savedFiles:string[]=[];try{
  const userId=Number((req as any).user.id);const portal=await setting();
  if(!portal.sesi_aktif)return res.status(403).json({error:portal.pesan_sesi_berakhir});
  if(!portal.portal_mudik_open)return res.status(403).json({error:portal.pesan_mudik_tutup});
  const routeId=Number(req.query.rute_id||req.body.rute_id);
  if(!Number.isInteger(routeId)||routeId<1)return res.status(400).json({error:'Rute keberangkatan wajib dipilih.'});
  const route=await prisma.rute.findUnique({where:{id:routeId}});
  if(!route)return res.status(404).json({error:'Rute tidak ditemukan.'});
  if(!route.is_portal_open)return res.status(403).json({error:'Pendaftaran untuk rute ini sedang ditutup.'});
  const names=formValues(req.body.nama_peserta);if(names.length===0)return res.status(400).json({error:'Minimal satu penumpang wajib diisi.'});
  const fields=['nik_peserta','jenis_kelamin','tanggal_lahir','jenis_identitas','alamat_rumah','no_hp_peserta'] as const;
  const arrays=Object.fromEntries(fields.map(key=>[key,formValues(req.body[key])])) as Record<typeof fields[number],string[]>;
  for(const key of fields){if(arrays[key].length!==names.length)return res.status(400).json({error:`Data ${key} setiap penumpang wajib diisi lengkap.`});}
  const passengers=names.map((name,index)=>{const parsed=passengerSchema.parse({nama_peserta:name,...Object.fromEntries(fields.map(key=>[key,arrays[key][index]]))});return {...parsed,tanggal_lahir:new Date(`${parsed.tanggal_lahir}T00:00:00.000Z`),kategori_penumpang:passengerCategory(parsed.tanggal_lahir)}});
  const submittedNiks=passengers.map(p=>p.nik_peserta);if(new Set(submittedNiks).size!==submittedNiks.length)return res.status(409).json({error:'NIK penumpang tidak boleh duplikat.'});
  const existing=await prisma.pendaftaran.findMany({where:{user_id:userId,status:{notIn:['DITOLAK','DIBATALKAN']}},orderBy:{id:'asc'}});
  if(route.kuota_terisi + route.kuota_menunggu + passengers.length > route.kuota_total)return res.status(409).json({error:'Kuota rute tidak mencukupi untuk jumlah penumpang.'});
  if(existing.length+passengers.length>6)return res.status(409).json({error:`Maksimal 6 penumpang per akun. Sisa kuota keluarga: ${Math.max(0,6-existing.length)}.`});
  if(existing.some(p=>p.rute_id!==routeId))return res.status(409).json({error:'Seluruh anggota keluarga wajib menggunakan rute yang sama.'});
  if(await prisma.pendaftaran.findFirst({where:{nik_peserta:{in:submittedNiks},status:{notIn:['DITOLAK','DIBATALKAN']}}}))return res.status(409).json({error:'Salah satu NIK sudah terdaftar aktif.'});
  const existingHead=existing.find(p=>p.is_kepala_keluarga)||existing.find(p=>p.id_keluarga===null);
  const firstAdultIndex=passengers.findIndex(p=>p.kategori_penumpang==='DEWASA');
  if(!existingHead&&firstAdultIndex<0)return res.status(400).json({error:'Pendaftaran pertama wajib memiliki minimal satu penumpang dewasa.'});
  const files=((req as any).files||[]) as Express.Multer.File[];const indexedFiles=new Map<number,Express.Multer.File>();const legacyFiles:Express.Multer.File[]=[];
  for(const file of files){const match=/^(?:fotoBukti|foto_bukti)_(\d+)$/.exec(file.fieldname);if(match)indexedFiles.set(Number(match[1]),file);else if(file.fieldname==='fotoBukti'||file.fieldname==='foto_bukti')legacyFiles.push(file);}
  let legacyIndex=0;const photos:(string|null)[]=passengers.map((_,index)=>{const file=indexedFiles.get(index)||legacyFiles[legacyIndex++];if(!file)return null;const ext=uploadExtension(file.mimetype);if(!ext)throw new z.ZodError([{code:'custom',path:['foto_bukti',index],message:'Foto identitas harus JPG, PNG, WEBP, atau PDF.'}]);const filename=`${crypto.randomUUID()}${ext}`;fs.writeFileSync(path.join(uploadsDir,filename),file.buffer);savedFiles.push(filename);return `/api/uploads/${filename}`;});
  const requestedHeadIndex=existingHead?null:firstAdultIndex;const headName=existingHead?.nama_kepala_keluarga||passengers[firstAdultIndex].nama_peserta;const targetPhone=existingHead?.no_hp_target||passengers.find(p=>p.no_hp_peserta&&p.no_hp_peserta!=='-')?.no_hp_peserta||'-';
  const created=await prisma.$transaction(async tx=>{const out:any[]=[];let familyHead=existingHead||null;const createPassenger=async(index:number,isHead:boolean)=>{const p=passengers[index];let row=await tx.pendaftaran.create({data:{user_id:userId,id_keluarga:isHead?null:familyHead!.id,rute_id:routeId,nama_kepala_keluarga:headName,nama_peserta:p.nama_peserta,nik_peserta:p.nik_peserta,jenis_kelamin:p.jenis_kelamin,tanggal_lahir:p.tanggal_lahir,kategori_penumpang:p.kategori_penumpang,jenis_identitas:p.jenis_identitas,alamat_rumah:p.alamat_rumah,no_hp_peserta:p.no_hp_peserta,no_hp_target:targetPhone,foto_bukti:photos[index],is_kepala_keluarga:isHead,konfirmasi_uuid:crypto.randomUUID(),rute_tujuan:route.tujuan,tgl_berangkat:route.waktu_berangkat.toISOString()}});row=await tx.pendaftaran.update({where:{id:row.id},data:{kode_booking:`MDK-${row.id}`}});if(isHead)familyHead=row;out.push(row);};
    if(requestedHeadIndex!==null)await createPassenger(requestedHeadIndex,true);for(let index=0;index<passengers.length;index++){if(index!==requestedHeadIndex)await createPassenger(index,false);}await tx.rute.update({where:{id:routeId},data:{kuota_menunggu:{increment:passengers.length}}});return out;});
  const responseHead=(requestedHeadIndex===null?existingHead:created.find(p=>p.is_kepala_keluarga))||created[0];res.status(201).json({message:'Pendaftaran berhasil',pesan:'Pendaftaran berhasil',data:{pendaftaran_id:responseHead.id,kode_booking:responseHead.kode_booking},link_wa_admin:'#'});
}catch(e){for(const filename of savedFiles){try{fs.rmSync(path.join(uploadsDir,filename),{force:true})}catch{}}next(e)}});
for(const method of ['post','put'] as const) (app as any)[method]('/api/pendaftaran/:id/koreksi',auth,async(req:Request,res:Response,next:NextFunction)=>{try{const p=await own(req,res,+req.params.id);if(!p)return;const out=await prisma.pendaftaran.update({where:{id:p.id},data:{...req.body,status:'MENUNGGU VERIFIKASI'}});res.json(out)}catch(e){next(e)}});
app.post('/api/pendaftaran/:id/konfirmasi',auth,async(req,res,next)=>{try{const p=await own(req,res,+req.params.id);if(!p)return;if(!APPROVED_STATUSES.includes(p.status as typeof APPROVED_STATUSES[number])||!p.link_konfirmasi_dikirim)return res.status(403).json({error:'Pendaftar belum memenuhi syarat konfirmasi.'});res.json(await prisma.pendaftaran.update({where:{id:p.id},data:{konfirmasi_hadir:true,status:'TERKONFIRMASI'}}))}catch(e){next(e)}});
app.put('/api/pendaftaran/konfirmasi-kehadiran/:id',auth,async(req,res,next)=>{
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId < 1) return res.status(400).json({error:'ID akun/pendaftaran tidak valid.'});
    const userId = Number((req as any).user.id);
    const requestedIds = Array.isArray(req.body?.ids_konfirmasi) ? req.body.ids_konfirmasi.map(Number).filter(Number.isInteger) : [];
    const target = await prisma.pendaftaran.findFirst({where:{id:targetId,user_id:userId},select:{id:true,id_keluarga:true}});
    const familyRoot = target ? (target.id_keluarga || target.id) : targetId;
    const family = await prisma.pendaftaran.findMany({where:{user_id:userId,OR:[{id:familyRoot},{id_keluarga:familyRoot}],...approvedStatusWhere,link_konfirmasi_dikirim:true},select:{id:true,status:true}});
    if (!family.length) return res.status(404).json({error:'Data pendaftaran tidak ditemukan atau bukan milik akun ini.'});
    const familyIds = family.map(p=>p.id);
    const confirmedIds = requestedIds.filter((id: number)=>familyIds.includes(id));
    const cancelledIds = familyIds.filter(id=>!confirmedIds.includes(id));
    const updates:any[] = [];
    if (confirmedIds.length) updates.push(prisma.pendaftaran.updateMany({where:{id:{in:confirmedIds}},data:{status:'TERKONFIRMASI',konfirmasi_hadir:true}}));
    if (cancelledIds.length) updates.push(prisma.pendaftaran.updateMany({where:{id:{in:cancelledIds}},data:{status:'DIBATALKAN',konfirmasi_hadir:false,kendaraan_id:null}}));
    if (updates.length) await prisma.$transaction(updates);
    res.json({success:true,message:`Konfirmasi tersimpan: ${confirmedIds.length} hadir, ${cancelledIds.length} dibatalkan.`,confirmed:confirmedIds.length,cancelled:cancelledIds.length});
  } catch(e) { next(e); }
});
app.put('/api/pendaftaran/konfirmasi-kehadiran',auth,async(req,res,next)=>{
  try {
    const ids = Array.isArray(req.body?.ids_konfirmasi) ? req.body.ids_konfirmasi.map(Number).filter(Number.isInteger) : [];
    if (!ids.length) return res.status(400).json({error:'Pilih minimal satu peserta.'});
    const userId = Number((req as any).user.id);
    const rows = await prisma.pendaftaran.findMany({where:{id:{in:ids},user_id:userId},select:{id:true,status:true}});
        if (rows.length !== ids.length) return res.status(403).json({error:'Ada peserta yang bukan milik akun ini.'});
        if (rows.some(row => !APPROVED_STATUSES.includes(row.status as typeof APPROVED_STATUSES[number]))) return res.status(403).json({error:'Hanya pendaftar yang sudah diterima yang dapat melakukan konfirmasi.'});
        const result = await prisma.pendaftaran.updateMany({where:{id:{in:ids}},data:{status:'TERKONFIRMASI',konfirmasi_hadir:true}});
    res.json({success:true,message:`${result.count} peserta berhasil dikonfirmasi hadir.`,confirmed:result.count});
  } catch(e) { next(e); }
});
app.get('/api/tiket/:id',auth,async(req,res,next)=>{try{const portal=await setting();if(!portal.portal_tiket_open)return res.status(403).json({error:portal.pesan_tiket_tutup});const p=await own(req,res,+req.params.id);if(!p)return;if(!['DISETUJUI','TERKONFIRMASI'].includes(p.status)||p.status==='DITOLAK'||p.status==='DIBATALKAN')return res.status(403).json({error:'Tiket hanya tersedia untuk pendaftar yang telah diverifikasi.'});res.type('application/pdf').send(Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'))}catch(e){next(e)}});
app.get('/api/tiket/download/:id',auth,async(req,res,next)=>{try{const portal=await setting();if(!portal.portal_tiket_open)return res.status(403).json({error:portal.pesan_tiket_tutup});const p=await own(req,res,+req.params.id);if(!p)return;if(!['DISETUJUI','TERKONFIRMASI','DITERIMA H-3'].includes(p.status)||p.status==='DITOLAK'||p.status==='DIBATALKAN')return res.status(403).json({error:'Tiket hanya tersedia untuk pendaftar yang telah diverifikasi.'});res.type('application/pdf').send(Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'))}catch(e){next(e)}});
app.get('/api/admin/pendaftar',auth,admin,async(req,res,next)=>{try{const routeId=Number(req.query.rute_id);const where=Number.isInteger(routeId)&&routeId>0?{rute_id:routeId}:{};const rows=await prisma.pendaftaran.findMany({where,include:{rute:true,kendaraan:true},orderBy:{created_at:'desc'}});res.json(rows.map(registrationOut))}catch(e){next(e)}});
app.get('/api/admin/pendaftar/paginated',auth,admin,async(req,res,next)=>{try{
  const rawPage=Number(req.query.page||1),rawLimit=Number(req.query.limit||20);const page=Number.isInteger(rawPage)&&rawPage>0?rawPage:1;const limit=Number.isInteger(rawLimit)?Math.min(100,Math.max(1,rawLimit)):20;
  const where:any={};const routeId=Number(req.query.rute_id);if(Number.isInteger(routeId)&&routeId>0)where.rute_id=routeId;if(req.query.status)where.status=String(req.query.status);if(req.query.rute)where.rute={tujuan:{contains:String(req.query.rute),mode:'insensitive'}};
  const search=String(req.query.search||'').trim();if(search)where.OR=[{nama_peserta:{contains:search,mode:'insensitive'}},{nik_peserta:{contains:search}},{nama_kepala_keluarga:{contains:search,mode:'insensitive'}},{kode_booking:{contains:search,mode:'insensitive'}},{rute_tujuan:{contains:search,mode:'insensitive'}}];
  const matched=await prisma.pendaftaran.findMany({where,select:{id:true,id_keluarga:true,created_at:true},orderBy:{created_at:req.query.sort==='ASC'?'asc':'desc'}});const familyIds=[...new Set(matched.map(row=>row.id_keluarga||row.id))];const totalKeluarga=familyIds.length,totalPages=Math.max(1,Math.ceil(totalKeluarga/limit));const currentPage=Math.min(page,totalPages);const selectedIds=familyIds.slice((currentPage-1)*limit,currentPage*limit);
  const rows=selectedIds.length?await prisma.pendaftaran.findMany({where:{OR:[{id:{in:selectedIds}},{id_keluarga:{in:selectedIds}}]},include:{rute:true,kendaraan:true},orderBy:{created_at:'asc'}}):[];const familyOrder=new Map(selectedIds.map((id,index)=>[id,index]));rows.sort((a,b)=>(familyOrder.get(a.id_keluarga||a.id)??0)-(familyOrder.get(b.id_keluarga||b.id)??0));const data=rows.map(registrationOut);res.json({data,pendaftar:data,totalKeluarga,totalPages,currentPage,limit});
}catch(e){next(e)}});
app.put('/api/admin/pendaftar/:id',auth,admin,async(req,res,next)=>{try{res.json(await prisma.pendaftaran.update({where:{id:+req.params.id},data:req.body}))}catch(e){next(e)}});
app.put('/api/admin/verifikasi-custom/:familyId',auth,admin,async(req,res,next)=>{
  try{
    let familyId = Number(req.params.familyId);
    if((!Number.isInteger(familyId) || familyId < 1) && req.body.family_id) familyId = Number(req.body.family_id);
    if((!Number.isInteger(familyId) || familyId < 1) && req.body.id_keluarga) familyId = Number(req.body.id_keluarga);
    if((!Number.isInteger(familyId) || familyId < 1) && Array.isArray(req.body.passenger_ids) && req.body.passenger_ids.length > 0) {
      const anyP = await prisma.pendaftaran.findFirst({ where: { id: { in: req.body.passenger_ids.map(Number) } }, select: { id: true, id_keluarga: true } });
      if(anyP) familyId = anyP.id_keluarga || anyP.id;
    }
    const rejectedIds: number[] = Array.isArray(req.body.rejected_ids) ? req.body.rejected_ids.map(Number).filter(Number.isInteger) : [];
    const alasan = String(req.body.alasan || '').trim();
    if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
    if(rejectedIds.length > 0 && !alasan) return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });

    const family = await prisma.pendaftaran.findMany({ where: { OR: [{ id: familyId }, { id_keluarga: familyId }] }, select: { id: true, status: true } });
    if(!family.length) return res.status(404).json({ error: 'Data keluarga tidak ditemukan.' });

    const ids: number[] = family.map((p: any) => p.id);
    const rejected = new Set<number>(rejectedIds.filter((id: number) => ids.includes(id)));
    const acceptedIds: number[] = ids.filter((id: number) => !rejected.has(id));

    const updates: any[] = [];
    if(acceptedIds.length) {
      updates.push(prisma.pendaftaran.updateMany({
        where: { id: { in: acceptedIds }, status: { notIn: ['DITOLAK', 'DIBATALKAN'] } },
        data: { status: 'DITERIMA H-3' }
      }));
    }
    if(rejected.size) {
      updates.push(prisma.pendaftaran.updateMany({
        where: { id: { in: [...rejected] } },
        data: { status: 'DITOLAK', alasan_tolak: alasan }
      }));
    }
    await prisma.$transaction(updates);
    res.json({ success: true, accepted: acceptedIds.length, rejected: rejected.size, pesan: 'Verifikasi berhasil disimpan.' });
  }catch(e){next(e)}
});
app.put('/api/admin/verifikasi-keluarga/:familyId',auth,admin,async(req,res,next)=>{
  try{
    let familyId = Number(req.params.familyId);
    if((!Number.isInteger(familyId) || familyId < 1) && req.body.id_keluarga) familyId = Number(req.body.id_keluarga);
    if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
    const status = String(req.body.status || 'DITERIMA H-3');
    const alasan = req.body.alasan_tolak ? String(req.body.alasan_tolak) : null;
    const data: any = { status };
    if(alasan) data.alasan_tolak = alasan;
    const result = await prisma.pendaftaran.updateMany({
      where: { OR: [{ id: familyId }, { id_keluarga: familyId }], status: { notIn: ['DITOLAK', 'DIBATALKAN'] } },
      data
    });
    res.json({ success: true, count: result.count, pesan: 'Status keluarga berhasil diperbarui.' });
  }catch(e){next(e)}
});
app.put('/api/admin/verifikasi/:id',auth,admin,async(req,res,next)=>{
  try{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID pendaftar tidak valid.' });
    const status = String(req.body.status || 'DITERIMA H-3');
    const updated = await prisma.pendaftaran.update({
      where: { id },
      data: { status, ...(req.body.alasan_tolak ? { alasan_tolak: String(req.body.alasan_tolak) } : {}) }
    });
    res.json({ success: true, data: registrationOut(updated), pesan: 'Status berhasil diperbarui.' });
  }catch(e){next(e)}
});
app.put('/api/admin/batalkan-peserta/:id',auth,admin,async(req,res,next)=>{
  try{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID pendaftar tidak valid.' });
    const existing = await prisma.pendaftaran.findUnique({ where: { id }, select: { id: true, rute_id: true, status: true } });
    if(!existing) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    await prisma.pendaftaran.update({ where: { id }, data: { status: 'DIBATALKAN', kendaraan_id: null } });
    if(existing.status === 'DISETUJUI' || existing.status === 'TERKONFIRMASI' || existing.status === 'DITERIMA H-3') {
      await prisma.rute.update({ where: { id: existing.rute_id }, data: { kuota_terisi: { decrement: 1 } } }).catch(()=>{});
    } else if(existing.status === 'MENUNGGU VERIFIKASI') {
      await prisma.rute.update({ where: { id: existing.rute_id }, data: { kuota_menunggu: { decrement: 1 } } }).catch(()=>{});
    }
    res.json({ success: true, pesan: 'Peserta berhasil dibatalkan.' });
  }catch(e){next(e)}
});
for(const method of ['post','put'] as const) {
  (app as any)[method]('/api/admin/batalkan-plotting/:familyId',auth,admin,async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const familyId = Number(req.params.familyId);
      if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
      await prisma.pendaftaran.updateMany({
        where: { OR: [{ id: familyId }, { id_keluarga: familyId }] },
        data: { kendaraan_id: null }
      });
      res.json({ success: true, pesan: 'Plotting bus berhasil dibatalkan.' });
    }catch(e){next(e)}
  });
  (app as any)[method]('/api/admin/konfirmasi-manual/:familyId',auth,admin,async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const familyId = Number(req.params.familyId);
      if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
      const ids: number[] = Array.isArray(req.body.ids_konfirmasi) ? req.body.ids_konfirmasi.map(Number).filter(Number.isInteger) : [];
      const where: any = ids.length > 0 ? { id: { in: ids } } : { OR: [{ id: familyId }, { id_keluarga: familyId }] };
      const updated = await prisma.pendaftaran.updateMany({
        where: { ...where, status: { notIn: ['DITOLAK', 'DIBATALKAN'] } },
        data: { status: 'TERKONFIRMASI', konfirmasi_hadir: true }
      });
      res.json({ success: true, count: updated.count, pesan: `${updated.count} peserta berhasil dikonfirmasi hadir.` });
    }catch(e){next(e)}
  });
  (app as any)[method]('/api/admin/terima-darurat/:familyId',auth,admin,async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const familyId = Number(req.params.familyId);
      if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
      const updated = await prisma.pendaftaran.updateMany({
        where: { OR: [{ id: familyId }, { id_keluarga: familyId }], status: { notIn: ['DITOLAK', 'DIBATALKAN'] } },
        data: { status: 'DITERIMA H-3' }
      });
      res.json({ success: true, count: updated.count, pesan: `${updated.count} anggota keluarga berhasil diterima.` });
    }catch(e){next(e)}
  });
}
app.delete('/api/admin/hapus-pendaftaran/keluarga/:familyId',auth,admin,async(req,res,next)=>{
  try{
    const familyId = Number(req.params.familyId);
    if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
    const deleted = await prisma.pendaftaran.deleteMany({
      where: { OR: [{ id: familyId }, { id_keluarga: familyId }], status: 'DIBATALKAN' }
    });
    res.json({ success: true, count: deleted.count, pesan: `${deleted.count} data pendaftaran berhasil dihapus permanen.` });
  }catch(e){next(e)}
});
app.delete('/api/admin/hapus-pendaftaran/:id',auth,admin,async(req,res,next)=>{
  try{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID peserta tidak valid.' });
    await prisma.pendaftaran.delete({ where: { id } });
    res.json({ success: true, pesan: 'Data peserta berhasil dihapus permanen.' });
  }catch(e){next(e)}
});
app.put('/api/admin/pindah-rute/:familyId',auth,admin,async(req,res,next)=>{
  try{
    const familyId = Number(req.params.familyId);
    const newRouteId = Number(req.body.rute_id);
    if(!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
    if(!Number.isInteger(newRouteId) || newRouteId < 1) return res.status(400).json({ error: 'ID rute baru tidak valid.' });
    const targetRoute = await prisma.rute.findUnique({ where: { id: newRouteId } });
    if(!targetRoute) return res.status(404).json({ error: 'Rute baru tidak ditemukan.' });
    const family = await prisma.pendaftaran.findMany({
      where: { OR: [{ id: familyId }, { id_keluarga: familyId }] },
      select: { id: true, rute_id: true, status: true }
    });
    if(!family.length) return res.status(404).json({ error: 'Data keluarga tidak ditemukan.' });
    const oldRouteId = family[0].rute_id;
    await prisma.pendaftaran.updateMany({
      where: { OR: [{ id: familyId }, { id_keluarga: familyId }] },
      data: {
        rute_id: newRouteId,
        kendaraan_id: null,
        rute_tujuan: targetRoute.tujuan,
        tgl_berangkat: targetRoute.waktu_berangkat instanceof Date ? targetRoute.waktu_berangkat.toISOString() : String(targetRoute.waktu_berangkat || '')
      }
    });
    if(oldRouteId !== newRouteId) {
      const activeCount = family.filter(p => !['DITOLAK', 'DIBATALKAN'].includes(p.status)).length;
      if(activeCount > 0) {
        await prisma.rute.update({ where: { id: oldRouteId }, data: { kuota_menunggu: { decrement: activeCount } } }).catch(()=>{});
        await prisma.rute.update({ where: { id: newRouteId }, data: { kuota_menunggu: { increment: activeCount } } }).catch(()=>{});
      }
    }
    res.json({ success: true, pesan: `Keluarga berhasil dipindahkan ke rute ${targetRoute.tujuan}.` });
  }catch(e){next(e)}
});
for(const method of ['post','get'] as const) {
  (app as any)[method]('/api/admin/notif-kuota-penuh/:id',auth,admin,async(req:Request,res:Response)=>res.json({success:true,pesan:'Notifikasi kuota penuh terkirim.'}));
}
app.post('/api/admin/assign-bus',auth,admin,async(req,res,next)=>{
  try{
    const familyId = Number(req.query.user_id || req.body.user_id || req.query.family_id || req.body.family_id);
    const busId = Number(req.query.kendaraan_id || req.body.kendaraan_id || req.query.bus_id || req.body.bus_id);
    if(!Number.isInteger(familyId) || familyId < 1 || !Number.isInteger(busId) || busId < 1) {
      return res.status(400).json({ error: 'ID keluarga dan bus wajib diisi.' });
    }
    const bus = await prisma.kendaraan.findUnique({
      where: { id: busId },
      select: { id: true, rute_id: true, kapasitas_total: true }
    });
    if(!bus) return res.status(404).json({ error: 'Bus tidak ditemukan.' });
    const family = await prisma.pendaftaran.findMany({
      where: { OR: [{ id: familyId }, { id_keluarga: familyId }] },
      select: { id: true, rute_id: true, status: true }
    });
    if(!family.length) return res.status(404).json({ error: 'Data keluarga tidak ditemukan.' });
    if(family.some(p => p.rute_id !== bus.rute_id)) return res.status(409).json({ error: 'Peserta dan bus harus berada pada rute yang sama.' });
    const eligible = family.filter(p => APPROVED_STATUSES.includes(p.status as typeof APPROVED_STATUSES[number]));
    if(eligible.length !== family.length) return res.status(409).json({ error: 'Hanya peserta yang sudah diterima yang dapat diplotting ke bus.' });
    const ids = eligible.map(p => p.id);
    const result = await prisma.$transaction(async tx => {
      const occupied = await tx.pendaftaran.count({
        where: { ...passengerCountWhere(bus.rute_id, bus.id), id: { notIn: ids } }
      });
      if(occupied + ids.length > bus.kapasitas_total) return { conflict: true, count: 0, occupied };
      const updated = await tx.pendaftaran.updateMany({ where: { id: { in: ids } }, data: { kendaraan_id: bus.id } });
      return { conflict: false, count: updated.count, occupied };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if(result.conflict) return res.status(409).json({ error: `Bus penuh. Sisa kursi ${Math.max(0, bus.kapasitas_total - result.occupied)}.` });
    res.json({ success: true, count: result.count, pesan: `Bus berhasil ditetapkan untuk ${result.count} penumpang.` });
  }catch(e){next(e)}
});
app.get('/api/admin/kendaraan',auth,admin,async(req,res,next)=>{
  try{
    const ruteId = Number(req.query.rute_id);
    const where = Number.isInteger(ruteId) && ruteId > 0 ? { rute_id: ruteId } : {};
    const rows = await prisma.kendaraan.findMany({ where, include: { rute: true } });
    res.json(await Promise.all(rows.map(vehicleSummary)));
  }catch(e){next(e)}
});
app.post('/api/admin/kendaraan',auth,admin,async(req,res,next)=>{
  try{
    const ruteId = Number(req.query.rute_id || req.body.rute_id);
    if(!Number.isInteger(ruteId) || ruteId < 1) return res.status(400).json({ error: 'Rute wajib dipilih.' });
    const b = z.object({
      nama_armada: z.string().trim().min(2),
      jenis_kendaraan: z.string().default('BUS BESAR'),
      plat_nomor: z.string().optional().default(''),
      kapasitas_total: z.coerce.number().int().positive().default(40),
      nama_supir: z.string().optional().default(''),
      kontak_supir: z.string().optional().default('')
    }).parse(req.body);
    const row = await prisma.kendaraan.create({
      data: {
        nama_armada: b.nama_armada,
        jenis_kendaraan: b.jenis_kendaraan,
        plat_nomor: b.plat_nomor,
        kapasitas_total: b.kapasitas_total,
        nama_supir: b.nama_supir,
        kontak_supir: b.kontak_supir,
        rute_id: ruteId
      },
      include: { rute: true }
    });
    res.status(201).json(vehicleOut(row));
  }catch(e){next(e)}
});
app.put('/api/admin/kendaraan/:id',auth,admin,async(req,res,next)=>{
  try{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID kendaraan tidak valid.' });
    const ruteId = Number(req.query.rute_id || req.body.rute_id);
    const b = z.object({
      nama_armada: z.string().trim().min(2).optional(),
      jenis_kendaraan: z.string().optional(),
      plat_nomor: z.string().optional(),
      kapasitas_total: z.coerce.number().int().positive().optional(),
      nama_supir: z.string().optional(),
      kontak_supir: z.string().optional()
    }).parse(req.body);
    const data: any = { ...b };
    if(Number.isInteger(ruteId) && ruteId > 0) data.rute_id = ruteId;
    const row = await prisma.kendaraan.update({ where: { id }, data, include: { rute: true } });
    res.json(vehicleOut(row));
  }catch(e){next(e)}
});
app.delete('/api/admin/kendaraan/:id',auth,admin,async(req,res,next)=>{
  try{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID kendaraan tidak valid.' });
    await prisma.pendaftaran.updateMany({ where: { kendaraan_id: id }, data: { kendaraan_id: null } });
    await prisma.kendaraan.delete({ where: { id } });
    res.json({ success: true, pesan: 'Kendaraan berhasil dihapus.' });
  }catch(e){next(e)}
});
app.post('/api/admin/tambah-penumpang',auth,admin,upload.any(),async(req,res,next)=>{try{const body=z.object({rute_id:z.coerce.number().int().positive(),user_id:z.coerce.number().int().positive(),nama_peserta:z.string().trim().min(2).max(150),nik_peserta:z.string().regex(/^\d{16}$/),jenis_kelamin:z.enum(['LAKI-LAKI','PEREMPUAN']).default('LAKI-LAKI'),tanggal_lahir:z.string().refine(validDateOnly,'Tanggal lahir tidak valid.'),alamat_rumah:z.string().trim().min(1).max(500),no_hp_peserta:z.string().max(30).optional().default('-'),jenis_identitas:z.enum(['KTP','KIA','KK']).default('KTP'),kendaraan_id:z.coerce.number().int().positive().optional()}).parse(req.body);const route=await prisma.rute.findUnique({where:{id:body.rute_id},select:{id:true,tujuan:true,waktu_berangkat:true,kuota_total:true}});if(!route)return res.status(404).json({error:'Rute tidak ditemukan.'});const user=await prisma.user.findUnique({where:{id:body.user_id},select:{id:true,nama_lengkap:true}});if(!user)return res.status(404).json({error:'Akun user tidak ditemukan.'});const category=passengerCategory(body.tanggal_lahir);const result=await prisma.$transaction(async tx=>{const counts=await tx.pendaftaran.count({where:{rute_id:route.id,...approvedStatusWhere}});if(counts+1>route.kuota_total)return {error:'Kuota rute sudah penuh.',status:409};let bus:any=null;if(body.kendaraan_id){bus=await tx.kendaraan.findUnique({where:{id:body.kendaraan_id},select:{id:true,rute_id:true,kapasitas_total:true}});if(!bus)return {error:'Bus tidak ditemukan.',status:404};if(bus.rute_id!==route.id)return {error:'Bus dan rute tidak sesuai.',status:409};const occupied=await tx.pendaftaran.count({where:{...passengerCountWhere(route.id,bus.id)}});if(occupied>=bus.kapasitas_total)return {error:'Bus penuh.',status:409};}const row=await tx.pendaftaran.create({data:{user_id:user.id,id_keluarga:null,rute_id:route.id,kendaraan_id:bus?.id||null,nama_kepala_keluarga:user.nama_lengkap,nama_peserta:body.nama_peserta.toUpperCase(),nik_peserta:body.nik_peserta,jenis_kelamin:body.jenis_kelamin,tanggal_lahir:new Date(`${body.tanggal_lahir}T00:00:00.000Z`),kategori_penumpang:category,jenis_identitas:body.jenis_identitas,alamat_rumah:body.alamat_rumah,no_hp_peserta:body.no_hp_peserta,status:'DITERIMA H-3',is_kepala_keluarga:true,konfirmasi_uuid:crypto.randomUUID(),rute_tujuan:route.tujuan,tgl_berangkat:route.waktu_berangkat.toISOString()}});const out=await tx.pendaftaran.update({where:{id:row.id},data:{kode_booking:`MDK-${row.id}`}});await syncRouteCounters(tx,route.id);return {row:out};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if('error' in result){const failure=result as {error:string;status:number};return res.status(failure.status).json({error:failure.error});}res.status(201).json({success:true,data:result.row,pesan:'Penumpang berhasil ditambahkan.'})}catch(e){next(e)}});
app.post('/api/book',auth,async(req,res,next)=>{try{const b=z.object({rute_id:z.coerce.number().int().positive(),nama_kepala_keluarga:z.string().trim().min(2),nama_peserta:z.string().trim().min(2),nik_peserta:z.string().regex(/^\\d{16}$/),jenis_kelamin:z.string().optional(),tanggal_lahir:z.coerce.date().optional(),alamat_rumah:z.string().optional(),no_hp_peserta:z.string().optional()}).parse(req.body);const route=await prisma.rute.findUnique({where:{id:b.rute_id},select:{id:true,tujuan:true,waktu_berangkat:true,is_portal_open:true,kuota_total:true}});if(!route)return res.status(404).json({error:'Rute tidak ditemukan.'});if(!route.is_portal_open)return res.status(403).json({error:'Pendaftaran untuk rute ini sedang ditutup.'});const counts=await routeCounts(route.id);if(counts.accepted+counts.pending>=route.kuota_total)return res.status(409).json({error:'Kuota rute sudah penuh.'});const p=await prisma.pendaftaran.create({data:{...b,user_id:(req as any).user.id,kode_booking:'MUDIK-'+Date.now(),status:'MENUNGGU VERIFIKASI',rute_tujuan:route.tujuan,tgl_berangkat:route.waktu_berangkat.toISOString()}});res.status(201).json(p)}catch(e){next(e)}}); app.post('/api/admin/users/verif-semua',auth,admin,async(req,res,next)=>{try{const ids=Array.isArray(req.body.ids)?req.body.ids.map(Number):undefined;const out=await prisma.user.updateMany({where:ids?{id:{in:ids}}:{status_akun:'MENUNGGU'},data:{status_akun:'AKTIF'}});res.json({success:true,count:out.count})}catch(e){next(e)}});
app.get('/api/admin/users',auth,admin,async(_,res,next)=>{try{res.json(await prisma.user.findMany({select:{id:true,nama_lengkap:true,email:true,nik:true,role:true,status_akun:true}}))}catch(e){next(e)}});app.get('/api/admin/stats',auth,admin,async(_,res,next)=>{try{const [users,totalPendaftar,totalArmada,totalRute,menunggu,diterima,siap,ditolak,feedbackAgg,totalFeedback,routes]=await Promise.all([prisma.user.count(),prisma.pendaftaran.count(),prisma.kendaraan.count(),prisma.rute.count(),prisma.pendaftaran.count({where:{status:'MENUNGGU VERIFIKASI'}}),prisma.pendaftaran.count({where:{status:{in:[...APPROVED_STATUSES]}}}),prisma.pendaftaran.count({where:{status:{in:['SIAP BERANGKAT','TERKONFIRMASI']}}}),prisma.pendaftaran.count({where:{status:{in:['DITOLAK','DIBATALKAN']}}}),prisma.feedback.aggregate({where:{disetujui:true},_avg:{rating:true}}),prisma.feedback.count({where:{disetujui:true}}),prisma.rute.findMany({select:{id:true,asal:true,tujuan:true,kuota_total:true}})]);const detail_rute=await Promise.all(routes.map(routeSummary));const totalQuota=detail_rute.reduce((n:any,r:any)=>n+r.kuota_total,0);const accepted=detail_rute.reduce((n:any,r:any)=>n+r.diterima,0);res.json({users,total_users:users,pendaftar:totalPendaftar,total_masuk:totalPendaftar,rute:totalRute,total_rute:totalRute,kendaraan:totalArmada,total_armada:totalArmada,total_menunggu:menunggu,total_diterima:diterima,total_siap:siap,total_ditolak:ditolak,sisa_kuota_global:Math.max(0,totalQuota-accepted),detail_rute,rata_rata_rating:Number(feedbackAgg._avg.rating||0),total_feedback:totalFeedback})}catch(e){next(e)}});
app.get('/api/kendaraan',async(_,res,next)=>{try{res.json(await prisma.kendaraan.findMany({include:{rute:true}}))}catch(e){next(e)}});
const publicFeedback=async(req:Request,res:Response,next:NextFunction)=>{try{const limit=Math.min(100,Math.max(1,Number(req.query.limit)||10));res.json(await prisma.feedback.findMany({where:{disetujui:true},orderBy:{created_at:'desc'},take:limit}))}catch(e){next(e)}};app.get('/api/feedback',publicFeedback);app.get('/api/feedback/publik',publicFeedback);app.get('/api/feedback/stats',async(_,res,next)=>{try{const [aggregate,total]=await Promise.all([prisma.feedback.aggregate({where:{disetujui:true},_avg:{rating:true}}),prisma.feedback.count({where:{disetujui:true}})]);res.json({rata_rata:Number(aggregate._avg.rating||0),total})}catch(e){next(e)}});app.post('/api/feedback',auth,async(req,res,next)=>{try{const body=z.object({rating:z.coerce.number().int().min(1).max(5),komentar:z.string().max(2000).optional(),nama_pengirim:z.string().max(150).optional()}).parse(req.body);res.status(201).json(await prisma.feedback.create({data:{...body,user_id:(req as any).user.id}}))}catch(e){next(e)}});
const mapHandler=async(_:Request,res:Response,next:NextFunction)=>{try{const terminals=await prisma.terminal.findMany({select:{id:true,nama:true,kota:true,latitude:true,longitude:true}});const routes=await prisma.rute.findMany({include:{terminal:true}});const approved=await prisma.pendaftaran.groupBy({by:['rute_id'],where:approvedStatusWhere,_count:{_all:true}});const countByRoute=new Map(approved.map((row:any)=>[row.rute_id,row._count._all]));const points=routes.map((r:any)=>({kota_asal:r.asal,asal_lat:r.terminal?.latitude??0,asal_lon:r.terminal?.longitude??0,kota_tujuan:r.tujuan,tujuan_lat:r.terminal?.latitude??0,tujuan_lon:r.terminal?.longitude??0,jumlah_pemudik:countByRoute.get(r.id)||0}));res.json(points.length?points:terminals)}catch(e){next(e)}};app.get('/api/map',mapHandler);app.get('/api/peta/sebaran-pemudik',mapHandler);
app.post('/api/upload',auth,upload.single('file'),async(req,res,next)=>{try{const f=(req as any).file;if(!f)return res.status(400).json({error:'file wajib diisi'});const ext=path.extname(f.originalname).toLowerCase().replace(/[^a-z0-9.]/g,'')||'.bin';const filename=`${crypto.randomUUID()}${ext}`;fs.writeFileSync(path.join(uploadsDir,filename),f.buffer);res.status(201).json({url:`/api/uploads/${filename}`,filename})}catch(e){next(e)}});
app.get('/api/uploads/:name',auth,async(req,res,next)=>{try{const name=path.basename(String(req.params.name));const relative=`/api/uploads/${name}`;const user=(req as any).user;if(user.role!=='ADMIN'&&!(await prisma.pendaftaran.findFirst({where:{foto_bukti:relative,user_id:Number(user.id)},select:{id:true}})))return res.status(403).json({error:'Tidak berwenang mengakses dokumen ini.'});const file=path.join(uploadsDir,name);if(!fs.existsSync(file))return res.status(404).json({error:'File tidak ditemukan.'});res.set('Cache-Control','private, no-store').sendFile(file)}catch(e){next(e)}});
// Administrative compatibility aliases used by existing frontend builds.
for (const method of ['post','put'] as const) {
  (app as any)[method]('/api/admin/assign-bus-individual',auth,admin,async(req:Request,res:Response,next:NextFunction)=>{try{const id=Number(req.body.pendaftaran_id||req.body.id||req.body.id_pendaftaran); const vehicle=Number(req.body.kendaraan_id||req.body.bus_id); if(!Number.isInteger(id)||id<1||!Number.isInteger(vehicle)||vehicle<1)return res.status(400).json({error:'pendaftaran_id dan kendaraan_id wajib.'}); const result=await prisma.$transaction(async tx=>{const p=await tx.pendaftaran.findUnique({where:{id},select:{id:true,rute_id:true,kendaraan_id:true,status:true}});if(!p)return {error:'Peserta tidak ditemukan.',status:404};if(!APPROVED_STATUSES.includes(p.status as typeof APPROVED_STATUSES[number]))return {error:'Hanya peserta yang sudah diterima yang dapat diplotting.',status:409};const bus=await tx.kendaraan.findUnique({where:{id:vehicle},select:{id:true,rute_id:true,kapasitas_total:true}});if(!bus)return {error:'Bus tidak ditemukan.',status:404};if(bus.rute_id!==p.rute_id)return {error:'Peserta dan bus harus berada pada rute yang sama.',status:409};const occupied=await tx.pendaftaran.count({where:{...passengerCountWhere(bus.rute_id,bus.id),id:{not:id}}});if(p.kendaraan_id!==bus.id&&occupied>=bus.kapasitas_total)return {error:'Bus penuh.',status:409};const out=await tx.pendaftaran.update({where:{id},data:{kendaraan_id:bus.id}});return {out};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if('error' in result){const failure=result as {error:string;status:number};return res.status(failure.status).json({error:failure.error});}res.json(result.out)}catch(e){next(e)}});
  (app as any)[method]('/api/admin/batalkan-plotting',auth,admin,async(req:Request,res:Response,next:NextFunction)=>{try{const id=Number(req.body.pendaftaran_id||req.body.id); const p=await prisma.pendaftaran.update({where:{id},data:{kendaraan_id:null,status:'MENUNGGU VERIFIKASI'}});res.json(p)}catch(e){next(e)}});
}
app.post('/api/admin/kirim-wa/:action/:id',auth,admin,async(req,res)=>res.json({success:true,action:req.params.action,id:Number(req.params.id)}));
app.post('/api/admin/kirim-link-konfirmasi/:familyId',auth,admin,async(req,res,next)=>{
  try {
    const familyId = Number(req.params.familyId);
    if (!Number.isInteger(familyId) || familyId < 1) return res.status(400).json({ error: 'ID keluarga tidak valid.' });
    const family = await prisma.pendaftaran.findMany({
      where: { OR: [{ id: familyId }, { id_keluarga: familyId }] },
      select: { id: true, no_hp_peserta: true, no_hp_target: true, status: true, konfirmasi_uuid: true }
    });
    if (!family.length) return res.status(404).json({ error: 'Data keluarga tidak ditemukan.' });
    const eligible = family.filter(p => APPROVED_STATUSES.includes(p.status as typeof APPROVED_STATUSES[number]));
    if (!eligible.length) return res.status(409).json({ error: 'Link konfirmasi hanya dapat dikirim untuk pendaftar yang sudah diterima.' });
    const updated = await prisma.pendaftaran.updateMany({
      where: { id: { in: eligible.map(p => p.id) } },
      data: { link_konfirmasi_dikirim: true, konfirmasi_kirim_count: { increment: 1 } }
    });
    res.json({
      success: true,
      count: updated.count,
      kirim_count: updated.count,
      total_keluarga: family.length,
      total_eligible: eligible.length,
      sapa_ok: true,
      pesan: `Link konfirmasi diproses untuk ${updated.count} dari ${family.length} peserta.`
    });
  } catch(e) { next(e); }
});
app.post('/api/admin/kirim-konfirmasi-semua-h3',auth,admin,async(_,res,next)=>{try{const p=await prisma.pendaftaran.updateMany({where:{status:'DISETUJUI'},data:{link_konfirmasi_dikirim:true,konfirmasi_kirim_count:{increment:1}}});res.json({success:true,count:p.count})}catch(e){next(e)}});
app.post('/api/admin/resync-kuota',auth,admin,async(req,res,next)=>{try{const requested=Number(req.query.rute_id);const rs=await prisma.rute.findMany({where:Number.isInteger(requested)&&requested>0?{id:requested}:undefined,select:{id:true,tujuan:true,kuota_terisi:true}});const hasil:any[]=[];for(const r of rs){const before=r.kuota_terisi;const counts=await prisma.$transaction(tx=>syncRouteCounters(tx,r.id));hasil.push({rute_id:r.id,tujuan:r.tujuan,kuota_lama:before,kuota_baru:counts.accepted,diterima:counts.accepted,menunggu:counts.pending})}res.json({success:true,count:rs.length,hasil})}catch(e){next(e)}});
const csvCell=(value:any)=>`"${String(value??'').replaceAll('"','""')}"`;
const manifestCsv=(rows:any[])=>['No,Kode Booking,Nama Peserta,NIK,Kategori,Status,Rute,Bus',...rows.map((p,index)=>[index+1,p.kode_booking,p.nama_peserta,p.nik_peserta,p.kategori_penumpang,p.status,p.rute?.tujuan||p.rute_tujuan,p.kendaraan?.nama_armada||''].map(csvCell).join(','))].join('\n');
app.get('/api/manifest',auth,admin,async(_,res,next)=>{try{const routes=await prisma.rute.findMany({orderBy:{waktu_berangkat:'asc'}});res.json((await Promise.all(routes.map(r=>manifestForRoute(r.id)))).filter(Boolean))}catch(e){next(e)}});
app.get('/api/manifest/rute/:id',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID rute tidak valid.'});const out=await manifestForRoute(id);if(!out)return res.status(404).json({error:'Rute tidak ditemukan.'});res.json(out)}catch(e){next(e)}});
app.get('/api/manifest/bus/:id',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID bus tidak valid.'});const out=await manifestForBus(id);if(!out)return res.status(404).json({error:'Bus tidak ditemukan.'});res.json(out)}catch(e){next(e)}});
app.get('/api/manifest/export/semua',auth,admin,async(_,res,next)=>{try{const rows=await prisma.pendaftaran.findMany({where:approvedStatusWhere,include:{rute:true,kendaraan:true},orderBy:{id:'asc'}});res.type('text/csv').set('Content-Disposition','attachment; filename="manifest-semua.csv"').send(manifestCsv(rows))}catch(e){next(e)}});
app.get('/api/manifest/export/rute/:id',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID rute tidak valid.'});const route=await prisma.rute.findUnique({where:{id},select:{id:true}});if(!route)return res.status(404).json({error:'Rute tidak ditemukan.'});const rows=await prisma.pendaftaran.findMany({where:{rute_id:id,...approvedStatusWhere},include:{rute:true,kendaraan:true},orderBy:{id:'asc'}});res.type('text/csv').set('Content-Disposition',`attachment; filename="manifest-rute-${id}.csv"`).send(manifestCsv(rows))}catch(e){next(e)}});
app.get('/api/manifest/export/bus/:id',auth,admin,async(req,res,next)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({error:'ID bus tidak valid.'});const bus=await prisma.kendaraan.findUnique({where:{id},select:{id:true,rute_id:true}});if(!bus)return res.status(404).json({error:'Bus tidak ditemukan.'});const rows=await prisma.pendaftaran.findMany({where:{kendaraan_id:id,...approvedStatusWhere},include:{rute:true,kendaraan:true},orderBy:{id:'asc'}});res.type('text/csv').set('Content-Disposition',`attachment; filename="manifest-bus-${id}.csv"`).send(manifestCsv(rows))}catch(e){next(e)}});
app.get('/api/admin/export',auth,admin,async(req,res,next)=>{try{const routeId=Number(req.query.rute_id);const where:any={...approvedStatusWhere};if(Number.isInteger(routeId)&&routeId>0)where.rute_id=routeId;if(String(req.query.hanya_plotting)==='true')where.kendaraan_id={not:null};const rows=await prisma.pendaftaran.findMany({where,include:{rute:true,kendaraan:true},orderBy:{id:'asc'}});res.type('text/csv').set('Content-Disposition','attachment; filename="rekap-pendaftar.csv"').send(manifestCsv(rows))}catch(e){next(e)}});
app.get('/api/admin/export/pendaftar',auth,admin,async(_,res,next)=>{try{const rows=await prisma.pendaftaran.findMany({include:{user:true,rute:true,kendaraan:true}});const csv=['id,kode_booking,nama_peserta,nik,status',...rows.map(p=>[p.id,p.kode_booking||'',p.nama_peserta,p.nik_peserta,p.status].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n');res.type('text/csv').set('Content-Disposition','attachment; filename=pendaftar.csv').send(csv)}catch(e){next(e)}});
app.use((e:any,_q:Request,r:Response,_n:NextFunction)=>{
  if(e instanceof z.ZodError)return r.status(400).json({error:e.issues[0]?.message||'Data yang dikirim tidak valid.'});
  if(e instanceof multer.MulterError)return r.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({error:e.code==='LIMIT_FILE_SIZE'?'Ukuran file maksimal 10 MB.':'Upload file tidak valid.'});
  if(e?.code==='P2002')return r.status(409).json({error:'Data tersebut sudah terdaftar.'});
  console.error('Unhandled API error:',e);
  return r.status(500).json({error:'Terjadi kesalahan pada server.'});
}); export {app}; if(require.main===module)app.listen(env.PORT,()=>console.log(`Mudik API listening on ${env.PORT}`));

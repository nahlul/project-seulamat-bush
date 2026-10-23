// src/lib/manifestPdfGenerator.ts
// ================================================================
// GENERATOR PDF MANIFEST BUS
// Halaman 1 : Info Armada + Info Supir
// Halaman 2+: Daftar penumpang dikelompokkan per akun user
//             - Nama user (pemilik akun) dicetak BOLD sebagai header grup
//             - Setiap penumpang dalam grup ada kolom checklist (kotak gambar)
// ================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── TIPE DATA ──────────────────────────────────────────────────
export interface ManifestBusData {
  nama_bus: string;
  plat_nomor?: string;
  nama_supir?: string;
  kontak_supir?: string;
  kapasitas_total?: number;
  terisi?: number;
  sisa_kursi?: number;
  rute_asal?: string;
  rute_tujuan?: string;
  waktu_berangkat?: string;
  total_penumpang?: number;
  jumlah_dewasa?: number;
  jumlah_anak?: number;
  jumlah_bayi?: number;
  penumpang?: PenumpangItem[];
}

export interface PenumpangItem {
  no: number;
  nama_peserta: string;
  nik?: string;
  kategori?: string;
  jenis_kelamin?: string;
  no_hp?: string;
  status?: string;
  kode_booking?: string;
  user_id?: number | null;
  nama_user?: string;
  no_hp_user?: string;
}

// ─── HELPERS ────────────────────────────────────────────────────
function trunc(s: string | undefined | null, maxLen = 40): string {
  if (!s) return "-";
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "..." : s;
}

function groupByUser(
  penumpang: PenumpangItem[]
): {
  userId: number | null;
  namaUser: string;
  noHpUser: string;
  anggota: PenumpangItem[];
}[] {
  const map = new Map<
    string,
    {
      userId: number | null;
      namaUser: string;
      noHpUser: string;
      anggota: PenumpangItem[];
    }
  >();

  for (const p of penumpang) {
    const key =
      p.user_id != null ? `user_${p.user_id}` : `nouser_${p.nama_peserta}`;

    if (!map.has(key)) {
      map.set(key, {
        userId: p.user_id ?? null,
        namaUser: p.nama_user ?? p.nama_peserta,
        noHpUser: p.no_hp_user ?? p.no_hp ?? "-",
        anggota: [],
      });
    }
    map.get(key)!.anggota.push(p);
  }

  return Array.from(map.values());
}

// ─── WARNA KONSTANTA ─────────────────────────────────────────────
const COLOR_PRIMARY: [number, number, number] = [15, 52, 96];   // navy
const COLOR_ACCENT: [number, number, number] = [41, 128, 185];  // biru
const COLOR_LIGHT: [number, number, number] = [235, 245, 255];  // biru muda
const COLOR_GREY: [number, number, number] = [80, 80, 80];
const COLOR_STRIPE: [number, number, number] = [248, 250, 252];

// ─── FUNGSI UTAMA ────────────────────────────────────────────────
export async function generateManifestPDF(data: ManifestBusData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ════════════════════════════════════════════════════════
  // ── LANGSUNG DAFTAR PENUMPANG (halaman 1 dihapus) ────
  // ════════════════════════════════════════════════════════
  const penumpang = data.penumpang ?? [];

  if (penumpang.length === 0) {
    drawPageHeader(doc, W, margin, data);
    doc.setTextColor(...COLOR_GREY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Belum ada penumpang yang terdaftar di bus ini.", W / 2, 60, {
      align: "center",
    });
    drawFooter(doc, W, H, 1, margin);
  } else {
    const groups = groupByUser(penumpang);
    drawPageHeader(doc, W, margin, data);
    let pageY = 42;
    let globalNo = 1;
    let currentPage = 1;

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];

      // Cek ruang cukup untuk header grup + minimal 1 baris
      if (pageY > H - 50) {
        drawFooter(doc, W, H, currentPage, margin);
        doc.addPage();
        drawPageHeader(doc, W, margin, data);
        pageY = 52;
        currentPage++;
      }

      // ── Header Grup: Nama Pemilik Akun ──────────────────
      // Gunakan teks ASCII saja, tanpa emoji
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(margin, pageY, W - margin * 2, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(
        `  ${group.namaUser.toUpperCase()}   |   HP: ${group.noHpUser}   |   ${group.anggota.length} penumpang`,
        margin + 2,
        pageY + 6
      );

      pageY += 9;

      // ── Tabel Anggota Grup ───────────────────────────────
      // Kolom checklist diisi string kosong; kotak digambar manual di didDrawCell
      const tableBody: any[][] = group.anggota.map((p) => [
        "",  // kolom checklist — kotak akan digambar manual
        globalNo++,
        trunc(p.nama_peserta, 35),
        p.nik ?? "-",
        p.kategori ?? "-",
        p.jenis_kelamin === "LAKI-LAKI"
          ? "L"
          : p.jenis_kelamin === "PEREMPUAN"
          ? "P"
          : "-",
        p.no_hp ?? "-",
      ]);

      autoTable(doc, {
        startY: pageY,
        margin: { left: margin, right: margin },
        // Header tabel: ganti tanda centang unicode -> teks biasa
        head: [["Cek", "No", "Nama Penumpang", "NIK", "Kategori", "JK", "No. HP"]],
        body: tableBody,
        theme: "striped",
        headStyles: {
          fillColor: COLOR_ACCENT,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        alternateRowStyles: {
          fillColor: COLOR_STRIPE,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 9 },
          2: { cellWidth: 55, fontStyle: "normal" },
          3: { cellWidth: 35, font: "courier", fontSize: 7.5 },
          4: { halign: "center", cellWidth: 18 },
          5: { halign: "center", cellWidth: 8 },
          6: { cellWidth: "auto" },
        },
        // ── Gambar kotak checklist manual di kolom 0 ─────
        didDrawCell: (hookData) => {
          if (
            hookData.section === "body" &&
            hookData.column.index === 0
          ) {
            const { x, y, width, height } = hookData.cell;
            const boxSize = 4; // ukuran kotak dalam mm
            const bx = x + (width - boxSize) / 2;
            const by = y + (height - boxSize) / 2;
            doc.setDrawColor(80, 80, 80);
            doc.setLineWidth(0.4);
            doc.rect(bx, by, boxSize, boxSize); // kotak kosong = checkbox
          }
        },
        didParseCell: (hookData) => {
          if (
            hookData.section === "body" &&
            hookData.column.index === 2
          ) {
            const rowNama = (hookData.cell.raw as string) ?? "";
            if (
              rowNama
                .toLowerCase()
                .includes(group.namaUser.toLowerCase().slice(0, 10))
            ) {
              hookData.cell.styles.fontStyle = "bold";
            }
          }
        },
        didDrawPage: (hookData) => {
          if (hookData.pageNumber > 1 || currentPage > 1) {
            drawPageHeader(doc, W, margin, data);
          }
          drawFooter(
            doc,
            W,
            H,
            currentPage + hookData.pageNumber - 1,
            margin
          );
        },
      });

      pageY = (doc as any).lastAutoTable.finalY + 5;
      currentPage =
        (doc as any).lastAutoTable.finalY !== undefined
          ? doc.getCurrentPageInfo().pageNumber
          : currentPage;
    }
  }

  // ── SIMPAN FILE ──────────────────────────────────────────────
  const namaFile = `Manifest_Bus_${(data.nama_bus ?? "").replace(/\s+/g, "_")}_${
    data.plat_nomor?.replace(/\s+/g, "") ?? "NoPlat"
  }.pdf`;
  doc.save(namaFile);
}

// ─── HELPER: Header halaman penumpang ────────────────────────────
function drawPageHeader(
  doc: jsPDF,
  W: number,
  margin: number,
  data: ManifestBusData
) {
  doc.setFillColor(15, 52, 96);
  doc.rect(0, 0, W, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MANIFEST PENUMPANG - DAFTAR PESERTA", W / 2, 10, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const busInfo = [
    data.nama_bus ?? "-",
    data.plat_nomor ?? "-",
    `${data.rute_asal ?? ""} --> ${data.rute_tujuan ?? ""}`,
  ]
    .filter(Boolean)
    .join("   |   ");
  doc.text(busInfo, W / 2, 17, { align: "center" });

  doc.setFontSize(7.5);
  doc.text(
    `Supir: ${data.nama_supir ?? "-"}   HP: ${data.kontak_supir ?? "-"}   |   Total: ${
      data.total_penumpang ?? 0
    } penumpang`,
    W / 2,
    23,
    { align: "center" }
  );

  // Baris baru: jadwal berangkat + tanggal cetak
  const tglCetak = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const jadwalStr = data.waktu_berangkat ? `Berangkat: ${data.waktu_berangkat}` : "";
  const cetakStr  = `Dicetak: ${tglCetak}`;
  const infoLine  = jadwalStr ? `${jadwalStr}   |   ${cetakStr}` : cetakStr;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(infoLine, W / 2, 29, { align: "center" });
}

// ─── HELPER: Footer ──────────────────────────────────────────────
function drawFooter(
  doc: jsPDF,
  W: number,
  H: number,
  pageNum: number,
  margin: number
) {
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, H - 10, W - margin, H - 10);

  doc.setTextColor(130, 130, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "Dinas Perhubungan - Program Mudik Gratis | Dokumen Resmi",
    margin,
    H - 6
  );
  doc.text(`Halaman ${pageNum}`, W - margin, H - 6, { align: "right" });
}
// Membuat file Excel 3 sheet: Data Mentah, Data Bersih, Keterangan.

import ExcelJS from "exceljs";
import { HARI } from "./parse.mjs";

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
const FMT_JAM = "[h]:mm"; // [h] supaya jam tutup 26:00 (pukul 02.00 dini hari) tampil apa adanya

const MENTAH = [
  { header: "Nama Maps", key: "nama", width: 38 },
  { header: "Kategori", key: "kategori", width: 22 },
  { header: "Alamat", key: "alamat", width: 56 },
  { header: "Telepon", key: "telepon", width: 18 },
  { header: "Website", key: "website", width: 30 },
  { header: "Rating (teks)", key: "rating_teks", width: 14 },
  { header: "Harga (teks)", key: "harga_teks", width: 18 },
  { header: "Jam Operasional (teks)", key: "jam_teks", width: 70 },
  { header: "Wilayah", key: "wilayah", width: 18 },
  { header: "Kecamatan (dari alamat)", key: "kecamatan", width: 22 },
  { header: "Kabupaten/Kota (dari alamat)", key: "kabupaten", width: 26 },
  { header: "Sesuai Wilayah", key: "sesuai_wilayah", width: 15 },
  { header: "Wilayah Dicari", key: "wilayah_dicari", width: 22 },
  { header: "Ditemukan Via", key: "via", width: 28 },
  { header: "Tanggal Ambil", key: "tanggal_ambil", width: 17 },
  { header: "Link Maps", key: "link_maps", width: 16 },
];

const BERSIH = [
  { header: "nama_maps", key: "nama", width: 38 },
  { header: "kategori", key: "kategori", width: 22 },
  { header: "kecamatan", key: "kecamatan", width: 20 },
  { header: "kabupaten", key: "kabupaten", width: 22 },
  { header: "sesuai_wilayah", key: "sesuai_wilayah", width: 15 },
  { header: "harga_min", key: "harga_min", width: 11 },
  { header: "harga_max", key: "harga_max", width: 11 },
  { header: "rating", key: "rating", width: 8 },
  { header: "jumlah_ulasan", key: "jumlah_ulasan", width: 14 },
  { header: "lat", key: "lat", width: 12 },
  { header: "lng", key: "lng", width: 12 },
  { header: "bisa_di_tempat", key: "bisa_di_tempat", width: 15 },
  { header: "buka_24_jam", key: "buka_24_jam", width: 13 },
  ...HARI.flatMap((h) => [
    { header: `${h.toLowerCase()}_buka`, key: `${h}_buka`, width: 12 },
    { header: `${h.toLowerCase()}_tutup`, key: `${h}_tutup`, width: 12 },
  ]),
  { header: "alamat", key: "alamat", width: 56 },
  { header: "ditemukan_via", key: "via", width: 28 },
  { header: "link_maps", key: "link_maps", width: 16 },
];

const KOLOM = [
  ["nama_maps", "Nama tempat persis seperti tertulis di Google Maps."],
  ["kategori", "Jenis tempat menurut Maps (mis. Kafe, Kedai Kopi). Dipakai untuk menyaring hasil yang bukan target."],
  ["kecamatan / kabupaten", "Kecamatan dan kabupaten/kota tempat itu yang sebenarnya, dibaca dari alamat di Maps (bukan salinan teks yang diketik). Kosong bila alamat tidak memuatnya."],
  ["sesuai_wilayah", "Ya bila kecamatan/kabupaten dari alamat cocok dengan yang dicari; Tidak bila alamat jelas di wilayah lain; Tidak diketahui bila alamat tidak memuat kecamatan/kabupaten. Kecamatan dicocokkan bersama kabupaten, jadi kecamatan senama di kabupaten lain tidak lolos."],
  ["harga_min / harga_max", "Rentang harga dalam rupiah. Kosong bila Maps tidak menampilkannya (lihat catatan)."],
  ["rating / jumlah_ulasan", "Rating bintang (1-5) dan banyaknya ulasan Google."],
  ["lat / lng", "Koordinat (derajat desimal), diambil dari tautan tempat di Maps."],
  ["bisa_di_tempat", "Ya bila Maps menyebut makan di tempat; selain itu Tidak diketahui. Tidak pernah ditebak."],
  ["buka_24_jam", "Ya bila semua hari yang tercatat buka 24 jam; Tidak bila ada jadwal biasa; kosong bila jam tidak tercatat."],
  ["senin_buka ... minggu_tutup", "Jam buka dan tutup per hari (format jam:menit; nilai aslinya pecahan hari, jadi bisa dihitung). Bila ada jam istirahat: buka paling awal dan tutup paling akhir. Jam tutup di atas 24:00 (mis. 26:00) berarti lewat tengah malam (pukul 02.00 dini hari). Hari libur dan jam tak tercatat dikosongkan."],
  ["ditemukan_via", "Kata kunci pencarian yang menemukan tempat itu. Tempat yang sama dari beberapa kata kunci hanya ditulis sekali."],
];

function styleHeader(ws) {
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = HEADER_FILL;
  head.alignment = { vertical: "middle" };
  head.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };
}

const link = (url, teks) => (url ? { text: teks ?? url, hyperlink: url } : "");
const num = (v) => (v === "" || v == null ? null : Number(v));

export async function buildXlsx(rows, meta = {}) {
  const wb = new ExcelJS.Workbook();

  const mentah = wb.addWorksheet("Data Mentah");
  mentah.columns = MENTAH;
  for (const r of rows) {
    const row = mentah.addRow({
      ...r,
      telepon: String(r.telepon ?? ""),
      website: link(r.website),
      via: r.ditemukan_via.join(", "),
      link_maps: link(r.link_maps, "Buka di Maps"),
    });
    row.alignment = { vertical: "top", wrapText: true };
  }
  styleHeader(mentah);

  const bersih = wb.addWorksheet("Data Bersih");
  bersih.columns = BERSIH;
  for (const r of rows) {
    const data = {
      nama: r.nama,
      kategori: r.kategori,
      kecamatan: r.kecamatan,
      kabupaten: r.kabupaten,
      sesuai_wilayah: r.sesuai_wilayah,
      harga_min: num(r.harga_min),
      harga_max: num(r.harga_max),
      rating: num(r.rating),
      jumlah_ulasan: num(r.jumlah_ulasan),
      lat: num(r.lat),
      lng: num(r.lng),
      bisa_di_tempat: r.bisa_di_tempat,
      buka_24_jam: r.buka_24_jam,
      alamat: r.alamat,
      via: r.ditemukan_via.join(", "),
      link_maps: link(r.link_maps, "Buka di Maps"),
    };
    for (const h of HARI) {
      data[`${h}_buka`] = num(r.jam?.[h]?.buka);
      data[`${h}_tutup`] = num(r.jam?.[h]?.tutup);
    }
    bersih.addRow(data);
  }
  for (const col of bersih.columns) {
    if (/_(buka|tutup)$/.test(col.header)) col.numFmt = FMT_JAM;
    if (col.header === "lat" || col.header === "lng") col.numFmt = "0.000000";
    if (col.header.startsWith("harga_")) col.numFmt = "#,##0";
  }
  styleHeader(bersih);

  const ket = wb.addWorksheet("Keterangan");
  ket.columns = [{ width: 30 }, { width: 110 }];
  const info = [
    ["Tanggal pengambilan", meta.tanggal ?? ""],
    ["Jenis yang diketik", meta.jenis ?? ""],
    ["Kecamatan yang dicari", meta.kecamatan || "(tidak diisi)"],
    ["Kabupaten/kota yang dicari", meta.kabupaten || "(tidak diisi)"],
    ["Saring tempat di luar wilayah", meta.saring === false ? "Tidak (semua dipertahankan, lihat kolom sesuai_wilayah)" : "Ya"],
    ["Dibuang karena di luar wilayah", meta.dibuang ?? 0],
    ["Kata kunci yang dicari", (meta.keywords ?? []).join(", ")],
    ["Jumlah tempat (tanpa duplikat)", rows.length],
    ["Sumber", "Google Maps, dibaca otomatis dari tampilan web (scraping). Bukan data resmi Google Places API."],
  ];
  for (const [k, v] of info) ket.addRow([k, v]).getCell(1).font = { bold: true };
  ket.addRow([]);
  const judulCatatan = ket.addRow(["Catatan dan batasan"]);
  judulCatatan.font = { bold: true };
  for (const teks of [
    "Hasil = tempat yang tampil di Google Maps untuk kata kunci dan wilayah di atas pada tanggal pengambilan. Bukan jaminan seluruh tempat di wilayah itu; satu pencarian Maps dibatasi sekitar 60-120 hasil.",
    "Maps memberi Chrome otomatis 'tampilan terbatas'. Di tampilan itu rentang harga dan opsi makan di tempat tidak ditampilkan, jadi harga_min/harga_max kosong dan bisa_di_tempat berisi Tidak diketahui. Kolom tetap disediakan agar terisi bila datanya tersedia.",
    "Sel kosong berarti Maps tidak menampilkan datanya. Pemilik tempat tidak selalu mengisi jam buka.",
    "Rating dari sedikit ulasan kurang dapat diandalkan; perhatikan kolom jumlah_ulasan.",
    "Scraping langsung melanggar ketentuan layanan Google Maps. Sebutkan hal ini di bagian metode bila data dipakai dalam laporan.",
  ]) ket.addRow([teks]);
  ket.addRow([]);
  ket.addRow(["Arti kolom Data Bersih"]).font = { bold: true };
  for (const [k, v] of KOLOM) ket.addRow([k, v]);
  ket.eachRow((row) => (row.alignment = { vertical: "top", wrapText: true }));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Membuat file Excel satu sheet berisi data bersih (angka dan Ya/Tidak siap olah).

import ExcelJS from "exceljs";
import { HARI } from "./parse.mjs";

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
const FMT_JAM = "[h]:mm"; // [h] supaya jam tutup 26:00 (pukul 02.00 dini hari) tampil apa adanya

const KOLOM = [
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

const link = (url, teks) => (url ? { text: teks ?? url, hyperlink: url } : "");
const num = (v) => (v === "" || v == null ? null : Number(v));

export async function buildXlsx(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Data");
  ws.columns = KOLOM;

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
    ws.addRow(data);
  }

  for (const col of ws.columns) {
    if (/_(buka|tutup)$/.test(col.header)) col.numFmt = FMT_JAM;
    if (col.header === "lat" || col.header === "lng") col.numFmt = "0.000000";
    if (col.header.startsWith("harga_")) col.numFmt = "#,##0";
  }

  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = HEADER_FILL;
  head.alignment = { vertical: "middle" };
  head.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

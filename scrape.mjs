// Versi terminal. Pakai: node scrape.mjs "<jenis>" --kecamatan=<nama> --kabupaten=<nama> [--maks=N] [--semua]
// --semua = jangan buang tempat di luar wilayah (tetap ditandai di kolom sesuai_wilayah).
// Hasil disimpan sebagai Excel di folder hasil/. Untuk tampilan web: start.bat (atau node server.mjs).

import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import { ensureHasilDir, namaFile } from "./lib.mjs";
import { searchBrowser } from "./browser.mjs";
import { buildXlsx } from "./xlsx.mjs";

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(question)).trim();
  rl.close();
  return answer;
}

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));

const flag = (nama) => flags.find((f) => f.startsWith(`--${nama}=`))?.slice(nama.length + 3);
const jenis = positional[0] ?? (await ask("Jenis tempat (mis. coffee, salon): "));
const kecamatan = flag("kecamatan") ?? (flags.length || positional.length > 1 ? "" : await ask("Kecamatan (boleh kosong): "));
const kabupaten = flag("kabupaten") ?? (flags.length || positional.length > 1 ? "" : await ask("Kabupaten/Kota: "));
if (!jenis || (!kecamatan && !kabupaten)) {
  console.error("Isi jenis tempat dan minimal kecamatan atau kabupaten. Contoh: node scrape.mjs \"coffee\" --kecamatan=Ceper --kabupaten=Klaten");
  process.exit(1);
}
const maks = Number(flag("maks")) || undefined;
const saring = !flags.includes("--semua");

try {
  const hasil = await searchBrowser({ jenis, kecamatan, kabupaten, maks, saring, onProgress: console.log });
  const out = join(ensureHasilDir(), namaFile({ jenis, kecamatan, kabupaten }));
  writeFileSync(out, await buildXlsx(hasil.rows));
  console.log(`Selesai: ${hasil.rows.length} tempat diterima, ${hasil.dibuang} dibuang di luar wilayah -> ${out}`);
  if (hasil.login === false) console.log("Catatan: belum login Google, harga dan bisa_di_tempat kemungkinan kosong (jalankan login.bat).");
} catch (err) {
  console.error("Gagal:", err.message);
  process.exit(1);
}

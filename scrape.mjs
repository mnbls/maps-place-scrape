// Versi terminal. Pakai: node scrape.mjs "<jenis>" "<wilayah>" [--maks=N]
// Hasil disimpan sebagai Excel di folder hasil/. Untuk tampilan web: start.bat (atau node server.mjs).

import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import { ensureHasilDir, slug } from "./lib.mjs";
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

const jenis = positional[0] ?? (await ask("Jenis tempat (mis. coffee, salon): "));
const wilayah = positional[1] ?? (await ask("Wilayah (mis. Mlati Sleman): "));
if (!jenis || !wilayah) {
  console.error("Jenis tempat dan wilayah wajib diisi.");
  process.exit(1);
}
const maks = Number(flags.find((f) => f.startsWith("--maks="))?.split("=")[1]) || undefined;

try {
  const { rows, keywords, tanggal } = await searchBrowser({ jenis, wilayah, maks, onProgress: console.log });
  const out = join(ensureHasilDir(), `${slug(jenis)}-${slug(wilayah)}.xlsx`);
  writeFileSync(out, await buildXlsx(rows, { jenis, wilayah, keywords, tanggal }));
  console.log(`Selesai: ${rows.length} tempat -> ${out}`);
} catch (err) {
  console.error("Gagal:", err.message);
  process.exit(1);
}

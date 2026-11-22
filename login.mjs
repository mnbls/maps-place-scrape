// Membuka Chrome biasa (tanpa otomatisasi) di halaman login Google memakai profil scraper.
// Setelah login, TUTUP jendelanya; scraper memakai profil yang sama sehingga Maps menampilkan harga dan opsi makan di tempat.
// Kata sandi diketik sendiri di jendela itu; skrip ini tidak pernah melihatnya.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { dir } from "./lib.mjs";

const kandidat = [
  join(process.env["ProgramFiles"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  join(process.env["ProgramFiles(x86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  join(process.env["LOCALAPPDATA"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
];
const chrome = kandidat.find((p) => existsSync(p));
if (!chrome) {
  console.error("Chrome tidak ditemukan. Pasang Google Chrome dulu.");
  process.exit(1);
}

spawn(chrome, [`--user-data-dir=${join(dir, ".browser-profile")}`, "--no-first-run", "--no-default-browser-check", "https://accounts.google.com/"], {
  detached: true,
  stdio: "ignore",
}).unref();

console.log("Jendela Chrome terbuka. Login ke Google (disarankan akun khusus), lalu TUTUP jendela itu.");
console.log("Setelah itu jalankan start.bat seperti biasa.");

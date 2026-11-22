// Server lokal untuk tampilan web. Hanya bisa diakses dari komputer ini (127.0.0.1).

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dir, ensureHasilDir, slug } from "./lib.mjs";
import { searchBrowser } from "./browser.mjs";
import { expandKeywords } from "./parse.mjs";
import { buildXlsx } from "./xlsx.mjs";

const PORT = Number(process.env.PORT ?? 3737);

// Pencarian berjalan lama, jadi dijalankan sebagai job dan dipantau lewat polling.
// Hanya satu job sekaligus karena memakai satu profil browser.
const jobs = new Map();
let activeJob = null;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) reject(new Error("Permintaan terlalu besar"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON tidak valid"));
      }
    });
  });
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

// Tampilan web hanya perlu ringkasan tiap tempat, bukan seluruh data per hari.
function ringkas(r) {
  return {
    nama: r.nama, kategori: r.kategori, rating: r.rating, jumlah_ulasan: r.jumlah_ulasan,
    lat: r.lat, lng: r.lng, harga_min: r.harga_min, harga_max: r.harga_max,
    bisa_di_tempat: r.bisa_di_tempat, buka_24_jam: r.buka_24_jam,
    jam: r.jam?.Senin?.raw || r.jam_teks.slice(0, 40), link_maps: r.link_maps,
    via: r.ditemukan_via.join(", "),
  };
}

// Simpan Excel ke folder hasil/ setelah job selesai atau berhenti, supaya hasil sebagian tidak hilang.
async function simpanFile(job) {
  if (!job.rows.length) return;
  const file = join(ensureHasilDir(), `${slug(job.meta.jenis)}-${slug(job.meta.wilayah)}.xlsx`);
  writeFileSync(file, await buildXlsx(job.rows, job.meta));
  job.file = file;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      return send(res, 200, readFileSync(join(dir, "index.html"), "utf8"), "text/html; charset=utf-8");
    }

    if (req.method === "POST" && req.url === "/api/search") {
      if (activeJob) return send(res, 409, { error: "Masih ada pencarian yang berjalan." });
      const { jenis, wilayah, maks } = await readJson(req);
      if (!jenis?.trim() || !wilayah?.trim()) {
        return send(res, 400, { error: "Jenis tempat dan wilayah wajib diisi." });
      }
      const id = String(Date.now());
      const meta = { jenis: jenis.trim(), wilayah: wilayah.trim(), keywords: expandKeywords(jenis), tanggal: "" };
      const job = { status: "running", progress: "Memulai...", rows: [], error: "", meta, file: "" };
      jobs.set(id, job);
      activeJob = id;
      searchBrowser({
        jenis: meta.jenis,
        wilayah: meta.wilayah,
        maks: Number(maks) > 0 ? Number(maks) : undefined,
        onProgress: (text) => (job.progress = text),
        onRow: (_row, rows) => {
          job.rows = rows;
          job.meta.tanggal = job.meta.tanggal || rows[0].tanggal_ambil;
        },
      })
        .then(({ rows, tanggal }) => Object.assign(job, { status: "done", rows }, { meta: { ...meta, tanggal } }))
        .catch((err) => Object.assign(job, { status: "error", error: err.message }))
        .then(() => simpanFile(job).catch((err) => console.warn("Gagal menyimpan Excel:", err.message)))
        .finally(() => (activeJob = null));
      return send(res, 200, { id });
    }

    if (req.method === "GET" && req.url.startsWith("/api/job?id=")) {
      const job = jobs.get(req.url.split("=")[1]);
      if (!job) return send(res, 404, { error: "Job tidak ditemukan" });
      return send(res, 200, {
        status: job.status, progress: job.progress, error: job.error, file: job.file,
        total: job.rows.length, rows: job.rows.map(ringkas),
      });
    }

    if (req.method === "GET" && req.url.startsWith("/api/xlsx?id=")) {
      const job = jobs.get(req.url.split("=")[1]);
      if (!job || !job.rows.length) return send(res, 404, { error: "Belum ada data untuk diunduh." });
      const buffer = await buildXlsx(job.rows, job.meta);
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": buffer.length,
      });
      return res.end(buffer);
    }

    send(res, 404, { error: "Tidak ditemukan" });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Berjalan di http://localhost:${PORT}  (tutup jendela ini untuk berhenti)`);
});

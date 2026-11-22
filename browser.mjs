// Membuka Google Maps lewat Chrome/Edge sungguhan (jendelanya terlihat) dan membaca daftar tempat.
// Bila Google meminta verifikasi (CAPTCHA), selesaikan sendiri di jendela itu.

import { chromium } from "playwright-core";
import { join } from "node:path";
import { dir } from "./lib.mjs";
import {
  expandKeywords, parseRating, parseCoords, parseHarga, parseHours, parseDineIn, placeKey, parseWilayah, cocokWilayah,
} from "./parse.mjs";

const PROFILE_DIR = join(dir, ".browser-profile");
const BATAS_AMAN = 400; // batas per kata kunci supaya daftar tak berujung tidak menggantung
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const opts = { headless: false, locale: "id-ID", viewport: { width: 1280, height: 900 } };
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launchPersistentContext(PROFILE_DIR, { ...opts, channel });
    } catch (err) {
      if (channel === "msedge") throw new Error(`Chrome/Edge tidak bisa dibuka: ${err.message}`);
    }
  }
}

async function passChallenges(page, onProgress) {
  if (page.url().includes("consent.google")) {
    await page.getByRole("button", { name: /tolak semua|reject all/i }).first().click({ timeout: 5000 }).catch(() => {});
  }
  if (page.url().includes("/sorry/")) {
    onProgress?.("Google meminta verifikasi. Selesaikan di jendela browser (maks. 2 menit)...");
    await page.waitForURL((u) => !u.href.includes("/sorry/"), { timeout: 120_000 });
  }
}

async function collectLinks(page, maks, onProgress, label) {
  const feed = page.locator('div[role="feed"]');
  await feed.waitFor({ timeout: 20_000 }).catch(() => {});
  if (!(await feed.count())) {
    return page.url().includes("/maps/place/") ? [page.url()] : [];
  }
  const batas = maks ?? BATAS_AMAN;
  let stalled = 0;
  let last = 0;
  while (stalled < 5) {
    const links = await page.$$eval("a.hfpxzc", (els) => els.map((a) => a.href));
    onProgress?.(`"${label}": mengumpulkan daftar (${links.length})`);
    if (links.length >= batas) break;
    stalled = links.length === last ? stalled + 1 : 0;
    last = links.length;
    if (await page.getByText(/telah mencapai akhir daftar|reached the end of the list/i).count()) break;
    await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));
    await sleep(1200);
  }
  const all = await page.$$eval("a.hfpxzc", (els) => els.map((a) => a.href));
  return [...new Set(all)].slice(0, batas);
}

async function readPlace(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 15_000 });
  await sleep(900);

  // Semua isian dibaca lebih dulu: membuka jadwal jam mengganti isi panel (nama dan rating hilang dari DOM).
  const mentah = await page.evaluate(() => {
    const txt = (e) => e?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    const after = (s) => (s ?? "").replace(/^[^:]*:\s*/, "").trim();
    const attr = (sel) => document.querySelector(sel)?.getAttribute("aria-label");
    const panel = txt(document.querySelector('div[role="main"]'));
    return {
      nama: txt(document.querySelector("h1")),
      kategori: txt(document.querySelector("button.DkEaL")),
      ratingTeks: txt(document.querySelector("div.F7nice")),
      alamat: after(attr('button[data-item-id="address"]')),
      telepon: after(attr('button[data-item-id^="phone"]')),
      website: document.querySelector('a[data-item-id="authority"]')?.href ?? "",
      jamBaris: [...document.querySelectorAll("tr.y0skZc")].map((tr) => ({
        hari: tr.querySelector("td.ylH6lf")?.innerText.trim(),
        items: [...tr.querySelectorAll("li.G8aQO")].map((li) => li.innerText.trim()),
      })),
      // Bagian atas panel (sebelum ulasan) tempat harga dan opsi layanan muncul bila tersedia.
      atas: panel.split(/Ringkasan ulasan/)[0],
      header: panel.split(/\bRute\b/)[0],
    };
  });

  // Jadwal per hari tersembunyi sampai tombol "Lihat jam lainnya" diklik.
  if (!mentah.jamBaris.length) {
    const tombol = page.locator('button[aria-label*="jam lainnya"]').first();
    if (await tombol.count()) {
      await tombol.click({ timeout: 3000 }).catch(() => {});
      await page.waitForSelector("tr.y0skZc", { timeout: 3000 }).catch(() => {});
      mentah.jamBaris = await page.evaluate(() =>
        [...document.querySelectorAll("tr.y0skZc")].map((tr) => ({
          hari: tr.querySelector("td.ylH6lf")?.innerText.trim(),
          items: [...tr.querySelectorAll("li.G8aQO")].map((li) => li.innerText.trim()),
        })),
      );
    }
  }

  const { rating, jumlah_ulasan } = parseRating(mentah.ratingTeks);
  const { lat, lng } = parseCoords(page.url());
  const jam = parseHours(mentah.jamBaris, mentah.atas);
  const harga = parseHarga(mentah.header);
  return {
    nama: mentah.nama,
    kategori: mentah.kategori,
    alamat: mentah.alamat,
    telepon: mentah.telepon,
    website: mentah.website,
    rating_teks: mentah.ratingTeks,
    rating,
    jumlah_ulasan,
    lat,
    lng,
    ...harga,
    harga_teks: harga.harga_min === "" ? "" : mentah.header.match(/Rp[^A-Za-z]{0,24}/)?.[0]?.trim() ?? "",
    bisa_di_tempat: parseDineIn(mentah.atas),
    buka_24_jam: jam.buka_24_jam,
    jam_teks: jam.jam_teks,
    jam: jam.perHari,
  };
}

// "Kecamatan Ceper Klaten": kata "Kecamatan" membantu Maps memusatkan hasil ke kecamatan itu.
export function buildQuery(kata, kecamatan, kabupaten) {
  const kec = kecamatan?.trim();
  return [kata, kec && (/^kec/i.test(kec) ? kec : `Kecamatan ${kec}`), kabupaten?.trim()].filter(Boolean).join(" ");
}

/**
 * Mencari `jenis` di kecamatan/kabupaten. "coffee"/"kopi" diperluas jadi tiga kata kunci dan hasilnya digabung.
 * `maks` kosong = ambil semua yang muncul, dihitung per kata kunci.
 * `saring` = buang tempat yang alamatnya jelas berada di luar kecamatan/kabupaten yang diminta.
 * `onRow` dipanggil tiap tempat selesai dibaca (untuk menyimpan progres).
 */
export async function searchBrowser({ jenis, kecamatan = "", kabupaten = "", maks, saring = true, onProgress, onRow }) {
  const keywords = expandKeywords(jenis);
  const tanggal = new Date().toISOString().slice(0, 16).replace("T", " ");
  const wilayahDicari = [kecamatan.trim(), kabupaten.trim()].filter(Boolean).join(", ");
  const context = await launch();
  const rows = [];
  const byKey = new Map();
  let dibuang = 0;
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    for (const [k, kata] of keywords.entries()) {
      const query = buildQuery(kata, kecamatan, kabupaten); // tanpa kata "di": Maps bisa menafsirkannya sebagai rute
      onProgress?.(`Kata kunci ${k + 1}/${keywords.length}: "${kata}"`);
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=id`, { waitUntil: "domcontentloaded" });
      await passChallenges(page, onProgress);
      const links = await collectLinks(page, maks, onProgress, kata);

      for (const [i, link] of links.entries()) {
        const key = placeKey(link);
        if (byKey.has(key)) {
          const ada = byKey.get(key);
          if (!ada.ditemukan_via.includes(kata)) ada.ditemukan_via.push(kata);
          continue;
        }
        onProgress?.(`"${kata}": membaca tempat ${i + 1}/${links.length} (diterima ${rows.length}, dibuang ${dibuang} di luar wilayah)`);
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const row = await readPlace(page, link);
            await passChallenges(page, onProgress);
            if (row.nama) {
              const asal = parseWilayah(row.alamat);
              const sesuai = cocokWilayah(asal, { kecamatan, kabupaten });
              const item = {
                ...row, ...asal, sesuai_wilayah: sesuai, wilayah_dicari: wilayahDicari,
                ditemukan_via: [kata], tanggal_ambil: tanggal, link_maps: link,
              };
              byKey.set(key, item);
              if (saring && sesuai === "Tidak") {
                dibuang++; // tetap dicatat di byKey supaya tidak dibaca ulang oleh kata kunci berikutnya
              } else {
                rows.push(item);
                onRow?.(item, rows);
              }
            }
            break;
          } catch (err) {
            if (attempt === 1) console.warn(`Lewati ${link}: ${err.message.split("\n")[0]}`);
          }
        }
      }
    }
    return { rows, keywords, tanggal, dibuang, wilayahDicari };
  } finally {
    await context.close();
  }
}

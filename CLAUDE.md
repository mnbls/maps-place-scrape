# maps-place-scrape

Mengambil daftar tempat dari Google Maps per wilayah (kecamatan/kabupaten) → Excel 3 sheet (Data Mentah, Data Bersih, Keterangan)
sebagai bahan sistem keputusan fuzzy yang dihitung pengguna sendiri di luar aplikasi. **Tidak ada perhitungan/skor di aplikasi.**
Repo: https://github.com/mnbls/maps-place-scrape (branch `main`, publik). Node.js saja, tanpa Python. Detail riwayat: `PROGRES.md`.

## Status (2026-11-22)

Jalan dan teruji dengan Maps asli: input jenis + wilayah, "coffee"/"kopi" → 3 kata kunci digabung tanpa duplikat, koordinat, kategori,
rating, jumlah ulasan, jam buka per hari (24 jam/lewat tengah malam), Excel 3 sheet, simpan otomatis ke `hasil/`.
**Terbatas:** `harga_min/harga_max` dan `bisa_di_tempat` hampir selalu kosong/"Tidak diketahui" karena Maps memberi "tampilan terbatas" ke Chrome otomatis (lihat PROGRES.md).
**Sudah diputuskan pengguna:** harga dan bisa_di_tempat **dibiarkan kosong** (lihat PROGRES.md "Keputusan: harga dan bisa_di_tempat"). Jangan ditanyakan ulang.

## Struktur

| File | Isi |
|---|---|
| `parse.mjs` | Fungsi murni (tanpa browser): `expandKeywords`, `parseRating`, `parseCoords`, `parseHarga`, `parseDay/parseHours`, `parseDineIn`, `placeKey`. Mudah diuji |
| `browser.mjs` | Playwright + Chrome/Edge asli (jendela terlihat). `searchBrowser({jenis, wilayah, maks, onProgress, onRow})`, `collectLinks`, `readPlace` |
| `xlsx.mjs` | `buildXlsx(rows, meta)` dengan `exceljs`, 3 sheet |
| `server.mjs` | `127.0.0.1:3737`. `POST /api/search` (job), `GET /api/job?id=`, `GET /api/xlsx?id=`. Menyimpan Excel ke `hasil/` saat job selesai/berhenti |
| `index.html` | Seluruh tampilan (satu file) |
| `scrape.mjs` | Versi terminal |
| `lib.mjs` | `dir`, `HASIL_DIR`, `slug` |
| `start.bat` | Cek Node, `npm install` otomatis, buka browser, jalankan server |

Selektor Maps yang terbukti (per 2026-11-22): daftar `div[role="feed"]` + `a.hfpxzc`; detail `h1`, `button.DkEaL` (kategori), `div.F7nice` ("4,8 (713)"),
`button[data-item-id="address"]`, `button[data-item-id^="phone"]`, `a[data-item-id="authority"]`; jam: tombol `button[aria-label*="jam lainnya"]` lalu
`tr.y0skZc` (`td.ylH6lf` hari, `li.G8aQO` jam); koordinat dari URL `!3d..!4d..`.

## Jebakan yang sudah ditemui (jangan diulang)

- **Baca semua isian SEBELUM mengklik tombol jam.** Membuka jadwal mengganti isi panel; nama jadi "Jam Buka" dan rating kosong kalau dibaca sesudahnya.
- **Jangan pakai kata "di" di query Maps** ("kafe di Jogja" dibaca sebagai rute). Query = `"<kata kunci> <wilayah>"`.
- "Tampilan terbatas" tidak hilang dengan WebGL/flag GPU, "Lihat lainnya", klik dari daftar, atau browser pane. Jangan buang waktu mengulang itu.
- Satu profil Chrome (`.browser-profile`) hanya untuk satu proses: matikan server sebelum skrip debug. Matikan **hanya** proses `server.mjs` (cari lewat `Win32_Process` + CommandLine), jangan `Stop-Process` semua `node`.
- Tool `Write` menolak menimpa file yang belum di-`Read` di sesi itu.
- CAPTCHA (`/sorry/`): skrip menunggu pengguna menyelesaikannya (maks 2 menit). Jangan coba melewatinya. Scraping melanggar ketentuan Google; jangan beri janji kelengkapan data.
- `npm install` pernah gagal sekali (error cache OpenSSL); ulangi dengan `--prefer-online`.
- Mesin: Windows 10, PowerShell, Node v26, tidak ada Python/`gh`. `code.cmd` ada di `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\`.

## Aturan kerja dengan pengguna

- Bahasa Indonesia. Jawaban singkat dan jujur soal apa yang belum teruji. Pengguna sering berdiskusi dulu: **jangan mengerjakan sebelum ada perintah "mulai"/"kerjakan"**.
- **Commit tanpa baris `Co-Authored-By`/atribusi Claude** dan tanpa nama Claude (permintaan eksplisit). Identitas git lokal repo: `mnbls <mnbls@users.noreply.github.com>`.
- **Konfirmasi dulu sebelum setiap push** (repo publik); pengguna menjawab "Ya, push". Pesan "error" merah saat `git push` di PowerShell hanya stderr progres: cek dengan `git status -sb`.
- Jangan ubah pengaturan keamanan Windows; beri langkahnya saja. Jangan masukkan kredensial Google ke profil Chrome atas nama pengguna.
- Proyek lain `D:\Projek\gmaps-leads` (pencari calon klien website, repo `mnbls/ScrapingTargetClient`) dan `D:\Projek\Website-PT-Suka-Cita-Nusantara` terpisah; jangan diubah dari sini.

## Menjalankan dan menguji

`start.bat` (atau `npm install` lalu `node server.mjs`, buka http://localhost:3737). Uji cepat: "coffee", wilayah apa saja, "Maks. per kata kunci" = 4 (sekitar 40 detik).

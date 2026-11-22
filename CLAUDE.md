# maps-place-scrape

Mengambil daftar tempat dari Google Maps per wilayah (kecamatan/kabupaten) → Excel **satu sheet "Data" berisi data bersih saja** (permintaan pengguna; Data Mentah dan Keterangan sudah dibuang), nama file dari input via `namaFile()` di `lib.mjs`
sebagai bahan sistem keputusan fuzzy yang dihitung pengguna sendiri di luar aplikasi. **Tidak ada perhitungan/skor di aplikasi.**
Repo: https://github.com/mnbls/maps-place-scrape (branch `main`, publik). Node.js saja, tanpa Python. Detail riwayat: `PROGRES.md`.

## Status (2026-11-22)

Jalan dan teruji dengan Maps asli: input jenis + **kecamatan + kabupaten/kota** (terpisah), saringan wilayah dari alamat asli (`kecamatan`, `kabupaten`,
`sesuai_wilayah`; uji "coffee" Ceper Klaten: 9 diterima, 3 dibuang), "coffee"/"kopi" → 3 kata kunci digabung tanpa duplikat, koordinat, kategori,
rating, jumlah ulasan, jam buka per hari (24 jam/lewat tengah malam), Excel satu sheet, simpan otomatis ke `hasil/` dan unduhan memakai nama file yang sama (header `Content-Disposition`).
**Harga dan bisa_di_tempat TERISI bila profil Chrome login Google** (pengguna menuntut kolom ini harus terisi). Diuji "coffee" Depok Sleman: 10 tempat, harga 10/10, makan di tempat 10/10.
Tanpa login Maps memberi "tampilan terbatas" dan kedua kolom kosong/"Tidak diketahui"; tampilan web dan terminal memberi peringatan (`login` dari `searchBrowser`); status login tidak lagi ditulis di Excel.
Login dilakukan **pengguna sendiri** lewat `login.bat`/`login.mjs` (Chrome biasa di profil `.browser-profile`; Chrome harus ditutup penuh sesudahnya). Jangan masukkan kredensial atas nama pengguna.
**Belum terverifikasi:** label ikon untuk "Tidak melayani makan di tempat" (semua kedai kopi uji = Ya); `parseDineIn` mengasumsikan label berkata "Tidak/Bukan".

## Struktur

| File | Isi |
|---|---|
| `parse.mjs` | Fungsi murni (tanpa browser): `expandKeywords`, `parseRating`, `parseCoords`, `parseHarga`, `parseDay/parseHours`, `parseDineIn`, `placeKey`. Mudah diuji |
| `browser.mjs` | Playwright + Chrome/Edge asli (jendela terlihat). `searchBrowser({jenis, kecamatan, kabupaten, maks, saring, onProgress, onRow})` (mengembalikan `login`), `buildQuery`, `collectLinks`, `readPlace` |
| `xlsx.mjs` | `buildXlsx(rows)` dengan `exceljs`, satu sheet "Data" |
| `server.mjs` | `127.0.0.1:3737`. `POST /api/search` (job), `GET /api/job?id=`, `GET /api/xlsx?id=`. Menyimpan Excel ke `hasil/` saat job selesai/berhenti |
| `index.html` | Seluruh tampilan (satu file) |
| `scrape.mjs` | Versi terminal |
| `lib.mjs` | `dir`, `HASIL_DIR`, `slug` |
| `start.bat` | Cek Node, `npm install` otomatis, buka browser, jalankan server |
| `login.bat` / `login.mjs` | Membuka Chrome biasa di profil scraper untuk login Google oleh pengguna |

Selektor Maps yang terbukti (per 2026-11-22): daftar `div[role="feed"]` + `a.hfpxzc`; detail `h1`, `button.DkEaL` (kategori), `div.F7nice` ("4,8 (713)"),
`button[data-item-id="address"]`, `button[data-item-id^="phone"]`, `a[data-item-id="authority"]`; jam: tombol `button[aria-label*="jam lainnya"]` lalu
`tr.y0skZc` (`td.ylH6lf` hari, `li.G8aQO` jam); koordinat dari URL `!3d..!4d..`.

## Jebakan yang sudah ditemui (jangan diulang)

- **Baca semua isian SEBELUM mengklik tombol jam.** Membuka jadwal mengganti isi panel; nama jadi "Jam Buka" dan rating kosong kalau dibaca sesudahnya.
- **Kolom wilayah harus dari alamat asli**, bukan salinan teks input (pengguna menemukan tempat di luar Ceper/Klaten padahal kolomnya "ceper"). `parseWilayah`/`cocokWilayah` di `parse.mjs`: kecamatan dicocokkan bersama kabupaten ("Depok" ada di banyak kabupaten); alamat tanpa kec/kab = "Tidak diketahui" dan tidak dibuang.
- **Hentikan server lama sebelum memulai yang baru.** Proses `node server.mjs` sisa (mis. dari folder uji yang sudah dihapus) menahan port 3737 dan membuat halaman HTTP 500. Cek `Win32_Process` CommandLine `*server.mjs*`.
- **Jangan pakai kata "di" di query Maps** ("kafe di Jogja" dibaca sebagai rute). Query = `"<kata kunci> <wilayah>"`.
- "Tampilan terbatas" HILANG hanya dengan **login Google** di profil. Tidak hilang dengan WebGL/flag GPU, "Lihat lainnya", klik dari daftar, browser pane, atau Chrome biasa tanpa login (webdriver false). Jangan ulangi itu.
- **Jangan menyamar sebagai perangkat lain** (emulasi HP/user agent) untuk mengakali tampilan terbatas: diblokir sistem keamanan sebagai pengelabuan. Jalur sah: login pengguna, atau Google Places API (belum dibangun; butuh API key + billing).
- **Bug parser `parseHarga`:** satuan `k` menangkap huruf K dari kata berikutnya ("Rp 1–25.000 Kedai Kopi" jadi 1.000–25.000.000). Satuan harus diakhiri `\b`. Maps menulis kategori termurah "Rp 1–25.000" (harga_min 1 = batas bawah kategori).
- Makan di tempat dibaca dari `div[role="group"][aria-label]` ("Melayani makan di tempat", "Bisa bawa pulang", "Tidak menyediakan layanan pengiriman"), bukan dari tulisan, karena ikon ✓/✗ yang menentukan.
- Chrome yang dibuka `login.mjs` meninggalkan proses di latar; scraper menolak jalan sampai Chrome profil itu benar-benar ditutup (cek `Win32_Process` CommandLine `*.browser-profile*`).
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

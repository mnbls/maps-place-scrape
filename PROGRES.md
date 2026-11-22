# Progres maps-place-scrape

Log berurutan dan alasan keputusan. Ringkasan untuk Claude ada di `CLAUDE.md`.

## Tujuan
Daftar tempat (awalnya kafe/kedai kopi) per kecamatan/kabupaten dari Google Maps, berbentuk Excel, sebagai bahan sistem pengambilan
keputusan fuzzy. Metode fuzzy-nya belum ditentukan dan dihitung pengguna sendiri di luar aplikasi.

## Keputusan yang sudah diambil
| Hal | Keputusan | Alasan |
|---|---|---|
| Output | Hanya Excel, **satu sheet "Data" berisi data bersih** (awalnya 3 sheet: Mentah, Bersih, Keterangan; dipangkas atas permintaan pengguna), nama file dari input | Pengguna hanya butuh data siap olah. Konsekuensi: tanggal ambil, kata kunci, dan status login tidak tercatat di file |
| Input | Jenis tempat + wilayah, diketik sendiri | Fleksibel; kecamatan diketik satu per satu |
| "coffee"/"kopi" | Diperluas jadi "coffee shop", "kafe", "kedai kopi", digabung dan dibuang duplikatnya | Maps memberi hasil berbeda tiap kata; kolom `ditemukan_via` mencatat asalnya |
| Jumlah maks | Opsional, per kata kunci; kosong = semua yang muncul | Tujuannya mengambil seluruh yang tampil di wilayah |
| Metode | Scraping Chrome otomatis (bukan Places API) | Pilihan pengguna: gratis, tanpa API key |
| Data kosong | Dibiarkan kosong | Pilihan pengguna |
| `bisa_di_tempat` | Ya / Tidak diketahui, tidak pernah menebak | Data jujur; "Tidak" tanpa dasar bisa salah |
| Jam buka | Kolom buka dan tutup per hari + `buka_24_jam` | Siap dihitung; jam tutup >24:00 = lewat tengah malam |
| Fasilitas (Wi-Fi dll) | Dibatalkan | Permintaan pengguna |
| Dibuang dari proyek lama | Skor potensi, sosmed, filter, mode Google API, CSV | Proyek ini bukan pencari calon klien |
| Identitas commit | `mnbls`, tanpa atribusi Claude | Permintaan pengguna |

## Riwayat
- **2026-11-22** Repo dibuat dengan menyalin kode `gmaps-leads` lalu mengubahnya.
  - Memeriksa Maps asli: koordinat, kategori, rating, ulasan, dan jam per hari terbaca. Jam butuh klik "Lihat jam lainnya".
  - Menulis `parse.mjs` (19 uji lulus), pembaca baru di `browser.mjs`, `xlsx.mjs` 3 sheet, server job, tampilan baru.
  - Bug diperbaiki: nama jadi "Jam Buka" dan rating kosong (urutan baca vs klik jam).
  - Uji nyata via tampilan web: "coffee" di Mlati Sleman, maks 4/kata kunci → 8 tempat unik, Excel valid, tersimpan otomatis di `hasil/`.

- **2026-11-22 (lanjutan)** Halaman panduan GitHub Pages di `docs/`; `index.html` di luar localhost dialihkan ke `docs/` (Pages pernah diatur dari root dan tombol Cari error `Unexpected token '<'`).
- **2026-11-22 (wilayah)** Pengguna melihat kolom `wilayah` = "ceper" di semua baris padahal ada tempat di luar Ceper/Klaten. Perbaikan: input dipisah **kecamatan** dan **kabupaten/kota**,
  query "kata Kecamatan X Kabupaten", kolom `kecamatan`/`kabupaten` dibaca dari alamat, `sesuai_wilayah`, dan saringan (bisa dimatikan; `--semua` di CLI).
  Uji: "coffee" Ceper Klaten maks 6/kata kunci → 9 diterima (8 Ya, 1 Tidak diketahui), 3 dibuang. Parser: 13 uji lulus.

- **2026-11-22 (login)** Pengguna menunjukkan tangkapan layar Maps di Chrome-nya (login) dengan harga "Rp 25–50 rb" dan layanan lengkap, dan menuntut kolom itu harus terisi.
  Dicoba berurutan: Chrome biasa tanpa login (webdriver false) → tetap "tampilan terbatas"; emulasi HP → **diblokir sistem keamanan** (pengelabuan), dihentikan.
  **Login Google di profil scraper → tampilan penuh muncul.** Pengguna login sendiri lewat Chrome biasa di profil yang sama. Ditambah: `login.bat`/`login.mjs`, deteksi login
  (`meta.login`, catatan di Keterangan, peringatan di tampilan web), pembacaan makan di tempat dari label ikon, kolom "Opsi Layanan (label Maps)" di Data Mentah.
  Bug parser: satuan `k` menangkap huruf K dari "Kedai" (Nuju Coffee jadi 1.000–25.000.000); diperbaiki dengan `\b`, 9 uji harga lulus.
  Uji "coffee" Depok Sleman maks 5/kata kunci: 10 tempat, harga 10/10, makan di tempat 10/10 (semua Ya), jam 10/10.

## Temuan penting: "tampilan terbatas"
Tanpa login, Maps menampilkan "Anda melihat tampilan terbatas dari Google Maps" ke Chrome otomatis (juga di browser pane dan Chrome biasa tanpa login). Di mode itu rentang harga
dan opsi makan di tempat tidak muncul, bahkan untuk restoran besar. Tidak membantu: WebGL/flag GPU, `ignoreDefaultArgs enable-automation`, "Lihat lainnya", klik dari daftar, Chrome tanpa flag otomatisasi.
**Yang membantu: login Google di profil.** Dengan login, header memuat "4,3 (96)·Rp 25–50 rb" dan ikon layanan punya aria-label.

## Keputusan terbuka
- Label ikon untuk "Tidak melayani makan di tempat" belum pernah ditemui (semua kedai kopi uji = Ya). Cari tempat take-away saja (mis. kios kopi) untuk memverifikasi `parseDineIn`.
- Google Places API sebagai cadangan bila login diblokir Google: belum dibangun (butuh API key dan billing).
- Risiko akun: Google bisa membatasi akun yang dipakai otomatisasi; pengguna disarankan memakai akun khusus.

## Berikutnya
- Uji satu kecamatan penuh tanpa "Maks." (perkiraan 10-30 menit) dan cek jumlah hasil vs batas ~120 Maps.
- Bila wilayah padat terpotong: cari per desa.

- **2026-11-22 (Excel ringkas)** Pengguna meminta file Excel diberi nama dari input dan isinya langsung data bersih. Sekarang satu sheet "Data"; nama file jenis-kecamatan-kabupaten.xlsx lewat 
amaFile(),
  dan unduhan memakai header Content-Disposition (sebelumnya nama file unduhan tidak ikut input). Uji: "coffee" Depok Sleman → 1 sheet, 30 kolom, nama file benar.

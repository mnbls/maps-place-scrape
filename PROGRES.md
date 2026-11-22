# Progres maps-place-scrape

Log berurutan dan alasan keputusan. Ringkasan untuk Claude ada di `CLAUDE.md`.

## Tujuan
Daftar tempat (awalnya kafe/kedai kopi) per kecamatan/kabupaten dari Google Maps, berbentuk Excel, sebagai bahan sistem pengambilan
keputusan fuzzy. Metode fuzzy-nya belum ditentukan dan dihitung pengguna sendiri di luar aplikasi.

## Keputusan yang sudah diambil
| Hal | Keputusan | Alasan |
|---|---|---|
| Output | Hanya Excel: Data Mentah, Data Bersih, Keterangan | Mentah untuk bukti di laporan, Bersih berupa angka siap hitung, Keterangan untuk metode |
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

## Temuan penting: "tampilan terbatas"
Maps selalu menampilkan "Anda melihat tampilan terbatas dari Google Maps" ke Chrome otomatis (juga di browser pane). Di mode itu rentang harga
dan opsi makan di tempat tidak muncul, bahkan untuk restoran besar. Sudah dicoba tanpa hasil: WebGL/flag GPU, `ignoreDefaultArgs enable-automation`,
tautan "Lihat lainnya", klik dari daftar (bukan muat ulang). Yang tersisa di tab "Tentang" hanya "Diambil sendiri atau diantar" (bukan makan di tempat).
Akibatnya `harga_min/harga_max` kosong dan `bisa_di_tempat` = "Tidak diketahui" di hampir semua baris.

## Keputusan: harga dan bisa_di_tempat (2026-11-22)
**Dibiarkan kosong** (pilihan pengguna). Kolom tetap ada dan dijelaskan di sheet Keterangan; `bisa_di_tempat` = "Tidak diketahui".
Opsi lain yang ditolak untuk saat ini, bila suatu hari dibutuhkan:
- Hibrida Google Places API hanya untuk dua kolom itu (`priceRange`, `dineIn`): butuh API key dan billing; resmi dan terstruktur.
- Login Google di profil Chrome otomatis: belum terbukti, berisiko akun ditandai; pengguna harus login sendiri.
Jangan menanyakan ulang kecuali pengguna membukanya.

## Berikutnya
- Uji satu kecamatan penuh tanpa "Maks." (perkiraan 10-30 menit) dan cek jumlah hasil vs batas ~120 Maps.
- Bila wilayah padat terpotong: cari per desa.

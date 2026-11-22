# maps-place-scrape

Mengambil daftar tempat dari Google Maps untuk satu wilayah (kecamatan/kabupaten) dan menyimpannya sebagai
file Excel 3 sheet, siap dipakai sebagai bahan analisis (mis. sistem pendukung keputusan).
Isi jenis tempat dan wilayah, lalu unduh Excel-nya. Tidak ada perhitungan di dalam aplikasi.

Mengetik `coffee` atau `kopi` otomatis mencari "coffee shop", "kafe", dan "kedai kopi", menggabungkan hasilnya,
dan membuang duplikat. Jenis lain dicari apa adanya.

Halaman panduan dan tombol unduh: https://mnbls.github.io/maps-place-scrape/ (sumbernya di folder `docs/`).
Halaman itu hanya panduan; aplikasinya tetap dijalankan di komputer sendiri karena butuh server dan Chrome.

## Cara cepat (Windows, tanpa coding)

1. Pasang [Node.js](https://nodejs.org) versi LTS dan pastikan Chrome atau Edge ada di komputer.
2. Di halaman GitHub repo ini, klik **Code > Download ZIP**, lalu ekstrak.
3. Klik dua kali `start.bat`. Pertama kali akan memasang kebutuhan sendiri (1-2 menit), lalu browser terbuka di `http://localhost:3737`.
4. Isi jenis tempat, **kecamatan**, dan **kabupaten/kota** (minimal salah satu), lalu klik **Cari**. Chrome terbuka sendiri, jangan ditutup sampai selesai.
   Tempat yang alamatnya jelas di luar kecamatan/kabupaten itu otomatis dibuang (bisa dimatikan lewat kotak centang).
5. Hasil tersimpan otomatis di folder `hasil/`, dan bisa diunduh lewat tombol **Unduh Excel**.

Satu kecamatan dengan "coffee" memakan sekitar 10-30 menit. Kalau Google meminta verifikasi (CAPTCHA), selesaikan di jendela Chrome.

## Login Google (supaya harga dan "makan di tempat" terisi)

Tanpa login, Maps memberi Chrome otomatis "tampilan terbatas" yang **menyembunyikan rentang harga dan opsi makan di tempat**.
Dengan login, keduanya terbaca (diuji: 9 dari 9 kedai kopi di Depok, Sleman terisi harga dan layanan). Cukup sekali:

1. Klik dua kali **`login.bat`** (atau `node login.mjs`). Chrome biasa terbuka di halaman login Google.
2. **Login sendiri** (sangat disarankan akun khusus, bukan akun utama), lalu **tutup jendela Chrome itu**.
3. Jalankan `start.bat` seperti biasa. Login tersimpan di folder `.browser-profile` (tidak ikut ke GitHub; jangan dibagikan).

Catatan: Google bisa membatasi akun yang dipakai untuk otomatisasi; risikonya ada di pemilik akun. Sheet Keterangan mencatat apakah pengambilan dilakukan
dalam keadaan login, dan tampilan web memberi peringatan bila belum login. Kolom tetap kosong bila pemilik tempat tidak mengisinya di Maps.

## Lewat terminal

```bash
npm install
node server.mjs                                  # lalu buka http://localhost:3737
node scrape.mjs "coffee" --kecamatan=Ceper --kabupaten=Klaten          # langsung ke file Excel di hasil/
node scrape.mjs "salon" --kecamatan=Mlati --kabupaten=Sleman --maks=40  # batasi 40 tempat per kata kunci
node scrape.mjs "coffee" --kabupaten=Klaten --semua                     # satu kabupaten, jangan buang yang di luar wilayah
```

Tanpa `--maks`, semua yang muncul di Maps diambil, dihitung per kata kunci.

## Isi Excel

- **Data Mentah**: teks asli dari Maps (alamat, telepon, website, rating dan jam dalam bentuk teks), untuk bukti.
- **Data Bersih**: `nama_maps, kategori, kecamatan, kabupaten, sesuai_wilayah, harga_min, harga_max, rating, jumlah_ulasan, lat, lng, bisa_di_tempat, buka_24_jam`,
  jam buka dan tutup tiap hari (`senin_buka` ... `minggu_tutup`), `alamat`, `ditemukan_via`, `link_maps`.
  Jam disimpan sebagai angka berformat `jam:menit`; jam tutup di atas 24:00 (mis. 26:00) berarti lewat tengah malam.
- **Keterangan**: tanggal pengambilan, kata kunci, sumber, arti kolom, dan batasan.

## Batasan (jujur)

- **Harga dan `bisa_di_tempat` hanya terisi bila profil Chrome sudah login Google** (lihat bagian login). Tanpa login kolom harga kosong dan
  `bisa_di_tempat` = `Tidak diketahui` (tidak pernah ditebak). `bisa_di_tempat` dibaca dari label ikon di Maps ("Melayani makan di tempat" = Ya);
  label untuk "Tidak" belum pernah ditemui di uji, jadi belum terverifikasi.
- `harga_min`/`harga_max` mengikuti kategori harga Maps (mis. "Rp 25–50 rb" = 25.000–50.000). Kategori termurah ditulis Maps "Rp 1–25.000",
  jadi `harga_min` = 1 berarti batas bawah kategori itu, bukan harga Rp 1.
- Hasil adalah tempat yang tampil di Maps untuk pencarian itu, bukan jaminan seluruh tempat di wilayah. Satu pencarian Maps dibatasi
  sekitar 60-120 hasil; untuk wilayah padat, cari per kecamatan atau desa.
- `kecamatan` dan `kabupaten` dibaca dari **alamat asli** tiap tempat, bukan dari teks yang diketik. `sesuai_wilayah` = Ya / Tidak / Tidak diketahui
  (alamat tanpa kecamatan/kabupaten tidak dibuang). Kecamatan dicocokkan bersama kabupaten, jadi "Depok" di kabupaten lain tidak lolos.
- Sel kosong berarti Maps tidak menampilkan datanya (mis. jam buka yang tidak diisi pemilik).
- Scraping langsung melanggar ketentuan layanan Google Maps. Sebutkan itu di bagian metode bila dipakai di laporan.
- Tampilan Maps bisa berubah; bila ada kolom yang mendadak kosong, selektor di `browser.mjs` perlu disesuaikan.

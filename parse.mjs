// Fungsi murni untuk mengubah teks dari Google Maps menjadi angka. Tidak membuka browser, jadi mudah diuji.

export const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Kata "coffee"/"kopi" diperluas jadi tiga kata kunci; jenis lain dicari apa adanya.
export function expandKeywords(jenis) {
  const j = jenis.trim();
  return /^(coffee|kopi)$/i.test(j) ? ["coffee shop", "kafe", "kedai kopi"] : [j];
}

// "4,8 (713)" -> { rating: 4.8, jumlah_ulasan: 713 }. Titik pada "3.985" adalah pemisah ribuan.
export function parseRating(text) {
  const m = String(text ?? "").match(/(\d[.,]\d)\s*\(\s*([\d.,\s]+)\)/);
  if (!m) return { rating: "", jumlah_ulasan: "" };
  return { rating: Number(m[1].replace(",", ".")), jumlah_ulasan: Number(m[2].replace(/\D/g, "")) };
}

export function parseCoords(url) {
  const s = String(url ?? "");
  const m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : { lat: "", lng: "" };
}

// Kunci unik tempat dari URL Maps, untuk membuang duplikat antar kata kunci.
export function placeKey(url) {
  const s = String(url ?? "");
  return s.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1] ?? s.split("?")[0];
}

const UNIT = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6 };

function rupiah(angka, unit) {
  let s = angka.trim();
  // "1.5 jt" memakai titik sebagai desimal, sedangkan "20.000" memakai titik sebagai ribuan.
  if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  return Math.round(Number(s.replace(",", ".")) * (UNIT[unit?.toLowerCase()] ?? 1));
}

// "Rp 20-40 rb" -> { harga_min: 20000, harga_max: 40000 }. Kosong kalau tidak ada harga.
export function parseHarga(text) {
  const t = String(text ?? "");
  const r = t.match(/Rp\s?([\d.,]+)\s*(rb|ribu|jt|juta|k)?\s*[–—-]\s*(?:Rp\s?)?([\d.,]+)\s*(rb|ribu|jt|juta|k)?/i);
  if (r) {
    return { harga_min: rupiah(r[1], r[2] ?? r[4]), harga_max: rupiah(r[3], r[4] ?? r[2]) };
  }
  const s = t.match(/Rp\s?([\d.,]+)\s*(rb|ribu|jt|juta|k)?/i);
  if (s) {
    const v = rupiah(s[1], s[2]);
    return { harga_min: v, harga_max: v };
  }
  return { harga_min: "", harga_max: "" };
}

const clock = (s) => {
  const m = s.match(/(\d{1,2})[.:](\d{2})/);
  return m ? (Number(m[1]) * 60 + Number(m[2])) / 1440 : NaN;
};

// Jam sebagai pecahan hari (08.00 = 0.3333). Jam tutup lewat tengah malam dihitung di atas 1 (02.00 = 1.0833 = 26:00).
export function parseDay(items) {
  const text = items.join(" ").replace(/\s+/g, " ").trim();
  const kosong = { raw: text, buka: "", tutup: "", h24: false };
  if (!text) return kosong;
  if (/24 jam/i.test(text)) return { raw: "Buka 24 jam", buka: 0, tutup: 1, h24: true };
  if (/^tutup/i.test(text)) return { ...kosong, raw: "Tutup" };
  const ranges = [...text.matchAll(/(\d{1,2}[.:]\d{2})\s*[–—-]\s*(\d{1,2}[.:]\d{2})/g)]
    .map((m) => [clock(m[1]), clock(m[2])])
    .filter(([a, b]) => !Number.isNaN(a) && !Number.isNaN(b));
  if (!ranges.length) return kosong;
  const buka = Math.min(...ranges.map(([a]) => a));
  const tutup = Math.max(...ranges.map(([a, b]) => (b <= a ? b + 1 : b)));
  return { raw: text, buka, tutup, h24: buka === 0 && tutup === 1 };
}

// rows: [{ hari: "Senin", items: ["08.00–23.00"] }, ...]
export function parseHours(rows, fallbackText = "") {
  const perHari = {};
  for (const h of HARI) {
    const row = rows.find((r) => r.hari?.toLowerCase() === h.toLowerCase());
    perHari[h] = row ? parseDay(row.items) : { raw: "", buka: "", tutup: "", h24: false };
  }
  const ada = HARI.filter((h) => perHari[h].raw);
  let buka24 = "";
  if (ada.length) buka24 = ada.every((h) => perHari[h].h24) ? "Ya" : "Tidak";
  else if (/Buka 24 jam/i.test(fallbackText)) buka24 = "Ya";
  const teks = ada.map((h) => `${h} ${perHari[h].raw}`).join("; ");
  return { perHari, buka_24_jam: buka24, jam_teks: teks };
}

// Ya hanya kalau Maps menyebut makan di tempat; selain itu tidak menebak.
export function parseDineIn(text) {
  return /Makan di tempat|Dine-?in/i.test(String(text ?? "")) ? "Ya" : "Tidak diketahui";
}

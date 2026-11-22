import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

export const dir = dirname(fileURLToPath(import.meta.url));
export const HASIL_DIR = join(dir, "hasil");

export function ensureHasilDir() {
  mkdirSync(HASIL_DIR, { recursive: true });
  return HASIL_DIR;
}

export function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

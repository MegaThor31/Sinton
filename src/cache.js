import fs from "node:fs";
import path from "node:path";

export const CACHE_WARN_BYTES = 2 * 1024 ** 3;

function dirSize(dir) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(full);
    } else if (entry.isFile()) {
      try {
        total += fs.statSync(full).size;
      } catch {
        // Archivo en uso o eliminado mientras se medía.
      }
    }
  }
  return total;
}

export function getCacheInfo() {
  const local = process.env.LOCALAPPDATA;
  if (!local) return null;
  const dir = path.join(local, "Spotify", "Data");
  if (!fs.existsSync(dir)) return { dir, bytes: 0 };
  return { dir, bytes: dirSize(dir) };
}

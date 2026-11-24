import fs from "node:fs";
import path from "node:path";
import { readZip } from "./zip.js";
import { readManifest } from "./manifest.js";

export function inspectXpui(spotify) {
  let file = path.join(spotify.paths.appsDir, "xpui.spa");
  let origin = "instalación actual";

  const manifest = readManifest();
  if (manifest) {
    const clean = path.join(manifest.backupDir, "Apps", "xpui.spa");
    if (fs.existsSync(clean)) {
      file = clean;
      origin = "copia limpia";
    }
  }
  if (!fs.existsSync(file)) throw new Error(`No existe xpui.spa: ${file}`);

  const zip = readZip(file);
  const byExt = {};
  for (const e of zip.entries) {
    if (e.name.endsWith("/")) continue;
    const ext = path.extname(e.name).toLowerCase() || "(sin extensión)";
    byExt[ext] = (byExt[ext] || 0) + 1;
  }

  const files = zip.entries.filter((e) => !e.name.endsWith("/"));
  const rootFiles = files.filter((e) => !e.name.includes("/")).map((e) => `${e.name} (${e.size} B)`);
  const biggest = [...files].sort((a, b) => b.size - a.size).slice(0, 15).map((e) => `${e.name} (${e.size} B)`);
  const hasIndex = files.some((e) => e.name === "index.html");
  const indexHtml = hasIndex ? zip.read("index.html").toString("utf8") : null;

  return { file, origin, total: files.length, byExt, rootFiles, biggest, indexHtml };
}

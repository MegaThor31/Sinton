import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getPaths } from "./paths.js";

export function listFilesRecursive(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

export function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function hashDirectory(dir) {
  const hashes = {};
  for (const rel of listFilesRecursive(dir).sort()) {
    hashes[rel.replace(/\\/g, "/")] = await hashFile(path.join(dir, rel));
  }
  return hashes;
}

export function readManifest() {
  const { manifestFile } = getPaths();
  if (!fs.existsSync(manifestFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  } catch {
    throw new Error(`El manifiesto está dañado: ${manifestFile}`);
  }
}

export function writeManifest(manifest) {
  const { manifestFile, sintonDir } = getPaths();
  fs.mkdirSync(sintonDir, { recursive: true });
  const tmp = `${manifestFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, manifestFile);
}

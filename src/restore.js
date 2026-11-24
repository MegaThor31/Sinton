import fs from "node:fs";
import path from "node:path";
import { hashDirectory, readManifest, writeManifest } from "./manifest.js";
import { isSpotifyRunning } from "./process.js";

function toPath(base, rel) {
  return path.join(base, ...rel.split("/"));
}

function pruneEmptyDirs(dir, isRoot = true) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name), false);
  }
  if (!isRoot && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

export async function restoreBackup(spotify) {
  const manifest = readManifest();
  if (!manifest) throw new Error("No hay copia de seguridad. Ejecuta 'sinton backup' primero.");
  if (!spotify.installed || !spotify.hasApps) throw new Error("No se encontró la instalación de Spotify.");
  if (spotify.version !== manifest.spotifyVersion) {
    throw new Error(
      `La copia es de la versión ${manifest.spotifyVersion} y Spotify es ${spotify.version}. No se restaura para no mezclar versiones.`
    );
  }

  const source = path.join(manifest.backupDir, "Apps");
  if (!fs.existsSync(source)) throw new Error(`Falta la carpeta de la copia: ${source}`);
  if (await isSpotifyRunning()) throw new Error("Spotify está abierto. Ciérralo del todo (también en la bandeja) y repite.");

  const expected = manifest.appsHashes;
  const current = await hashDirectory(spotify.paths.appsDir);

  let restored = 0;
  for (const rel of Object.keys(expected)) {
    if (current[rel] === expected[rel]) continue;
    const dest = toPath(spotify.paths.appsDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(toPath(source, rel), dest);
    restored++;
  }

  let removed = 0;
  for (const rel of Object.keys(current)) {
    if (rel in expected) continue;
    fs.rmSync(toPath(spotify.paths.appsDir, rel), { force: true });
    removed++;
  }
  pruneEmptyDirs(spotify.paths.appsDir);

  const after = await hashDirectory(spotify.paths.appsDir);
  const bad = Object.keys(expected).filter((rel) => after[rel] !== expected[rel]);
  if (bad.length > 0) throw new Error(`La verificación falló en: ${bad.join(", ")}`);

  writeManifest({ ...manifest, patched: false });
  return { restored, removed };
}

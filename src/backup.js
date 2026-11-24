import fs from "node:fs";
import path from "node:path";
import { hashDirectory, writeManifest } from "./manifest.js";

export async function createBackup(spotify, { force = false } = {}) {
  if (!spotify.installed) {
    throw new Error("No se encontró Spotify de escritorio.");
  }
  if (!spotify.hasApps) {
    throw new Error(`No existe la carpeta Apps: ${spotify.paths.appsDir}`);
  }
  if (!spotify.version) {
    throw new Error("No se pudo leer la versión de Spotify.");
  }

  const dest = path.join(spotify.paths.backupsDir, spotify.version);
  if (fs.existsSync(dest)) {
    if (!force) {
      throw new Error(`Ya existe una copia de la versión ${spotify.version}. Usa --force para reemplazarla.`);
    }
    fs.rmSync(dest, { recursive: true, force: true });
  }

  fs.mkdirSync(dest, { recursive: true });
  const appsBackup = path.join(dest, "Apps");

  try {
    fs.cpSync(spotify.paths.appsDir, appsBackup, { recursive: true });
    const hashes = await hashDirectory(appsBackup);

    writeManifest({
      schema: 1,
      spotifyVersion: spotify.version,
      createdAt: new Date().toISOString(),
      backupDir: dest,
      appsHashes: hashes,
      patched: false,
    });

    return { dest, fileCount: Object.keys(hashes).length };
  } catch (err) {
    fs.rmSync(dest, { recursive: true, force: true });
    throw err;
  }
}

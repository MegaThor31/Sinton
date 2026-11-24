import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { detectSpotify } from "./spotify.js";
import { createBackup } from "./backup.js";
import { applyPatch } from "./apply.js";
import { readManifest } from "./manifest.js";
import { readZip } from "./zip.js";
import { isSpotifyRunning } from "./process.js";
import { info, error } from "./logger.js";

const MARKER = "<!-- sinton -->";

function spaIsPatched(file) {
  const zip = readZip(file);
  if (!zip.entries.some((e) => e.name === "index.html")) return false;
  return zip.read("index.html").toString("utf8").includes(MARKER);
}

export async function ensurePatched() {
  const sp = await detectSpotify();
  if (!sp.installed || !sp.hasApps) throw new Error("No se encontró Spotify de escritorio.");
  if (!sp.version) throw new Error("No se pudo leer la versión de Spotify.");

  const liveSpa = path.join(sp.paths.appsDir, "xpui.spa");
  if (!fs.existsSync(liveSpa)) throw new Error("No existe xpui.spa en la instalación.");

  const manifest = readManifest();
  const versionChanged = !manifest || manifest.spotifyVersion !== sp.version;
  const patched = spaIsPatched(liveSpa);

  if (!versionChanged && patched) return { action: "ok", version: sp.version };
  if (await isSpotifyRunning()) return { action: "skipped-running", version: sp.version };

  if (versionChanged) {
    if (patched) {
      throw new Error(
        "Spotify cambió de versión pero xpui.spa ya contiene el parche de Sinton, así que no hay una copia limpia. Reinstala Spotify y repite."
      );
    }
    const previous = manifest ? manifest.spotifyVersion : "ninguna";
    info(`Versión nueva de Spotify (${previous} -> ${sp.version}). Creando copia limpia.`);
    await createBackup(sp, { force: true });
    await applyPatch(sp);
    return { action: "updated", version: sp.version };
  }

  info("El parche no está aplicado. Reaplicando.");
  await applyPatch(sp);
  return { action: "reapplied", version: sp.version };
}

function startSpotify(exe) {
  if (!fs.existsSync(exe)) {
    error(`No se encontró Spotify.exe: ${exe}`);
    return;
  }
  const child = spawn(exe, [], { detached: true, stdio: "ignore" });
  child.on("error", (err) => error(`No se pudo abrir Spotify: ${err.message}`));
  child.unref();
}

export async function launch({ checkOnly = false } = {}) {
  let failed = false;

  try {
    const result = await ensurePatched();
    info(`Sinton: ${result.action} (Spotify ${result.version})`);
  } catch (err) {
    failed = true;
    error(`No se pudo preparar Sinton, se abre Spotify sin cambios: ${err instanceof Error ? err.message : err}`);
  }

  if (!checkOnly) {
    const sp = await detectSpotify();
    startSpotify(sp.paths.spotifyExe);
  }
  return failed ? 1 : 0;
}

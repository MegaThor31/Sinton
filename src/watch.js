import fs from "node:fs";
import path from "node:path";
import { detectSpotify } from "./spotify.js";
import { ensurePatched } from "./launch.js";
import { info, error } from "./logger.js";

const POLL_MS = 30_000;
const RETRY_MS = 5 * 60_000;

function signature(paths) {
  const files = [paths.spotifyExe, path.join(paths.appsDir, "xpui.spa")];
  return files
    .map((f) => {
      try {
        const s = fs.statSync(f);
        return `${s.size}:${Math.round(s.mtimeMs)}`;
      } catch {
        return "missing";
      }
    })
    .join("|");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function watch() {
  const sp = await detectSpotify();
  if (!sp.installed) throw new Error("No se encontró Spotify de escritorio.");

  info("Vigilante iniciado.");
  let previous = signature(sp.paths);
  let handled = null;
  let retryAt = 0;
  let waitingLogged = false;

  for (;;) {
    const current = signature(sp.paths);
    const stable = current === previous;
    previous = current;

    if (stable && current !== handled && Date.now() >= retryAt) {
      try {
        const result = await ensurePatched();
        if (result.action === "skipped-running") {
          if (!waitingLogged) {
            info("Spotify necesita reparación y está abierto. Se repara al cerrarlo.");
            waitingLogged = true;
          }
        } else {
          waitingLogged = false;
          if (result.action !== "ok") info(`Vigilante: ${result.action} (Spotify ${result.version})`);
          handled = signature(sp.paths);
        }
      } catch (err) {
        error(`Vigilante: ${err instanceof Error ? err.message : err}. Se reintenta en 5 minutos.`);
        retryAt = Date.now() + RETRY_MS;
      }
    }

    await sleep(POLL_MS);
  }
}

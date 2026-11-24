import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function isSpotifyRunning() {
  try {
    const { stdout } = await execFileAsync(
      "tasklist",
      ["/FI", "IMAGENAME eq Spotify.exe", "/NH"],
      { windowsHide: true, timeout: 10000 }
    );
    return stdout.toLowerCase().includes("spotify.exe");
  } catch (err) {
    throw new Error(`No se pudo comprobar si Spotify está abierto: ${err.message}`);
  }
}

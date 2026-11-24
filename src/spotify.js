import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPaths } from "./paths.js";

const execFileAsync = promisify(execFile);

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

async function readExeVersion(exePath) {
  const script = `(Get-Item -LiteralPath '${exePath.replace(/'/g, "''")}').VersionInfo.ProductVersion`;
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: 15000, windowsHide: true }
    );
    const version = stdout.trim();
    return version || null;
  } catch {
    return null;
  }
}

export async function detectSpotify() {
  const paths = getPaths();
  const result = {
    paths,
    installed: exists(paths.spotifyExe),
    hasApps: exists(paths.appsDir),
    version: null,
  };

  if (result.installed) {
    result.version = await readExeVersion(paths.spotifyExe);
  }
  return result;
}

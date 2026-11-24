import path from "node:path";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable de entorno ${name} no está definida. Sinton solo funciona en Windows.`);
  }
  return value;
}

export function getPaths() {
  const appData = requireEnv("APPDATA");
  const spotifyDir = path.join(appData, "Spotify");
  const sintonDir = path.join(appData, "Sinton");

  return {
    spotifyDir,
    spotifyExe: path.join(spotifyDir, "Spotify.exe"),
    appsDir: path.join(spotifyDir, "Apps"),
    sintonDir,
    backupsDir: path.join(sintonDir, "backups"),
    manifestFile: path.join(sintonDir, "manifest.json"),
    logFile: path.join(sintonDir, "sinton.log"),
  };
}

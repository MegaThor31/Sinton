import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPaths } from "./paths.js";
import { runPowerShell, psQuote } from "./winutil.js";
import { info, warn } from "./logger.js";

const SHORTCUT_NAME = "Spotify (Sinton).lnk";
const TASK_NAME = "Sinton";

function vbsPaths() {
  const { sintonDir } = getPaths();
  return {
    launch: path.join(sintonDir, "sinton-launch.vbs"),
    check: path.join(sintonDir, "sinton-check.vbs"),
    watch: path.join(sintonDir, "sinton-watch.vbs"),
  };
}

function writeVbs(file, args) {
  const cli = path.resolve(fileURLToPath(new URL("../bin/sinton.js", import.meta.url)));
  const node = process.execPath;
  const text = `CreateObject("WScript.Shell").Run """${node}"" ""${cli}"" ${args}", 0, False\r\n`;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]));
}

const SHORTCUT_DIRS = `@([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft/Windows/Start Menu/Programs'))`;

const REMOVE_SHORTCUTS = `
foreach ($dir in ${SHORTCUT_DIRS}) {
  Remove-Item -LiteralPath (Join-Path $dir '${SHORTCUT_NAME}') -Force -ErrorAction SilentlyContinue
}
`;

export async function install() {
  const paths = getPaths();
  if (!fs.existsSync(paths.spotifyExe)) throw new Error("No se encontró Spotify de escritorio.");

  fs.mkdirSync(paths.sintonDir, { recursive: true });
  const vbs = vbsPaths();
  writeVbs(vbs.launch, "launch");
  writeVbs(vbs.check, "launch --check-only");
  writeVbs(vbs.watch, "watch");

  await runPowerShell(REMOVE_SHORTCUTS);

  await runPowerShell(`
Stop-ScheduledTask -TaskName '${TASK_NAME}' -ErrorAction SilentlyContinue
$a = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '"${psQuote(vbs.watch)}"'
$t = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName '${TASK_NAME}' -Action $a -Trigger $t -Settings $s -Force | Out-Null
Start-ScheduledTask -TaskName '${TASK_NAME}'
`);
  info("Vigilante instalado y en marcha: se inicia con tu sesión y reaplica Sinton tras actualizaciones de Spotify.");
  info("Usa el icono normal de Spotify. Para desactivarlo: sinton uninstall");
}

export async function uninstall() {
  const vbs = vbsPaths();

  try {
    await runPowerShell(`
Stop-ScheduledTask -TaskName '${TASK_NAME}' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName '${TASK_NAME}' -Confirm:$false -ErrorAction SilentlyContinue
${REMOVE_SHORTCUTS}
`);
  } catch (err) {
    warn(`No se pudo limpiar del todo: ${err.message}`);
  }

  for (const f of Object.values(vbs)) fs.rmSync(f, { force: true });
  info("Vigilante y accesos directos eliminados. Spotify sigue como esté (usa 'sinton restore' para dejarlo limpio).");
}

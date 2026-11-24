import fs from "node:fs";
import { detectSpotify } from "./spotify.js";
import { createBackup } from "./backup.js";
import { readManifest } from "./manifest.js";
import { restoreBackup } from "./restore.js";
import { applyPatch } from "./apply.js";
import { inspectXpui } from "./inspect.js";
import { launch } from "./launch.js";
import { install, uninstall } from "./install.js";
import { runBench } from "./bench.js";
import { watch } from "./watch.js";
import { getCacheInfo, CACHE_WARN_BYTES } from "./cache.js";
import { readConfig, setEnabled, discoverPlugins, THEMES } from "./config.js";
import { info, warn, error } from "./logger.js";

const HELP = `Sinton 0.1.0

Uso: sinton <comando> [opciones]

Comandos:
  doctor              Comprueba la instalación de Spotify y el estado de Sinton
  backup [--force]    Crea una copia limpia de la carpeta Apps
  inspect             Muestra el contenido de xpui.spa (solo lectura)
  apply               Inyecta Sinton en Spotify (con Spotify cerrado)
  restore             Devuelve Apps al estado de la copia limpia
  list                Muestra temas y plugins con su estado (activo/inactivo)
  theme <id> on|off   Activa o desactiva un tema (requiere 'apply' después)
  plugin <id> on|off  Activa o desactiva un plugin (requiere 'apply' después)
  launch [--check-only]  Repara el parche si hace falta y abre Spotify
  watch               Vigilante: reaplica Sinton tras actualizaciones (lo usa la tarea)
  install             Instala el vigilante como tarea de inicio de sesión
  uninstall           Elimina el vigilante y los accesos directos
  bench [--seconds N] Mide arranque, RAM y CPU de Spotify (por defecto 60 s)
  help                Muestra esta ayuda
`;

async function doctor() {
  const sp = await detectSpotify();
  let problems = 0;

  info(`Node: ${process.version}`);
  info(`Carpeta de Spotify: ${sp.paths.spotifyDir}`);

  if (!sp.installed) {
    error("No se encontró Spotify.exe. Instala Spotify de escritorio desde la web oficial.");
    return 1;
  }
  info("Spotify.exe: encontrado");

  if (sp.version) {
    info(`Versión de Spotify: ${sp.version}`);
  } else {
    warn("No se pudo leer la versión de Spotify.");
    problems++;
  }

  if (sp.hasApps) {
    info("Carpeta Apps: encontrada");
  } else {
    warn("No existe la carpeta Apps.");
    problems++;
  }

  let manifest = null;
  try {
    manifest = readManifest();
  } catch (err) {
    error(err.message);
    problems++;
  }

  if (!manifest) {
    info("Copia de seguridad: ninguna. Ejecuta 'sinton backup'.");
  } else {
    const backupExists = fs.existsSync(manifest.backupDir);
    info(`Copia de seguridad: versión ${manifest.spotifyVersion} (${manifest.createdAt})`);
    info(`Estado: ${manifest.patched ? "parcheado" : "limpio"}`);
    if (!backupExists) {
      warn(`Falta la carpeta de la copia: ${manifest.backupDir}`);
      problems++;
    }
    if (sp.version && manifest.spotifyVersion !== sp.version) {
      warn(`Spotify se actualizó (${manifest.spotifyVersion} -> ${sp.version}). El vigilante lo reparará al cerrar Spotify, o ejecuta 'sinton launch'.`);
      problems++;
    }
  }

  const cache = getCacheInfo();
  if (cache) {
    const mb = (cache.bytes / 1048576).toFixed(1);
    info(`Caché de Spotify (${cache.dir}): ${mb} MB`);
    if (cache.bytes > CACHE_WARN_BYTES) {
      warn("La caché supera 2 GB. Pulsa 'Borrar caché' en Ajustes > Almacenamiento de Spotify.");
    }
  }

  info(problems === 0 ? "Todo correcto." : `Se detectaron ${problems} problema(s).`);
  return problems === 0 ? 0 : 1;
}

async function backup(args) {
  const force = args.includes("--force");
  const sp = await detectSpotify();
  const result = await createBackup(sp, { force });
  info(`Copia creada en: ${result.dest}`);
  info(`Archivos registrados en el manifiesto: ${result.fileCount}`);
  return 0;
}

async function inspect() {
  const sp = await detectSpotify();
  if (!sp.installed) throw new Error("No se encontró Spotify de escritorio.");
  const r = inspectXpui(sp);

  info(`Archivo: ${r.file} (${r.origin})`);
  info(`Archivos dentro de xpui.spa: ${r.total}`);
  info(`Por extensión: ${JSON.stringify(r.byExt)}`);
  info("Archivos en la raíz:");
  for (const f of r.rootFiles) info(`  ${f}`);
  info("Los 15 más grandes:");
  for (const f of r.biggest) info(`  ${f}`);

  if (r.indexHtml === null) {
    warn("No hay index.html en la raíz de xpui.spa.");
  } else {
    console.log("\n--- index.html (primeros 4000 caracteres) ---");
    console.log(r.indexHtml.slice(0, 4000));
  }
  return 0;
}

async function apply() {
  const sp = await detectSpotify();
  const r = await applyPatch(sp);
  info(`Sinton aplicado. Archivos en el nuevo xpui.spa: ${r.count}.`);
  info(`Tema Sinton Bloom: ${r.theme ? `activo (${r.recolored} colores verdes sustituidos)` : "inactivo"}. Plugins activos: ${r.plugins}.`);
  info("Abre Spotify. Si algo falla: sinton restore");
  return 0;
}

async function restore() {
  const sp = await detectSpotify();
  const r = await restoreBackup(sp);
  info(`Restauración completada. Archivos restaurados: ${r.restored}. Archivos extra eliminados: ${r.removed}.`);
  warn("Si el vigilante está instalado, volverá a aplicar Sinton en menos de un minuto. Para evitarlo, ejecuta antes 'sinton uninstall'.");
  return 0;
}

function list() {
  const config = readConfig();
  info("Temas:");
  for (const [id, theme] of Object.entries(THEMES)) {
    info(`  ${id} - ${theme.name}: ${config.themes[id] !== false ? "activo" : "inactivo"}`);
  }
  const plugins = discoverPlugins(config);
  info("Plugins:");
  if (plugins.length === 0) info("  (ninguno; añade carpetas en plugins/)");
  for (const p of plugins) {
    info(`  ${p.id} - ${p.name} [${p.type}]: ${p.enabled ? "activo" : "inactivo"}`);
  }
  return 0;
}

function toggle(kind, args) {
  const [id, state] = args;
  if (!id || (state !== "on" && state !== "off")) {
    throw new Error(`Uso: sinton ${kind} <id> on|off`);
  }
  setEnabled(kind, id, state === "on");
  info(`${kind} '${id}': ${state === "on" ? "activado" : "desactivado"}. Ejecuta 'sinton apply' con Spotify cerrado para aplicarlo.`);
  return 0;
}

async function bench(args) {
  const i = args.indexOf("--seconds");
  const seconds = i >= 0 ? Number.parseInt(args[i + 1], 10) : 60;
  info(`Midiendo Spotify durante ${seconds} s después de abrir la ventana. No lo cierres.`);
  const r = await runBench(seconds);
  info(`Tiempo hasta que aparece la ventana: ${r.timeToWindowSec === null ? "no apareció en 90 s" : `${r.timeToWindowSec} s`}`);
  info(`RAM pico: ${r.ramPeakMB} MB. RAM final: ${r.ramEndMB} MB. Procesos: ${r.processes}`);
  info(`CPU consumida durante la medición: ${r.cpuSeconds} s`);
  info("Spotify sigue abierto. Ciérralo del todo antes de repetir la medición.");
  return 0;
}

export async function run(argv) {
  const [command = "help", ...args] = argv;

  try {
    switch (command) {
      case "doctor":
        return await doctor();
      case "backup":
        return await backup(args);
      case "inspect":
        return await inspect();
      case "apply":
        return await apply();
      case "restore":
        return await restore();
      case "list":
        return list();
      case "theme":
        return toggle("theme", args);
      case "plugin":
        return toggle("plugin", args);
      case "launch":
        return await launch({ checkOnly: args.includes("--check-only") });
      case "watch":
        await watch();
        return 0;
      case "install":
        await install();
        return 0;
      case "uninstall":
        await uninstall();
        return 0;
      case "bench":
        return await bench(args);
      case "help":
      case "--help":
      case "-h":
        console.log(HELP);
        return 0;
      default:
        error(`Comando desconocido: ${command}`);
        console.log(HELP);
        return 1;
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

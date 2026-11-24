import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readZip } from "./zip.js";
import { writeZip } from "./zipwrite.js";
import { readManifest, writeManifest } from "./manifest.js";
import { isSpotifyRunning } from "./process.js";
import { recolorGreen, recolorSurfaces } from "./recolor.js";
import { readConfig, discoverPlugins, THEMES } from "./config.js";

const MARKER = "<!-- sinton -->";
const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
// Núcleo compartido por los plugins (window.SintonAPI), en orden de carga.
const CORE_FILES = ["platform.js", "player.js", "data.js", "lyrics.js", "ui.js", "index.js"];

function headTag(theme) {
  const links = theme
    ? `<link href="/sinton/sinton.css" rel="stylesheet"><link href="/sinton/sinton-motion.css" rel="stylesheet"><script src="/sinton/sinton-colors.js"></script>`
    : "";
  return `${MARKER}${links}`;
}

function bodyTag({ lenis, theme }) {
  const scripts = [];
  if (theme && lenis) scripts.push(`<script defer src="/sinton/lenis.min.js"></script>`);
  if (theme) scripts.push(`<script defer src="/sinton/sinton-motion.js"></script>`);
  for (const file of CORE_FILES) scripts.push(`<script defer src="/sinton/core/${file}"></script>`);
  scripts.push(`<script defer src="/sinton/state.js"></script>`);
  scripts.push(`<script defer src="/sinton/sinton.js"></script>`);
  return scripts.join("");
}

export function patchIndexHtml(html, { lenis = false, theme = true } = {}) {
  if (html.includes(MARKER)) return html;
  if (!html.includes("</head>") || !html.includes("</body>")) {
    throw new Error("index.html no tiene la estructura esperada.");
  }
  return html
    .replace("</head>", `${headTag(theme)}</head>`)
    .replace("</body>", `${bodyTag({ lenis, theme })}</body>`);
}

function listFiles(dir, base = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(dir, base), { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(dir, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

export async function applyPatch(spotify) {
  const manifest = readManifest();
  if (!manifest) throw new Error("No hay copia de seguridad. Ejecuta 'sinton backup' primero.");
  if (!spotify.installed || !spotify.hasApps) throw new Error("No se encontró la instalación de Spotify.");
  if (spotify.version !== manifest.spotifyVersion) {
    throw new Error(
      `La copia es de la versión ${manifest.spotifyVersion} y Spotify es ${spotify.version}. Haz 'sinton backup --force' con Spotify limpio.`
    );
  }

  const cleanSpa = path.join(manifest.backupDir, "Apps", "xpui.spa");
  if (!fs.existsSync(cleanSpa)) throw new Error(`Falta xpui.spa en la copia: ${cleanSpa}`);

  const config = readConfig();
  const themeOn = config.themes.bloom !== false;
  const plugins = discoverPlugins(config);

  const cssSrc = path.join(ASSETS_DIR, "sinton.css");
  const jsSrc = path.join(ASSETS_DIR, "sinton.js");
  const motionCssSrc = path.join(ASSETS_DIR, "sinton-motion.css");
  const motionJsSrc = path.join(ASSETS_DIR, "sinton-motion.js");
  const colorsSrc = path.join(ASSETS_DIR, "sinton-colors.js");
  const lenisSrc = path.join(ASSETS_DIR, "vendor", "lenis.min.js");
  const coreSrc = CORE_FILES.map((file) => path.join(ASSETS_DIR, "core", file));
  const required = themeOn ? [cssSrc, jsSrc, motionCssSrc, motionJsSrc, colorsSrc, ...coreSrc] : [jsSrc, ...coreSrc];
  for (const f of required) {
    if (!fs.existsSync(f)) throw new Error(`Falta el recurso: ${f}`);
  }
  const hasLenis = themeOn && fs.existsSync(lenisSrc);

  if (await isSpotifyRunning()) {
    throw new Error("Spotify está abierto. Ciérralo del todo (también en la bandeja) y repite.");
  }

  const liveSpa = path.join(spotify.paths.appsDir, "xpui.spa");
  const tmpSpa = path.join(spotify.paths.appsDir, "xpui.spa.sinton-tmp");
  fs.rmSync(tmpSpa, { force: true });
  fs.rmSync(path.join(spotify.paths.appsDir, "xpui"), { recursive: true, force: true });
  fs.rmSync(path.join(spotify.paths.appsDir, "xpui.sinton-tmp"), { recursive: true, force: true });

  try {
    const zip = readZip(cleanSpa);
    const files = [];
    let recolored = 0;

    for (const entry of zip.entries) {
      if (entry.name.endsWith("/")) continue;
      let data = zip.read(entry.name);
      if (entry.name === "index.html") {
        data = Buffer.from(patchIndexHtml(data.toString("utf8"), { lenis: hasLenis, theme: themeOn }), "utf8");
      } else if (themeOn && /\.(css|js)$/i.test(entry.name) && !entry.name.startsWith("sinton/")) {
        const isCss = /\.css$/i.test(entry.name);
        let result = recolorGreen(data.toString("utf8"), { css: isCss });
        if (isCss) {
          const surfaces = recolorSurfaces(result.text);
          result = { text: surfaces.text, count: result.count + surfaces.count };
        }
        if (result.count > 0) {
          data = Buffer.from(result.text, "utf8");
          recolored += result.count;
        }
      }
      files.push({ name: entry.name, data, store: entry.method === 0 });
    }

    if (!files.some((f) => f.name === "index.html")) {
      throw new Error("xpui.spa no contiene index.html.");
    }

    const state = {
      spotifyVersion: spotify.version,
      generatedAt: new Date().toISOString(),
      themes: Object.entries(THEMES).map(([id, theme]) => {
        const enabled = config.themes[id] !== false;
        return {
          id,
          name: theme.name,
          description: theme.description,
          enabled,
          parts: enabled ? [...theme.parts, `${recolored} colores verdes sustituidos`] : [...theme.parts]
        };
      }),
      plugins: plugins.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        scripts: p.scripts,
        styles: p.styles,
        enabled: p.enabled
      }))
    };
    const stateJs = `window.__SINTON_STATE__=${JSON.stringify(state).replace(/</g, "\\u003c")};`;

    files.push({ name: "sinton/sinton.js", data: fs.readFileSync(jsSrc), store: false });
    CORE_FILES.forEach((file, index) => {
      files.push({ name: `sinton/core/${file}`, data: fs.readFileSync(coreSrc[index]), store: false });
    });
    files.push({ name: "sinton/state.js", data: Buffer.from(stateJs, "utf8"), store: false });
    if (themeOn) {
      files.push({ name: "sinton/sinton.css", data: fs.readFileSync(cssSrc), store: false });
      files.push({ name: "sinton/sinton-motion.css", data: fs.readFileSync(motionCssSrc), store: false });
      files.push({ name: "sinton/sinton-motion.js", data: fs.readFileSync(motionJsSrc), store: false });
      files.push({ name: "sinton/sinton-colors.js", data: fs.readFileSync(colorsSrc), store: false });
      if (hasLenis) {
        files.push({ name: "sinton/lenis.min.js", data: fs.readFileSync(lenisSrc), store: false });
      }
    }
    for (const plugin of plugins) {
      if (!plugin.enabled) continue;
      for (const rel of listFiles(plugin.folder)) {
        files.push({
          name: `sinton/plugins/${plugin.id}/${rel}`,
          data: fs.readFileSync(path.join(plugin.folder, ...rel.split("/"))),
          store: false
        });
      }
    }

    writeZip(tmpSpa, files);

    const check = readZip(tmpSpa);
    if (check.entries.length !== files.length) {
      throw new Error("El zip generado no coincide con lo esperado.");
    }
    if (!check.read("index.html").toString("utf8").includes(MARKER)) {
      throw new Error("El index.html generado no contiene la marca de Sinton.");
    }

    fs.renameSync(tmpSpa, liveSpa);

    writeManifest({
      ...manifest,
      patched: true,
      patchedAt: new Date().toISOString(),
      patchMode: "spa",
    });

    return {
      count: files.length,
      dir: liveSpa,
      recolored,
      theme: themeOn,
      plugins: plugins.filter((p) => p.enabled).length
    };
  } catch (err) {
    fs.rmSync(tmpSpa, { force: true });
    throw err;
  }
}

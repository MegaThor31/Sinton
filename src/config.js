import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { warn } from "./logger.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = path.join(ROOT, "sinton.config.json");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export const THEMES = {
  bloom: {
    name: "Sinton Bloom",
    description: "Tema inspirado en Bloom con colores y fondo personalizables, animaciones y scroll suave.",
    parts: ["Colores y fondo personalizables", "Animaciones (Sinton Motion)", "Scroll suave (Lenis)", "Verde de Spotify adaptable"]
  }
};

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readConfig() {
  let raw = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch (err) {
      throw new Error(`sinton.config.json no es JSON válido: ${err.message}`);
    }
  }
  if (!isObject(raw)) raw = {};
  return {
    themes: isObject(raw.themes) ? { ...raw.themes } : {},
    plugins: isObject(raw.plugins) ? { ...raw.plugins } : {}
  };
}

function writeConfig(config) {
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, CONFIG_FILE);
}

// Valida que cada ruta sea un archivo existente dentro de la carpeta del plugin.
function resolveFiles(id, folder, list, field) {
  const out = [];
  for (const entry of list) {
    if (typeof entry !== "string" || !entry) {
      warn(`Plugin '${id}' ignorado: '${field}' debe contener rutas de archivo.`);
      return null;
    }
    const normalized = path.normalize(entry);
    if (path.isAbsolute(normalized) || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
      warn(`Plugin '${id}' ignorado: '${entry}' debe estar dentro de su carpeta.`);
      return null;
    }
    if (!fs.existsSync(path.join(folder, normalized))) {
      warn(`Plugin '${id}' ignorado: no existe ${entry}.`);
      return null;
    }
    out.push(normalized.split(path.sep).join("/"));
  }
  return out;
}

export function discoverPlugins(config) {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  const result = [];
  for (const entry of fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    if (!ID_RE.test(id)) {
      warn(`Plugin '${id}' ignorado: el id solo admite minúsculas, números y guiones.`);
      continue;
    }
    const folder = path.join(PLUGINS_DIR, id);
    const manifestPath = path.join(folder, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      warn(`Plugin '${id}' ignorado: falta manifest.json.`);
      continue;
    }
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      warn(`Plugin '${id}' ignorado: manifest.json no es válido (${err.message}).`);
      continue;
    }
    if (!isObject(manifest)) {
      warn(`Plugin '${id}' ignorado: manifest.json debe ser un objeto.`);
      continue;
    }
    const listed = Array.isArray(manifest.scripts) && manifest.scripts.length > 0
      ? manifest.scripts
      : [typeof manifest.main === "string" && manifest.main ? manifest.main : "index.js"];
    const scripts = resolveFiles(id, folder, listed, "scripts");
    const styles = resolveFiles(id, folder, Array.isArray(manifest.styles) ? manifest.styles : [], "styles");
    if (!scripts || !styles) continue;
    result.push({
      id,
      name: String(manifest.name || id),
      type: manifest.type === "app" ? "app" : "extension",
      description: String(manifest.description || ""),
      scripts,
      styles,
      folder,
      enabled: config.plugins[id] !== false
    });
  }
  return result;
}

export function setEnabled(kind, id, enabled) {
  const config = readConfig();
  if (kind === "theme") {
    if (!Object.prototype.hasOwnProperty.call(THEMES, id)) {
      throw new Error(`Tema desconocido '${id}'. Temas disponibles: ${Object.keys(THEMES).join(", ")}.`);
    }
    config.themes[id] = enabled;
  } else if (kind === "plugin") {
    if (!discoverPlugins(config).some((plugin) => plugin.id === id)) {
      throw new Error(`Plugin desconocido '${id}'. Usa 'sinton list' para ver los disponibles.`);
    }
    config.plugins[id] = enabled;
  } else {
    throw new Error(`Tipo desconocido '${kind}'.`);
  }
  writeConfig(config);
}

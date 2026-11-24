// Carga scripts de navegador (IIFE) en un contexto aislado que hace de `window`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadScripts(files) {
  const sandbox = { console, setTimeout, clearTimeout, URLSearchParams, AbortController };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  }
  return sandbox;
}

export function pluginLogic(id) {
  return loadScripts(["plugins/" + id + "/src/logic.js"]).SintonParts[id].logic;
}

// Generador determinista (mulberry32) para pruebas reproducibles.
export function seeded(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Los objetos creados dentro del contexto tienen otros prototipos: se copian para poder compararlos.
export function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

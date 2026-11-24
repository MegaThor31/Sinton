import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest } from '../src/manifest.js';
import { detectSpotify } from '../src/spotify.js';
import { readZip } from '../src/zip.js';

const revision = 'd095d83daa2cc1efd4f5d9cf7dc2687dcc204d6d';
const base = `https://raw.githubusercontent.com/spicetify/cli/${revision}/`;
const root = fileURLToPath(new URL('../', import.meta.url));
const cssPath = path.join(root, 'assets', 'sinton.css');
const sourcePath = path.join(root, 'assets', 'sinton.bloom-unmapped.css');
const reportPath = path.join(root, 'assets', 'bloom-compat-report.json');
const marker = '/* ThemeThor native selector compilation v1 */';
const temporary = `${cssPath}.${process.pid}.tmp`;

async function fetchText(name, limit) {
  const response = await fetch(new URL(name, base), {
    signal: AbortSignal.timeout(30000), redirect: 'error'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} al descargar ${name}`);
  if (!response.body) throw new Error(`Respuesta vacía para ${name}`);
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error(`${name} supera el límite de tamaño`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function createNativeIndex(zip) {
  const tokens = new Set();
  let bytes = 0;
  let files = 0;
  for (const entry of zip.entries) {
    if (!entry.name.endsWith('.css') || entry.name.startsWith('sinton/')) continue;
    const data = zip.read(entry.name);
    bytes += data.length;
    if (bytes > 48 * 1024 * 1024) throw new Error('CSS nativo demasiado grande para esta revisión del compilador');
    for (const match of data.toString('utf8').matchAll(/[A-Za-z0-9_-]{6,}/g)) tokens.add(match[0]);
    files++;
  }
  if (!files) throw new Error('La copia limpia no contiene hojas CSS que se puedan examinar');
  return { tokens, files };
}

function compile(source, aliases, nativeTokens) {
  const seen = new Set();
  const converted = new Set();
  const native = new Set();
  const unmatched = new Set();
  const token = /\/\*[\s\S]*?\*\/|url\(\s*(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[^)]*)\s*\)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\.(-?[_a-zA-Z][\w-]*)/gi;
  const css = source.replace(token, (whole, name) => {
    if (!name) return whole;
    seen.add(name);
    const hashes = aliases.get(name);
    if (hashes?.size) {
      converted.add(name);
      return `:is(.${name},${[...hashes].sort().map((hash) => `[class~="${hash}"]`).join(',')})`;
    }
    if (nativeTokens.has(name)) native.add(name);
    else if (/^(main-|x-|view-|artist-|lyrics-|collection-)/.test(name)) unmatched.add(name);
    return whole;
  });
  return { css, seen: seen.size, converted: [...converted].sort(), native: [...native].sort(), unmatched: [...unmatched].sort() };
}

async function main() {
  const manifest = readManifest();
  if (!manifest) throw new Error('Falta la copia limpia de Sinton');
  const spotify = await detectSpotify();
  if (!spotify.version || spotify.version !== manifest.spotifyVersion) {
    throw new Error('La versión de Spotify no coincide con la copia limpia. No se cambia el tema.');
  }
  const current = await fs.readFile(cssPath, 'utf8');
  const source = current.startsWith(marker) ? await fs.readFile(sourcePath, 'utf8') : current;
  if (!source.includes('ThemeThor: Bloom original')) {
    throw new Error('Primero genera Bloom con node scripts/build-themethor.js');
  }
  const zip = readZip(path.join(manifest.backupDir, 'Apps', 'xpui.spa'));
  const { tokens, files } = createNativeIndex(zip);
  console.log(`Spotify ${spotify.version}: examinadas ${files} hojas CSS de la copia limpia.`);
  const [mapText, license] = await Promise.all([
    fetchText('css-map.json', 8 * 1024 * 1024),
    fetchText('LICENSE', 256 * 1024)
  ]);
  const map = JSON.parse(mapText);
  if (!map || Array.isArray(map) || typeof map !== 'object') throw new Error('Formato de mapa inválido');
  const aliases = new Map();
  for (const [hash, readable] of Object.entries(map)) {
    if (!/^[-_A-Za-z0-9]{1,128}$/.test(hash) || typeof readable !== 'string' || !/^[-_A-Za-z][-_A-Za-z0-9]*$/.test(readable)) {
      throw new Error('El mapa contiene un nombre de clase no soportado');
    }
    if (!tokens.has(hash)) continue;
    if (!aliases.has(readable)) aliases.set(readable, new Set());
    aliases.get(readable).add(hash);
  }
  const result = compile(source, aliases, tokens);
  const report = {
    spotifyVersion: spotify.version, mapRevision: revision, cssFiles: files,
    themeClasses: result.seen, adaptedClasses: result.converted.length,
    adapted: result.converted, alreadyNative: result.native, unmatched: result.unmatched
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`Clases adaptadas: ${result.converted.length}. Ya nativas: ${result.native.length}. Sin correspondencia: ${result.unmatched.length}.`);
  if (result.converted.length < 10) {
    throw new Error('El mapa no ofrece cobertura suficiente. Se conserva sinton.css; revisa assets/bloom-compat-report.json.');
  }
  const attribution = `/* Selector mapping data: spicetify/cli ${revision}.\n${license.replaceAll('*/', '* /')}\n*/\n`;
  if (!current.startsWith(marker)) await fs.writeFile(sourcePath, source, 'utf8');
  await fs.writeFile(temporary, `${marker}\n${attribution}${result.css}`, 'utf8');
  await fs.rename(temporary, cssPath);
  console.log('CSS compilado. Se conservan los selectores originales como alternativa mediante :is().');
  console.log('No se modifica Spotify ni se ejecuta código de Spicetify.');
  console.log('Cierra Spotify completamente y ejecuta: node bin/sinton.js apply');
  console.log('Compatibilidad visual pendiente de prueba; los selectores sin correspondencia figuran en assets/bloom-compat-report.json.');
}

main().catch(async (error) => {
  await fs.rm(temporary, { force: true }).catch(() => {});
  console.error(`No se pudo preparar Bloom: ${error.message}`);
  process.exitCode = 1;
});

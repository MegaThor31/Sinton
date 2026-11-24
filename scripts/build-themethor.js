import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const revision = '654cfed682b94613b0029997ffafc1eadccc5bef';
const base = `https://raw.githubusercontent.com/nimsandu/spicetify-bloom/${revision}/`;
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'assets', 'sinton.css');
const backup = path.join(root, 'assets', 'sinton.before-bloom.css');
const temporary = `${output}.build-tmp`;
const maxFile = 4 * 1024 * 1024;
let downloaded = 0;

async function download(relative) {
  const url = new URL(relative, base);
  if (!url.href.startsWith(base)) throw new Error(`Ruta fuera de Bloom: ${relative}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${relative}`);
  if (Number(response.headers.get('content-length')) > maxFile) throw new Error(`Recurso demasiado grande: ${relative}`);
  if (!response.body) throw new Error(`Respuesta vacía: ${relative}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    downloaded += chunk.length;
    if (size > maxFile || downloaded > 20 * 1024 * 1024) {
      throw new Error('La descarga supera el límite de tamaño. No se modifica el tema.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function blobHash(buffer) {
  return createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
}

const palette = {
  text: 'ff9100', subtext: 'b4b4b4', 'nav-active-text': '202020',
  main: '202020', sidebar: '202020', player: '242424', card: '242424',
  shadow: '000000', 'main-secondary': '171717', button: 'ff9100',
  'button-secondary': 'ffb700', 'button-active': 'ff5e00',
  'button-disabled': '353535', 'nav-active': 'ff9100', 'play-button': 'ff9100',
  'tab-active': '171717', notification: '242424', 'notification-error': '242424',
  'playback-bar': 'ff9100', misc: 'FFFFFF',
  accent: 'ff9100', 'alt-text': '202020', 'player-border': '353535',
  'player-bar-shadow': '000000', 'player-bar-bg': '353535',
  'selected-row': '171717', 'notif-bubble-info': '242424',
  'notif-bubble-error': '242424', 'not-selected': 'b4b4b4',
  'layer-shadow': '000000', contour: '353535', 'dark-border': '171717',
  'light-border': '353535', 'main-elevated': '242424',
  highlight: '242424', 'highlight-elevated': '353535', pressed: '171717'
};

function paletteCss() {
  const lines = Object.entries(palette).flatMap(([key, hex]) => {
    const rgb = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)).join(', ');
    return [`  --spice-${key}: #${hex} !important;`, `  --spice-rgb-${key}: ${rgb} !important;`];
  });
  return `:root {\n${lines.join('\n')}\n  --green: #ff9100;\n}\n.encore-dark-theme {\n  --background-base: #202020;\n  --background-highlight: #242424;\n  --background-press: #171717;\n  --background-elevated-base: #242424;\n  --background-elevated-highlight: #353535;\n  --background-elevated-press: #171717;\n  --text-base: #ff9100;\n  --text-subdued: #b4b4b4;\n  --text-bright-accent: #ff9100;\n  --essential-bright-accent: #ff9100;\n  --essential-positive: #ff9100;\n}\n`;
}

function resourcePath(value) {
  const url = new URL(value, 'https://nimsandu.github.io/spicetify-bloom/src/user.css');
  if (url.origin !== 'https://nimsandu.github.io' || !url.pathname.startsWith('/spicetify-bloom/')) {
    throw new Error(`Recurso externo no autorizado: ${value}`);
  }
  if (url.search || url.hash) throw new Error(`Referencia no soportada: ${value}`);
  const relative = decodeURIComponent(url.pathname.slice('/spicetify-bloom/'.length));
  if (relative.split('/').some((part) => part === '..' || part === '.') || relative.includes('\\')) {
    throw new Error(`Ruta inválida: ${relative}`);
  }
  return relative;
}

async function main() {
  console.log(`Importando Bloom ${revision.slice(0, 7)}. No se modificará Spotify.`);
  const original = await download('src/user.css');
  if (blobHash(original) !== '45faeee886beeb1f8db345b4188248088dc05e59') {
    throw new Error('El CSS no coincide con la revisión examinada. Se cancela la importación.');
  }
  const license = (await download('LICENSE')).toString('utf8');
  if (!license.startsWith('MIT License') || license.includes('*/')) throw new Error('Licencia inesperada.');
  let css = original.toString('utf8');
  if (/@import\b/i.test(css)) throw new Error('Bloom contiene @import: requiere revisión antes de importar.');
  const expression = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  const resources = new Map();
  for (const match of css.matchAll(expression)) {
    const value = (match[1] ?? match[2] ?? match[3]).trim();
    if (/^data:/i.test(value) || value.startsWith('#')) continue;
    resources.set(value, resourcePath(value));
  }
  if (resources.size > 100) throw new Error('Demasiados recursos: se requiere revisión.');
  const embedded = new Map();
  const types = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
  for (const [value, relative] of resources) {
    const mime = types[path.posix.extname(relative).toLowerCase()];
    if (!mime) throw new Error(`Tipo de recurso no soportado: ${relative}`);
    const buffer = await download(relative);
    embedded.set(value, `data:${mime};base64,${buffer.toString('base64')}`);
  }
  css = css.replace(expression, (full, doubleQuoted, singleQuoted, bare) => {
    const value = (doubleQuoted ?? singleQuoted ?? bare).trim();
    return embedded.has(value) ? `url("${embedded.get(value)}")` : full;
  });
  const result = `/* ThemeThor: Bloom original ${revision}, Wealthy palette.\n${license}\n*/\n${css}\n/* ThemeThor color overrides. Original layout preserved. */\n${paletteCss()}`;
  await fs.mkdir(path.dirname(output), { recursive: true });
  try {
    await fs.copyFile(output, backup, 1);
  } catch (error) {
    if (error.code !== 'EEXIST' && error.code !== 'ENOENT') throw error;
  }
  await fs.writeFile(temporary, result, 'utf8');
  await fs.rename(temporary, output);
  console.log(`ThemeThor generado: ${Buffer.byteLength(result)} bytes, ${embedded.size} referencias empaquetadas.`);
  console.log('CSS original completo; no se ejecuta theme.js ni se incluyen sus efectos dependientes de Spicetify.');
  console.log('Cierra Spotify por completo y ejecuta: node bin/sinton.js apply');
}

main().catch(async (error) => {
  await fs.rm(temporary, { force: true }).catch(() => {});
  console.error(`No se pudo generar ThemeThor: ${error.message}`);
  process.exitCode = 1;
});

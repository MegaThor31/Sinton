import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const version = '1.3.27';
const url = `https://unpkg.com/lenis@${version}/dist/lenis.min.js`;
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = path.join(root, 'assets', 'vendor');
const target = path.join(dir, 'lenis.min.js');
const temporary = `${target}.tmp`;
const limit = 300 * 1024;

async function main() {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.url.startsWith(`https://unpkg.com/lenis@${version}/`)) throw new Error('Redireccion inesperada');
  if (!response.body) throw new Error('Respuesta vacia');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('Lenis supera el limite de tamano esperado');
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  const text = data.toString('utf8');
  if (!text.includes('Lenis') || /^\s*(import|export)\s/m.test(text)) throw new Error('El archivo no parece el bundle global de Lenis');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(temporary, data);
  await fs.rename(temporary, target);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  await fs.writeFile(path.join(dir, 'lenis.NOTICE.txt'), `Lenis ${version}\nSource: ${url}\nSHA-256: ${hash}\nLicense: MIT, darkroom.engineering. Review the upstream LICENSE before redistributing.\n`);
  console.log(`Lenis ${version} guardado en assets/vendor/lenis.min.js (${size} bytes).`);
  console.log(`SHA-256: ${hash}`);
  console.log('Cierra Spotify completamente y ejecuta: node bin/sinton.js apply');
}

main().catch(async (error) => {
  await fs.rm(temporary, { force: true }).catch(() => {});
  console.error(`No se pudo preparar Lenis: ${error.message}`);
  process.exitCode = 1;
});

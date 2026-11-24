import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'themes', 'themethor-bloom.css');
const assets = path.join(root, 'assets');
const targets = ['sinton.css', 'sinton.bloom-unmapped.css', 'bloom-compat-report.json'];
const state = new Map();
const lockPath = path.join(root, '.themethor-build.lock');
let lock;
let changed = false;

async function main() {
  lock = await fs.open(lockPath, 'wx');
  await lock.writeFile(String(process.pid));
  const css = await fs.readFile(source, 'utf8');
  if (!css.includes('--thor-accent: #ff9100;')) throw new Error('La fuente de ThemeThor no es la esperada');
  if (/@import\b|https?:\/\/(?!github\.com\/nimsandu\/spicetify-bloom)/i.test(css)) {
    throw new Error('La fuente contiene una dependencia externa no permitida');
  }
  await fs.mkdir(assets, { recursive: true });
  const backup = path.join(root, '.sinton', 'theme-backups', `${Date.now()}-${process.pid}`);
  await fs.mkdir(backup, { recursive: true });
  for (const name of targets) {
    try {
      const data = await fs.readFile(path.join(assets, name));
      state.set(name, data);
      await fs.writeFile(path.join(backup, name), data);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state.set(name, null);
    }
  }
  await fs.writeFile(path.join(backup, 'manifest.json'), JSON.stringify({
    createdAt: new Date().toISOString(),
    files: Object.fromEntries([...state].map(([name, data]) => [name, data !== null]))
  }, null, 2) + '\n');
  console.log(`Copia del tema anterior: ${backup}`);
  // The existing selector compiler recognizes this legacy source signature.
  const signature = '/* ThemeThor: Bloom original visual reference; component adaptation, not an upstream CSS import. */\n';
  changed = true;
  await fs.writeFile(path.join(assets, 'sinton.css'), signature + css, 'utf8');
  const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(root, 'scripts', 'prepare-bloom-compat.js')], {
    cwd: root, windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024
  });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  console.log('ThemeThor visual generado desde themes/themethor-bloom.css. No se ha modificado Spotify.');
  console.log('No uses los generadores anteriores para esta variante.');
  console.log('Cierra Spotify completamente y ejecuta: node bin/sinton.js apply');
}

try {
  await main();
} catch (error) {
  console.error(error.stderr || error.message);
  if (changed) {
    const failures = [];
    for (const [name, data] of state) {
      try {
        const target = path.join(assets, name);
        if (data === null) await fs.rm(target, { force: true });
        else await fs.writeFile(target, data);
      } catch (restoreError) {
        failures.push(`${name}: ${restoreError.message}`);
      }
    }
    console.error(failures.length ? `Restauración incompleta: ${failures.join('; ')}` : 'Se ha recuperado el tema anterior.');
  }
  process.exitCode = 1;
} finally {
  if (lock) {
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

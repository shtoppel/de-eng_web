import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const prebuilt = join(root, 'prebuilt-dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const tsc = spawnSync('tsc', ['-p', join(root, 'tsconfig.json')], { stdio: 'inherit' });
if (tsc.status !== 0) {
  if (!existsSync(prebuilt)) {
    process.exit(tsc.status ?? 1);
  }
  console.warn('TypeScript compiler is unavailable or failed; copying prebuilt frontend assets.');
  cpSync(prebuilt, dist, { recursive: true });
} else {
  cpSync(join(root, 'src', 'index.html'), join(dist, 'index.html'));
  cpSync(join(root, 'src', 'styles.css'), join(dist, 'styles.css'));
}

const files = readdirSync(dist).sort().join(', ');
console.log(`Built frontend/dist: ${files}`);

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Point esbuild at the platform binary if postinstall scripts were skipped.
const platformBin = path.join(rootDir, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe');
if (!process.env.ESBUILD_BINARY_PATH && fs.existsSync(platformBin)) {
  process.env.ESBUILD_BINARY_PATH = platformBin;
}

await build({
  entryPoints: [path.join(rootDir, 'src', 'index.mjs')],
  outfile: path.join(rootDir, 'server', 'bundle.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  minify: true,
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
});

const outPath = path.join(rootDir, 'server', 'bundle.mjs');
const stat = fs.statSync(outPath);
console.log(`Built ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);

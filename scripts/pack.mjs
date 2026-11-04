#!/usr/bin/env node
// Bangun ZIP runtime yang reproducible (hanya isi plugin, tanpa file pengembangan) + SHA256SUMS.txt.
//   node scripts/pack.mjs [--out dist]
// Hasil: pawang-agents-claude-<versi>.zip dan pawang-agents-codex-<versi>.zip. Isi: manifest host, agents/, skills/, LICENSE.
// Butuh perintah `zip`. Urutan berkas diurutkan dan waktu diset tetap, jadi isi sama menghasilkan ZIP yang sama.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { walk } from '../skills/pawang-init/scripts/init.mjs';
import { ROOT, version } from './lib.mjs';

const args = process.argv.slice(2);
const out = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist');
const FIXED = new Date('2026-01-01T00:00:00Z');
const LICENSE = path.join(ROOT, 'LICENSE');

if (spawnSync('zip', ['-v'], { stdio: 'ignore' }).error) { console.error('Perintah `zip` tidak ditemukan.'); process.exit(1); }
const v = version();
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const sums = [];
const SHARED = ['agents', 'skills'];
const HOST = { claude: '.claude-plugin/plugin.json', codex: '.codex-plugin/plugin.json' };
for (const [label, manifest] of Object.entries(HOST)) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'pawang-pack-'));
  const files = [manifest];
  for (const d of SHARED) for (const rel of walk(path.join(ROOT, d))) files.push(path.join(d, rel));
  if (fs.existsSync(LICENSE)) files.push('LICENSE');
  for (const rel of files) {
    const dst = path.join(stage, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dst);
  }
  files.sort();
  for (const rel of files) fs.utimesSync(path.join(stage, rel), FIXED, FIXED);
  const name = `pawang-agents-${label}-${v}.zip`;
  const r = spawnSync('zip', ['-X', '-q', path.join(out, name), '-@'], { cwd: stage, input: files.join('\n') + '\n', env: { ...process.env, TZ: 'UTC' } });
  fs.rmSync(stage, { recursive: true, force: true });
  if (r.status !== 0) { console.error(`Gagal membuat ${name}: ${r.stderr}`); process.exit(1); }
  sums.push(`${crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name))).digest('hex')}  ${name}`);
}
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(sums.join('\n'));

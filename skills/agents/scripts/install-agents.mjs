#!/usr/bin/env node
// install-agents.mjs: pasang definisi subagent OpenCode (explorer, implementer, verifier, reviewer)
// ke <proyek>/.opencode/agents/. Default DRY-RUN (hanya menampilkan rencana). --apply untuk menulis.
// Tidak menimpa file yang sudah ada. Tidak membaca file rahasia. Tanpa dependensi (Node 18+).
//
// Pemakaian: node install-agents.mjs <path-proyek> [--apply] [--only=explorer,verifier]
// Placeholder {{ALLOW}} di verifier diisi dari script package.json (test/lint/typecheck/e2e/build/check)
// dan pemeriksa deterministik skill (check-layout, compare-text, docs-health).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const root = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const apply = args.includes('--apply');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const here = path.dirname(fileURLToPath(import.meta.url));
const tplDir = path.join(here, '..', 'assets', 'agents');
const outDir = path.join(root, '.opencode', 'agents');

if (!fs.existsSync(root)) { console.error('Folder proyek tidak ditemukan: ' + root); process.exit(2); }

// manajer paket dari lockfile
const has = (f) => fs.existsSync(path.join(root, f));
const pm = has('pnpm-lock.yaml') ? 'pnpm' : has('bun.lock') || has('bun.lockb') ? 'bun' : has('yarn.lock') ? 'yarn' : 'npm';
let scripts = {};
try { scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {}; } catch { /* tanpa package.json */ }
const wanted = Object.keys(scripts).filter((k) => /^(test|lint|typecheck|type-check|check|build|e2e|test:.*|e2e:.*|lint:.*)$/.test(k));

// Satu sumber untuk blok izin (hindari lima salinan yang tidak sinkron). Urutan penting: aturan terakhir yang cocok menang.
const ind = (lines) => lines.map((l) => '    ' + l).join('\n');
const SECRET_FILES = ['*.dev.vars', '*.dev.vars.*', '*.env', '*.env.*'];
const fileRules = ind(['"*": allow', ...SECRET_FILES.map((p) => `"${p}": deny`), '"*.example": allow']);
const bashSecret = ind([
  // Hanya bentuk berawalan titik, supaya `process.env` tidak ikut terblokir. Berkas *.example dibaca lewat tool read.
  '"* .env*": deny', '"*/.env*": deny', '"*:.env*": deny', "\"*'.env*\": deny", '"*\\".env*": deny',
  '"*.dev.vars*": deny',
]);
const gitDeny = ind(['"git commit*": deny', '"git push*": deny', '"git reset*--hard*": deny', '"git*--force*": deny']);
const dev = Object.keys(scripts).filter((k) => /^(test|lint|typecheck|type-check|check|test:.*|lint:.*)$/.test(k) && !/e2e/.test(k));
const devAllow = dev.map((k) => `"${pm} run ${k}*": allow`);
if (scripts.test) devAllow.push(`"${pm} test*": allow`);
const verAllow = [
  ...wanted.map((k) => `"${pm} run ${k}*": allow`),
  ...(scripts.test ? [`"${pm} test*": allow`] : []),
  '"node .agents/skills/*/scripts/check-layout.mjs*": allow',
  '"node .agents/skills/*/scripts/compare-text.mjs*": allow',
  '"node .agents/skills/*/scripts/docs-health.mjs*": allow',
  '"node .agents/skills/*/scripts/probe.mjs*": allow',
  '"pdftotext*": allow', '"pdftoppm*": allow', '"pdffonts*": allow', '"pdfinfo*": allow', '"compare *": allow',
];
const fill = (t) => t
  .replace('{{READ}}', fileRules).replace('{{EDIT}}', fileRules)
  .replace('{{BASH_SECRET}}', bashSecret).replace('{{GIT_DENY}}', gitDeny)
  .replace('{{ALLOW_DEV}}\n', devAllow.length ? ind(devAllow) + '\n' : '')
  .replace('{{ALLOW}}', ind(verAllow));

// agent yang sudah didefinisikan di opencode.json (bagian "agent")
let cfg = null, cfgNote = '';
for (const f of ['opencode.json', 'opencode.jsonc']) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) continue;
  try { cfg = JSON.parse(fs.readFileSync(fp, 'utf8')); cfgNote = f; } catch { cfgNote = f + ' (berisi komentar/JSONC: tidak bisa dibaca skrip, periksa manual)'; }
  break;
}
const inCfg = new Set(Object.keys((cfg && cfg.agent) || {}));

const names = fs.readdirSync(tplDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).filter((n) => !only.length || only.includes(n));
const plan = [];
for (const n of names) {
  const dest = path.join(outDir, n + '.md');
  const exists = fs.existsSync(dest) || inCfg.has(n);
  const text = fill(fs.readFileSync(path.join(tplDir, n + '.md'), 'utf8'));
  plan.push({ n, dest, exists, text, where: inCfg.has(n) ? 'opencode.json' : path.relative(root, dest) });
}

console.log(`# Pemasangan subagent OpenCode (${apply ? 'APPLY' : 'DRY-RUN'})`);
console.log(`Proyek: ${root}`);
console.log(`Manajer paket: ${pm} | script yang diizinkan untuk verifier: ${wanted.join(', ') || '(tidak ada di package.json)'}`);
for (const p of plan) console.log(`- ${p.exists ? 'LEWATI (sudah ada)' : 'BUAT'} ${p.n}: ${p.where}`);
if (cfgNote) console.log(`Konfigurasi: ${cfgNote}`);
// agent utama harus boleh memanggil subagent
const taskRule = cfg && cfg.agent && cfg.agent.build && cfg.agent.build.permission && cfg.agent.build.permission.task;
if (taskRule && typeof taskRule === 'object') {
  const miss = names.filter((n) => taskRule[n] !== 'allow');
  if (miss.length) console.log(`PERHATIAN: agent "build" membatasi task; tambahkan allow untuk: ${miss.join(', ')}`);
}
if (!wanted.length) console.log('\nCatatan: package.json tidak punya script test/lint/E2E; verifier akan meminta persetujuan (ask) untuk tiap perintah.');

if (apply) {
  fs.mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (const p of plan) if (!p.exists) { fs.writeFileSync(p.dest, p.text); n++; }
  console.log(`\nDitulis: ${n} file. Izin menolak "git commit", jadi minta user yang commit agar perubahannya terlihat di diff.`);
} else {
  console.log('\nBelum menulis apa pun. Tampilkan rencana ke user; jalankan lagi dengan --apply setelah setuju.');
}
console.log('\nCatatan izin (sesuai dokumentasi OpenCode): izin global di opencode.json digabung ke tiap agent, lalu aturan agent ditambahkan sesudahnya dan aturan terakhir yang cocok menang. Karena itu `\"*\": ask` di bash agent menimpa deny bash global; blok deny rahasia dan git di atas sengaja ditaruh di AKHIR blok bash tiap agent. Rahasia untuk tool read/edit cukup di permission global opencode.json. Uji sekali: minta @explorer membaca .dev.vars dan jalankan `cat .env` lewat @implementer; keduanya harus ditolak.');

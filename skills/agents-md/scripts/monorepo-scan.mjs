#!/usr/bin/env node
// monorepo-scan.mjs: menentukan folder mana di monorepo yang layak punya AGENTS.md sendiri, beserta buktinya.
// HANYA BACA, tanpa dependensi (Node 18+). Tidak menulis file dan tidak membuka berkas rahasia.
// Git dipakai hanya untuk `git log` (opsional; dilewati bila tidak ada .git).
//
// Pemakaian: node monorepo-scan.mjs [path-proyek] [--draft] [--json] [--all]
//   --draft  cetak draf isi AGENTS.md untuk folder berstatus BUAT (bahan agen, bukan file jadi)
//   --json   keluaran JSON
//   --all    tampilkan juga folder umum yang dilewati (docs, tests, ...)
//
// Status per folder:
//   ADA     sudah punya AGENTS.md (diaudit docs-health, bukan di sini)
//   BUAT    ada bukti kuat: perintah operasional sendiri, stack khusus, atau path terlarang
//   TANYA   hanya bukti lemah (exports, riwayat git); tanya user, default dilewati
//   LEWATI  tidak ada yang khas; aturan root sudah cukup
//
// Perintah generik (build, lint, typecheck, test, clean, format, check) TIDAK dihitung sebagai perintah
// sendiri karena sudah dijalankan lewat root (mis. turbo). Batasan: tes dengan konfigurasi khusus
// folder tidak terdeteksi dari nama skrip; periksa manual bila curiga.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const wantDraft = args.includes('--draft');
const wantJson = args.includes('--json');
const showAll = args.includes('--all');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) { console.error('Folder proyek tidak ditemukan: ' + root); process.exit(2); }

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const exists = (f) => { try { fs.accessSync(f); return true; } catch { return false; } };
const isDir = (f) => { try { return fs.statSync(f).isDirectory(); } catch { return false; } };
const ls = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
const json = (f) => { try { return JSON.parse(read(f)); } catch { return null; } };
const rel = (f) => path.relative(root, f).split(path.sep).join('/') || '.';

const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.wrangler', '.turbo', '.next', '.svelte-kit', '.output', 'vendor', '.terraform', '.expo']);
const COMMON = new Set(['docs', 'tests', 'e2e', 'public', 'assets', 'scripts', 'src']);
const GENERIC_SCRIPTS = new Set(['build', 'lint', 'typecheck', 'test', 'clean', 'format', 'check', 'prepare', 'postinstall']);
const PROTECTED_DIRS = new Set(['migrations', 'drizzle', 'generated', '__generated__']);

// ---------- paket manajer dari lockfile ----------
const pm = exists(path.join(root, 'bun.lock')) || exists(path.join(root, 'bun.lockb')) ? 'bun'
  : exists(path.join(root, 'pnpm-lock.yaml')) ? 'pnpm'
  : exists(path.join(root, 'yarn.lock')) ? 'yarn'
  : exists(path.join(root, 'package-lock.json')) ? 'npm' : null;
const runner = pm === 'bun' ? 'bun run' : pm === 'pnpm' ? 'pnpm run' : pm === 'yarn' ? 'yarn' : 'npm run';

const rootPkg = json(path.join(root, 'package.json')) || {};
const rootDeps = new Set([...Object.keys(rootPkg.dependencies || {}), ...Object.keys(rootPkg.devDependencies || {})]);

// ---------- penemuan folder kandidat ----------
const globs = [];
const ws = rootPkg.workspaces;
for (const g of Array.isArray(ws) ? ws : ws && ws.packages ? ws.packages : []) globs.push(g);
const pnpmWs = read(path.join(root, 'pnpm-workspace.yaml'));
if (pnpmWs) for (const m of pnpmWs.matchAll(/^\s*-\s*['"]?([^'"\n#]+?)['"]?\s*$/gm)) globs.push(m[1]);
if (!globs.length) globs.push('apps/*', 'packages/*', 'services/*');

const candidates = new Map(); // path relatif -> asal
const expand = (g) => {
  const parts = g.replace(/\/+$/, '').split('/');
  let bases = [root];
  for (const part of parts) {
    const next = [];
    for (const b of bases) {
      if (part === '*' || part === '**') for (const n of ls(b)) { if (!IGNORE.has(n) && !n.startsWith('.') && isDir(path.join(b, n))) next.push(path.join(b, n)); }
      else if (isDir(path.join(b, part))) next.push(path.join(b, part));
    }
    bases = next;
  }
  return bases;
};
for (const g of globs) if (!g.startsWith('!')) for (const d of expand(g)) candidates.set(rel(d), 'workspace');
// kontainer yang isinya paket bersarang (mis. packages/shared/lib): tambahkan anak yang punya package.json
for (const [p] of [...candidates]) {
  const abs = path.join(root, p);
  if (!exists(path.join(abs, 'package.json'))) {
    for (const n of ls(abs)) { const c = path.join(abs, n); if (isDir(c) && !IGNORE.has(n) && exists(path.join(c, 'package.json'))) candidates.set(rel(c), 'workspace'); }
  }
}
// folder tingkat atas yang bukan paket (infra, database, deploy, ...)
for (const n of ls(root)) {
  const d = path.join(root, n);
  if (!isDir(d) || n.startsWith('.') || IGNORE.has(n) || ['apps', 'packages', 'services'].includes(n)) continue;
  if (![...candidates.keys()].some((k) => k === n || k.startsWith(n + '/'))) candidates.set(n, 'root');
}
// kontainer tanpa package.json yang sudah punya anak kandidat tidak dinilai sendiri
for (const [p] of [...candidates]) {
  if (!exists(path.join(root, p, 'package.json')) && [...candidates.keys()].some((k) => k.startsWith(p + '/'))) candidates.delete(p);
}

// ---------- kumpulkan bukti per folder ----------
const walk = (dir, depth, acc) => {
  if (depth > 3 || acc.length > 2000) return acc;
  for (const n of ls(dir)) {
    if (IGNORE.has(n)) continue;
    const f = path.join(dir, n);
    if (isDir(f)) { acc.push({ f, dir: true, n }); walk(f, depth + 1, acc); } else acc.push({ f, dir: false, n });
  }
  return acc;
};

const STACK_FILES = [
  [/^wrangler\.(jsonc?|toml)$/, 'Cloudflare Workers (wrangler)'],
  [/^drizzle\.config\.[cm]?[jt]s$/, 'Drizzle (drizzle-kit)'],
  [/^vite\.config\.[cm]?[jt]s$/, 'Vite'],
  [/^next\.config\.[cm]?[jt]s$/, 'Next.js'],
  [/^astro\.config\.[cm]?[jt]s$/, 'Astro'],
  [/^svelte\.config\.[cm]?[jt]s$/, 'SvelteKit'],
  [/^app\.(json|config\.[jt]s)$/, null], // hanya dihitung bila ada dependensi expo
  [/\.tf$/, 'Terraform'],
  [/^Pulumi\.ya?ml$/, 'Pulumi'],
  [/^(Dockerfile|docker-compose.*\.ya?ml)$/, 'Docker'],
  [/^schema\.prisma$/, 'Prisma'],
  [/^serverless\.ya?ml$/, 'Serverless Framework'],
];
// Dependensi platform: menentukan cara kerja folder, jadi dihitung bukti kuat.
const STACK_DEPS = {
  hono: 'Hono', '@hono/zod-openapi': 'zod-openapi', 'react-native': 'React Native', expo: 'Expo',
  'drizzle-orm': 'Drizzle ORM', '@prisma/client': 'Prisma', 'better-auth': 'Better Auth',
  svelte: 'Svelte', astro: 'Astro', next: 'Next.js', wrangler: 'Cloudflare Workers (wrangler)',
};
// Dependensi umum: hanya bukti lemah, karena folder yang memakainya biasanya cukup diatur oleh root.
const COMMON_DEPS = { react: 'React', vue: 'Vue', tailwindcss: 'Tailwind CSS', vitest: 'Vitest', playwright: 'Playwright' };

const gitOk = exists(path.join(root, '.git'));
const gitFixes = (dir) => {
  if (!gitOk) return null;
  try {
    const out = execFileSync('git', ['-C', root, 'log', '-n', '300', '--pretty=%s', '--', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter((s) => /^(fix|revert)(\(|:|!)/i.test(s));
  } catch { return null; }
};

const results = [];
for (const [p, origin] of [...candidates].sort((a, b) => a[0].localeCompare(b[0]))) {
  const abs = path.join(root, p);
  const top = ls(abs);
  const pkg = json(path.join(abs, 'package.json'));
  const strong = [], weak = [], commands = [], protectedPaths = [], tools = [];

  // 1. perintah operasional sendiri
  for (const [name, cmd] of Object.entries((pkg && pkg.scripts) || {})) {
    if (GENERIC_SCRIPTS.has(name)) continue;
    commands.push({ name, cmd });
  }
  if (commands.length) strong.push(`perintah sendiri: ${commands.map((c) => c.name).join(', ')}`);

  // 2. stack khusus
  const deps = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  const hasExpo = 'expo' in deps;
  const stackLabels = new Set();
  for (const [d, label] of Object.entries(STACK_DEPS)) if (d in deps && !rootDeps.has(d)) stackLabels.add(label);
  const commonLabels = Object.entries(COMMON_DEPS).filter(([d]) => d in deps && !rootDeps.has(d)).map(([, l]) => l);
  const files = walk(abs, 0, []);
  for (const { n, dir } of files) {
    if (dir) continue;
    for (const [re, label] of STACK_FILES) if (re.test(n)) { const l = label || (hasExpo ? 'Expo' : null); if (l) stackLabels.add(l); }
  }
  if (stackLabels.size) { tools.push(...stackLabels); strong.push(`stack khusus: ${[...stackLabels].join(', ')}`); }

  // 3. path terlarang
  for (const { f, dir, n } of files) {
    if (dir && PROTECTED_DIRS.has(n)) protectedPaths.push(rel(f) + '/');
    if (!dir && /\.tfstate(\.backup)?$/.test(n)) protectedPaths.push(rel(f));
    if (!dir && /^openapi\.json$/.test(n) && p !== '.') protectedPaths.push(rel(f) + ' (hasil generate)');
  }
  if (top.includes('.terraform')) protectedPaths.push(p + '/.terraform/');
  if (protectedPaths.length) strong.push(`path yang tidak boleh diedit manual: ${protectedPaths.join(', ')}`);

  // lemah: dependensi umum, exports publik, riwayat git
  if (commonLabels.length && !stackLabels.size) weak.push(`hanya memakai ${commonLabels.join(', ')} (umum); tulis hanya bila ada konvensi khusus folder ini`);
  if (pkg && pkg.exports) weak.push('package.json punya `exports` (batas impor publik); konvensi layak ditulis hanya bila ada aturan non-obvious');
  const fixes = gitFixes(p);
  if (fixes && fixes.length >= 3) weak.push(`${fixes.length} commit fix/revert menyentuh folder ini (kandidat Failure Log; alasan perlu dikonfirmasi user)`);

  const has = exists(path.join(abs, 'AGENTS.md'));
  let status, reason;
  if (has) { status = 'ADA'; reason = 'sudah punya AGENTS.md (audit dengan docs-health)'; }
  else if (strong.length) { status = 'BUAT'; reason = strong.join('; '); }
  else if (weak.length) { status = 'TANYA'; reason = weak.join('; '); }
  else { status = 'LEWATI'; reason = COMMON.has(p) ? 'folder umum, aturan root cukup' : 'tidak ada perintah, stack, atau larangan yang khas; aturan root cukup'; }

  results.push({ path: p, origin, status, reason, evidence: { strong, weak }, commands, protectedPaths, tools, fixes: fixes ? fixes.slice(0, 5) : [] });
}

const shown = results.filter((r) => showAll || !(r.status === 'LEWATI' && COMMON.has(r.path)));

// ---------- keluaran ----------
if (wantJson) { console.log(JSON.stringify({ packageManager: pm, git: gitOk, folders: shown }, null, 2)); process.exit(0); }

const order = ['BUAT', 'TANYA', 'ADA', 'LEWATI'];
console.log(`Monorepo scan: ${rel(root) === '.' ? path.basename(root) : rel(root)} (paket manajer: ${pm || 'tidak terdeteksi'}; git: ${gitOk ? 'ada' : 'tidak ada, kriteria riwayat dilewati'})`);
console.log(`Folder dinilai: ${shown.length}. Perintah generik (build, lint, typecheck, test, ...) tidak dihitung.\n`);
for (const st of order) {
  const rows = shown.filter((r) => r.status === st);
  if (!rows.length) continue;
  console.log(`${st} (${rows.length})`);
  for (const r of rows) console.log(`  ${r.path.padEnd(28)} ${r.reason}`);
  console.log('');
}
const n = (s) => shown.filter((r) => r.status === s).length;
console.log(`Ringkasan: ${n('BUAT')} buat, ${n('TANYA')} tanya user, ${n('ADA')} sudah ada, ${n('LEWATI')} dilewati.`);
console.log('Skrip ini hanya audit. File ditulis agen setelah ringkasan disetujui user.');

if (wantDraft) {
  for (const r of shown.filter((x) => x.status === 'BUAT')) {
    console.log(`\n${'='.repeat(60)}\nDRAF ${r.path}/AGENTS.md  (bahan, bukan file jadi; verifikasi sebelum ditulis)\n${'='.repeat(60)}`);
    const L = [`# AGENTS.md: ${r.path}`, '', '<!-- Aturan root berlaku. File ini hanya menambah hal khusus folder ini. -->'];
    if (r.tools.length) L.push('', '## Stack', `- ${r.tools.join(', ')}`);
    if (r.commands.length) {
      L.push('', '## Commands (jalankan dari folder ini)');
      for (const c of r.commands) L.push(`- \`${runner} ${c.name}\`: \`${c.cmd}\``);
    } else if (r.tools.length) L.push('', '## Commands (jalankan dari folder ini)', '- TODO: konfirmasi perintah (alat terdeteksi, tidak ada skrip package.json)');
    if (r.protectedPaths.length) { L.push('', '## Batas', 'Jangan:'); for (const x of r.protectedPaths) { const px = x.replace(/ \(.*\)$/, ''); L.push(/(^|\/)(migrations|drizzle)\/$/.test(px) ? `- Jangan edit file yang sudah ada di \`${px}\`; buat migrasi baru lewat tool.` : `- Jangan edit \`${px}\` secara manual.`); } }
    if (r.fixes.length) {
      L.push('', '## Jebakan', '- TODO: konfirmasi mana dari riwayat ini yang berulang, lalu tulis aturannya.', '<!--', 'Kandidat dari git log (belum terkonfirmasi):');
      for (const s of r.fixes) L.push(`  ${s}`);
      L.push('Failure: TODO', 'Why: TODO', 'Outcome: TODO - confirm', '-->');
    }
    L.push('', '## Baca bila relevan', '- TODO: tambahkan hanya bila ada dokumen khusus folder ini (sertakan pemicu "baca saat ...").');
    console.log(L.join('\n'));
  }
}

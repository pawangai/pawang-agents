#!/usr/bin/env node
// pawang-init: pasang atau perbarui kit Pawang (AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/, config) di proyek.
// Tanpa dependensi. Default dry-run; tambahkan --apply untuk menulis. Pemasangan awal tidak menimpa file yang ada.
// Update memakai .agents/pawang.lock.json: file yang belum diubah lokal boleh diganti, file yang diubah lokal tidak.
//   node init.mjs [path-proyek] [--apply] [--update [--apply] [--baseline]] [--opencode] [--claude]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(HERE, '..', 'assets', 'kit');
const OPENCODE = path.join(HERE, '..', 'assets', 'opencode');
const VERSION_FILE = path.join(HERE, '..', 'assets', 'VERSION');
const LOCK = '.agents/pawang.lock.json';
const TEXT_EXT = new Set(['.md', '.mjs', '.js', '.json', '.py', '.sh', '.yml', '.yaml', '.txt', '.example', '']);

export function isText(file) {
  return TEXT_EXT.has(path.extname(file).toLowerCase());
}

export function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(path.relative(base, p));
  }
  return out.sort();
}

const posix = (p) => p.split(path.sep).join('/');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const clean = (v) => (typeof v === 'string' ? v.trim() : '');

// Tulis ke file sementara di folder yang sama, lalu rename. Update tidak meninggalkan file setengah jadi.
function writeAtomic(dest, body) {
  const tmp = path.join(path.dirname(dest), `.${path.basename(dest)}.pawang-${process.pid}.tmp`);
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, dest);
}

export function availableVersion() {
  try { return clean(fs.readFileSync(VERSION_FILE, 'utf8')) || 'unknown'; } catch { return 'unknown'; }
}

export function readLock(project) {
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(project, LOCK), 'utf8'));
    if (!lock || lock.schemaVersion !== 1 || !lock.files || typeof lock.files !== 'object') return null;
    return lock;
  } catch { return null; }
}

function writeLock(project, files, targets, version, pending = []) {
  const sorted = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
  const lock = { schemaVersion: 1, pawangVersion: version, targets: [...targets].sort(), files: sorted };
  if (pending.length) lock.pending = [...new Set(pending)].sort();
  const dest = path.join(project, LOCK);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  writeAtomic(dest, JSON.stringify(lock, null, 2) + '\n');
}

// Diff baris sederhana dengan konteks, tanpa dependensi. Cukup untuk file kit yang kecil.
function editScript(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  const dp = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { ops.push([' ', A[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', A[i]]); i++; }
    else { ops.push(['+', B[j]]); j++; }
  }
  while (i < A.length) ops.push(['-', A[i++]]);
  while (j < B.length) ops.push(['+', B[j++]]);
  return ops;
}

function unifiedDiff(rel, oldText, newText, context = 3) {
  const ops = editScript(oldText, newText);
  const changed = [];
  for (let i = 0; i < ops.length; i++) if (ops[i][0] !== ' ') changed.push(i);
  if (!changed.length) return '';
  const ranges = [];
  for (const i of changed) {
    const start = Math.max(0, i - context), end = Math.min(ops.length, i + context + 1);
    if (ranges.length && start <= ranges[ranges.length - 1][1]) ranges[ranges.length - 1][1] = end;
    else ranges.push([start, end]);
  }
  const oldBefore = new Uint32Array(ops.length + 1), newBefore = new Uint32Array(ops.length + 1);
  for (let i = 0; i < ops.length; i++) {
    oldBefore[i + 1] = oldBefore[i] + (ops[i][0] === '+' ? 0 : 1);
    newBefore[i + 1] = newBefore[i] + (ops[i][0] === '-' ? 0 : 1);
  }
  let out = `--- a/${rel}\n+++ b/${rel}\n`;
  for (const [start, end] of ranges) {
    out += `@@ -${oldBefore[start] + 1},${oldBefore[end] - oldBefore[start]} +${newBefore[start] + 1},${newBefore[end] - newBefore[start]} @@\n`;
    for (let i = start; i < end; i++) out += ops[i][0] + ops[i][1] + '\n';
  }
  return out;
}

function appendLines(dest, body) {
  const have = new Set(fs.readFileSync(dest, 'utf8').split(/\r?\n/).map((l) => l.trim()));
  return body.toString('utf8').split(/\r?\n/).filter((l) => l.trim() && !have.has(l.trim()));
}

export function init({ project, apply = false, opencode = false, claude = false, update = false, baseline = false, version = null }) {
  const lock = readLock(project);
  const targets = new Set(['kit']);
  if (opencode) targets.add('opencode');
  if (claude) targets.add('claude');
  if (lock) for (const t of lock.targets || []) if (['kit', 'opencode', 'claude'].includes(t)) targets.add(t);
  const current = clean(version) || availableVersion();

  const sources = [];
  for (const rel of walk(KIT)) sources.push({ rel, body: fs.readFileSync(path.join(KIT, rel)) });
  if (targets.has('opencode')) for (const rel of walk(OPENCODE)) sources.push({ rel, body: fs.readFileSync(path.join(OPENCODE, rel)) });
  if (targets.has('claude')) sources.push({ rel: 'CLAUDE.md', body: Buffer.from('@AGENTS.md\n') });

  if (baseline) {
    if (!update) throw new Error('--baseline hanya dipakai bersama --update');
    const files = {};
    for (const s of sources) {
      if (s.rel === '.gitignore') continue;
      const dest = path.join(project, s.rel);
      if (fs.existsSync(dest)) files[posix(s.rel)] = sha(fs.readFileSync(dest));
    }
    if (apply) writeLock(project, files, targets, current);
    const plan = Object.keys(files).sort().map((rel) => ({ rel, action: 'baseline' }));
    plan.version = current;
    plan.installedVersion = lock?.pawangVersion || null;
    plan.targets = [...targets];
    plan.baselineFiles = Object.keys(files).length;
    return plan;
  }

  const managed = lock?.files && typeof lock.files === 'object' ? lock.files : {};
  const plan = [];
  const sourceRels = new Set(sources.map((s) => posix(s.rel)));
  for (const s of sources) {
    const rel = posix(s.rel);
    const dest = path.join(project, s.rel);
    if (s.rel === '.gitignore') {
      if (!fs.existsSync(dest)) plan.push({ rel, action: 'create', dest, body: s.body });
      else {
        const missing = appendLines(dest, s.body);
        plan.push(missing.length ? { rel, action: 'append', dest, body: Buffer.from(missing.join('\n') + '\n') } : { rel, action: 'same', dest });
      }
      continue;
    }
    if (!fs.existsSync(dest)) {
      plan.push({ rel, action: update && managed[rel] ? 'missing' : 'create', dest, body: s.body });
      continue;
    }
    const cur = fs.readFileSync(dest);
    if (cur.equals(s.body)) { plan.push({ rel, action: 'same', dest }); continue; }
    if (!update) { plan.push({ rel, action: 'exists', dest }); continue; }
    const action = managed[rel] ? (sha(cur) === managed[rel] ? 'update' : 'modified') : 'untracked';
    plan.push({ rel, action, dest, body: s.body, diff: unifiedDiff(rel, cur.toString('utf8'), s.body.toString('utf8')) });
  }
  if (update && lock) for (const rel of Object.keys(managed)) {
    if (!sourceRels.has(rel) && rel !== '.gitignore') plan.push({ rel, action: 'obsolete' });
  }

  plan.version = current;
  plan.installedVersion = lock?.pawangVersion || null;
  plan.targets = [...targets];

  if (!apply) return plan;

  const nextFiles = lock?.files ? { ...lock.files } : {};
  for (const p of plan) {
    if (p.action === 'create' || p.action === 'update') {
      fs.mkdirSync(path.dirname(p.dest), { recursive: true });
      writeAtomic(p.dest, p.body);
      nextFiles[p.rel] = sha(p.body);
    } else if (p.action === 'append') {
      const cur = fs.readFileSync(p.dest, 'utf8');
      writeAtomic(p.dest, cur + (cur.endsWith('\n') ? '' : '\n') + p.body.toString('utf8'));
    } else if (p.action === 'same' && p.rel !== '.gitignore' && !nextFiles[p.rel]) {
      nextFiles[p.rel] = sha(fs.readFileSync(p.dest));
    } else if (p.action === 'obsolete') {
      delete nextFiles[p.rel];
    }
  }
  // .gitignore dipakai bersama user: update hanya menambah baris yang kurang, tidak pernah diganti.
  delete nextFiles['.gitignore'];
  if (update) {
    const pending = plan.filter((p) => ['modified', 'untracked', 'missing'].includes(p.action)).map((p) => p.rel);
    writeLock(project, nextFiles, targets, current, pending);
  } else {
    writeLock(project, nextFiles, targets, current);
  }
  return plan;
}

function main() {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(n);
  if (flag('--help') || flag('-h')) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 5).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(0);
  }
  const project = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
  if (!fs.existsSync(project)) { console.error(`Folder proyek tidak ada: ${project}`); process.exit(1); }
  const apply = flag('--apply');
  const update = flag('--update');
  const baseline = flag('--baseline');
  if (baseline && !update) { console.error('--baseline hanya dipakai bersama --update'); process.exit(1); }
  const plan = init({ project, apply, update, baseline, opencode: flag('--opencode'), claude: flag('--claude') });
  const label = {
    create: apply ? 'dibuat' : 'akan dibuat',
    append: apply ? 'ditambah' : 'akan ditambah',
    exists: 'sudah ada, dilewati (gabungkan lewat /adopt atau /agents-md)',
    same: 'identik',
    update: apply ? 'diperbarui' : 'aman, belum diubah lokal',
    modified: 'diubah lokal, dilewati',
    untracked: 'tidak dikelola, dilewati',
    missing: 'hilang, dilewati',
    obsolete: 'tidak lagi dikirim, dibiarkan',
    baseline: apply ? 'dicatat sebagai baseline' : 'akan dicatat sebagai baseline',
  };
  if (update) console.log(`Pawang ${plan.installedVersion || 'tidak tercatat'} -> ${plan.version}`);
  for (const p of plan) if (!['same'].includes(p.action)) {
    console.log(`${p.action.padEnd(8)} ${p.rel}  [${label[p.action]}]`);
    if (p.diff) process.stdout.write(p.diff);
  }
  const n = (a) => plan.filter((p) => p.action === a).length;
  if (baseline) {
    console.log(`\nBaseline: ${plan.baselineFiles} file dicatat ke ${LOCK}.`);
    if (!apply) console.log('Ulangi dengan --apply untuk menulis baseline. Tidak ada file proyek yang diubah.');
  } else if (update) {
    console.log(`\nUpdate: ${n('update')} aman, ${n('create')} baru, ${n('modified') + n('untracked') + n('missing')} dipertahankan, ${n('obsolete')} usang.`);
    if (!plan.installedVersion) console.log(`Belum ada ${LOCK}; file lama tidak bisa dibedakan dari perubahan lokal.`);
    if (!apply) console.log('Ulangi dengan --apply untuk menulis perubahan aman dan file baru.');
    else if (n('modified') + n('untracked') + n('missing')) console.log(`File yang dipertahankan tidak ditimpa. Gabungkan diff-nya, lalu jalankan --update --baseline --apply.`);
  } else {
    console.log(`\n${apply ? 'Selesai' : 'Dry-run'}: ${n('create')} dibuat, ${n('append')} ditambah, ${n('exists')} dilewati, ${n('same')} identik.`);
    if (!apply) console.log('Ulangi dengan --apply untuk menulis.');
    else console.log(`Manifest: ${LOCK} (versi ${plan.version}). Langkah berikut: git init (bila belum), lalu /context (proyek baru) atau /adopt (kode sudah ada).`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) main();

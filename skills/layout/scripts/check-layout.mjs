#!/usr/bin/env node
// check-layout.mjs: audit tata letak folder dan penamaan file. HANYA BACA (Node 18+, tanpa dependensi).
//
// Pemakaian:
//   node check-layout.mjs <path-proyek> [--preset=auto|single|monorepo] [--all] [--strict]
//   --all     tampilkan semua temuan (default dibatasi per tingkat)
//   --strict  exit code 1 bila ada ERROR (untuk CI)
//
// Aturan ada di ../references/layout-rules.json. Folder tingkat atas yang didaftarkan di
// bagian "## Repository layout" pada AGENTS.md dianggap sah.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(fs.readFileSync(path.join(here, '..', 'references', 'layout-rules.json'), 'utf8'));
const args = process.argv.slice(2);
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const presetArg = (args.find((a) => a.startsWith('--preset=')) || '').split('=')[1] || 'auto';
const showAll = args.includes('--all');
const strict = args.includes('--strict');

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error('Folder proyek tidak ditemukan: ' + root);
  process.exit(2);
}

const readText = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const exists = (f) => fs.existsSync(f);
const toKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\s.]+/g, '-').replace(/-+/g, '-').toLowerCase();

// ---------- telusur ----------
const ignore = new Set(R.ignore_dirs);
const files = [], dirs = [];
(function walk(abs, rel) {
  if (files.length > 30000) return;
  let ents;
  try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.isSymbolicLink() || e.name.startsWith('.')) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (ignore.has(e.name)) continue;
      dirs.push(r); walk(path.join(abs, e.name), r);
    } else files.push(r);
  }
})(root, '');

// ---------- preset ----------
const pkg = (() => { try { return JSON.parse(readText(path.join(root, 'package.json')) || 'null'); } catch { return null; } })();
const isMono = exists(path.join(root, 'apps')) || exists(path.join(root, 'packages')) || exists(path.join(root, 'pnpm-workspace.yaml')) || Boolean(pkg && pkg.workspaces);
const preset = presetArg === 'auto' ? (isMono ? 'monorepo' : 'single') : presetArg;

// ---------- folder sah di root (termasuk yang didaftarkan di AGENTS.md) ----------
const allowedDirs = new Set([...R.root_allowed_dirs.common, ...(R.root_allowed_dirs[preset] || [])]);
let layoutSection = false;
{
  const t = readText(path.join(root, 'AGENTS.md'));
  const m = t && t.match(/^##\s+Repository layout[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
  if (m) {
    layoutSection = true;
    for (const x of m[1].matchAll(/`([^`\s]+)`/g)) {
      const first = x[1].replace(/^\.\//, '').split('/')[0];
      if (/^[A-Za-z0-9._-]+$/.test(first)) allowedDirs.add(first);
    }
  }
}

const out = [];
const add = (sev, p, msg, hint) => out.push({ sev, p, msg, hint });
const codeExt = new Set(R.code_extensions);
const allowedFile = (n) => R.root_allowed_file_patterns.some((re) => new RegExp(re).test(n));
const moves = R.dir_moves[preset] || {};
const stemOf = (n) => n.split('.')[0];
const extOf = (n) => (n.includes('.') ? n.split('.').pop().toLowerCase() : '');

// ---------- cek root ----------
const rootEnts = fs.readdirSync(root, { withFileTypes: true }).filter((e) => !e.name.startsWith('.') && !e.isSymbolicLink());
for (const e of rootEnts) {
  if (e.isDirectory()) {
    if (ignore.has(e.name) || allowedDirs.has(e.name)) continue;
    const dest = moves[e.name];
    add('WARN', e.name + '/', 'folder di root tidak terdaftar', dest ? `pindahkan ke ${dest}` : 'daftarkan di "## Repository layout" atau pindahkan');
  } else {
    if (allowedFile(e.name)) continue;
    const stem = stemOf(e.name), ext = extOf(e.name);
    if (codeExt.has(ext)) {
      const m = stem.match(/^scripts?[-_.](.+)$/i);
      let hint;
      if (m) hint = `scripts/${toKebab(m[1])}.${e.name.split('.').slice(1).join('.')}`;
      else if (R.script_hint_prefixes.some((p) => stem.toLowerCase().startsWith(p))) hint = `scripts/${toKebab(stem)}.${e.name.split('.').slice(1).join('.')}`;
      else if (/\.(test|spec)\./.test(e.name)) hint = `tests/${e.name}`;
      else hint = 'skrip -> scripts/; kode aplikasi -> src/ (atau apps/<nama>/src/)';
      add('ERROR', e.name, 'file kode di root', hint);
    } else {
      add('WARN', e.name, 'file tidak dikenal di root', 'pindahkan ke folder yang sesuai atau tambahkan polanya ke layout-rules.json');
    }
  }
}

// ---------- cek penamaan ----------
const exemptDirs = new Set(R.naming_exempt_dirs);
const exemptStems = new Set(R.exempt_stems);
const forbidden = new Set(R.forbidden_words);
const digitAllow = new Set(R.digit_suffix_allow);
const generic = new Set(R.generic_names);
const pascalExt = new Set(R.pascal_ext);
const kebabRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const specialStart = (n) => R.exempt_prefix_chars.includes(n[0]);

for (const f of files) {
  const segs = f.split('/');
  if (segs.length < 2) continue;
  if (segs.slice(0, -1).some((s) => exemptDirs.has(s))) continue;
  const name = segs[segs.length - 1], dir = segs[segs.length - 2];
  if (specialStart(name) || name.endsWith('.d.ts')) continue;
  const stem = stemOf(name), ext = extOf(name);
  if (!stem || exemptStems.has(stem) || /^[A-Z0-9_]+$/.test(stem)) continue;

  if (/\s/.test(name)) { add('ERROR', f, 'nama file mengandung spasi', `${segs.slice(0, -1).join('/')}/${toKebab(stem)}.${name.split('.').slice(1).join('.')}`); continue; }

  // awalan mengulang nama folder (script-judul.js di scripts/)
  const singular = dir.replace(/s$/, '');
  const low = stem.toLowerCase();
  if (low.startsWith(dir.toLowerCase() + '-') || low.startsWith(singular.toLowerCase() + '-') || low.startsWith(singular.toLowerCase() + '_')) {
    const rest = stem.slice(low.startsWith(dir.toLowerCase() + '-') ? dir.length + 1 : singular.length + 1);
    add(dir === 'scripts' ? 'ERROR' : 'WARN', f, `awalan mengulang nama folder "${dir}"`, `${segs.slice(0, -1).join('/')}/${toKebab(rest)}.${name.split('.').slice(1).join('.')}`);
  }

  // kata sementara/duplikat di akhir nama
  const tokens = low.split(/[-_]/).filter(Boolean);
  let last = tokens[tokens.length - 1];
  if (/^\d+$/.test(last) && tokens.length > 1) last = tokens[tokens.length - 2];
  if (forbidden.has(last)) add('ERROR', f, `nama sementara/duplikat ("${last}")`, 'beri nama sesuai isi, atau hapus kalau memang salinan');
  else if (/^v\d+$/.test(tokens[tokens.length - 1]) && tokens.length > 1) add('WARN', f, 'akhiran versi (v2, dst.)', 'ganti file lama, jangan menyimpan dua versi berdampingan');
  else if (/\d$/.test(stem) && !/^\d/.test(stem) && !digitAllow.has(low) && !tokens.some((t) => digitAllow.has(t))) add('WARN', f, 'nama berakhiran angka (duplikat/versi?)', 'beri nama sesuai isi');

  // gaya penamaan
  const okPascal = pascalExt.has(ext) && (/^[A-Z][A-Za-z0-9]*$/.test(stem) || /^use[A-Z][A-Za-z0-9]*$/.test(stem));
  if (!kebabRe.test(stem) && !okPascal) add('WARN', f, 'gaya nama bukan kebab-case', `${segs.slice(0, -1).join('/')}/${toKebab(stem)}.${name.split('.').slice(1).join('.')}`);

  if (generic.has(low)) add('WARN', f, `nama terlalu generik ("${stem}")`, 'pecah menurut tema, mis. lib/dates.ts, lib/money.ts');
}

// nama folder
for (const d of dirs) {
  const segs = d.split('/'), name = segs[segs.length - 1];
  if (segs.some((s) => exemptDirs.has(s)) || specialStart(name) || name.includes('.') || name.startsWith('__')) continue;
  const inComponents = segs.some((s) => ['components', 'ui', 'design-system'].includes(s));
  if (/\s/.test(name) || /_/.test(name) || (/[A-Z]/.test(name) && !inComponents)) add('WARN', d + '/', 'nama folder bukan kebab-case', segs.slice(0, -1).concat(toKebab(name)).join('/') + '/');
  if (generic.has(name.toLowerCase())) add('WARN', d + '/', `nama folder terlalu generik ("${name}")`, 'beri nama menurut peran');
}

// ---------- cek struktur monorepo ----------
if (preset === 'monorepo') {
  for (const base of ['apps', 'packages']) {
    for (const d of dirs.filter((x) => x.split('/').length === 2 && x.startsWith(base + '/'))) {
      if (!exists(path.join(root, d, 'package.json'))) add('WARN', d + '/', `${base === 'apps' ? 'app' : 'paket'} tanpa package.json`, 'tambahkan package.json atau pindahkan folder ini');
    }
  }
  const shared = path.join(root, 'packages', 'shared');
  if (exists(shared)) {
    for (const f of files.filter((x) => x.startsWith('packages/shared/') && x.split('/').length === 3)) {
      const n = f.split('/')[2];
      if (codeExt.has(extOf(n)) && !/^index\./.test(n)) add('WARN', f, 'kode langsung di packages/shared', 'taruh di subfolder bertema (ui/, design-system/, lib/)');
    }
  }
  if (files.some((f) => f.startsWith('src/') && codeExt.has(extOf(f)))) add('WARN', 'src/', 'ada kode di src/ root padahal preset monorepo', 'pindahkan ke apps/<nama>/src/ atau packages/<nama>/src/');
}

// ---------- laporan ----------
const errs = out.filter((x) => x.sev === 'ERROR'), warns = out.filter((x) => x.sev === 'WARN');
console.log(`# Audit tata letak: ${path.basename(root)}`);
console.log(`Preset: ${preset}${presetArg === 'auto' ? ' (terdeteksi)' : ''}; section "## Repository layout" di AGENTS.md: ${layoutSection ? 'ada' : 'belum ada'}`);
console.log(`Temuan: ${errs.length} ERROR, ${warns.length} WARN (dari ${files.length} file, ${dirs.length} folder)`);
const cap = showAll ? Infinity : 40;
for (const [label, list] of [['ERROR', errs], ['WARN', warns]]) {
  if (!list.length) continue;
  console.log('');
  console.log(`## ${label}`);
  for (const x of list.slice(0, cap)) console.log(`- ${x.p}: ${x.msg}${x.hint ? ` -> ${x.hint}` : ''}`);
  if (list.length > cap) console.log(`- ... +${list.length - cap} lagi (gunakan --all)`);
}
if (!out.length) console.log('\nTidak ada pelanggaran.');
console.log('');
console.log('Ini hanya audit. Memindahkan file butuh persetujuan user (lihat mode tidy di SKILL.md).');
process.exit(strict && errs.length ? 1 : 0);

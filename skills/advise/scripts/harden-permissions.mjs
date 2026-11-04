#!/usr/bin/env node
// harden-permissions.mjs: memeriksa dan (atas persetujuan user) menambah aturan izin
// untuk file rahasia (.env*, .dev.vars*) di opencode.json.
//
// Pemakaian:
//   node harden-permissions.mjs <path-proyek>            # mode cek, TIDAK menulis
//   node harden-permissions.mjs <path-proyek> --apply    # menulis; jalankan hanya setelah user setuju
//
// Prinsip: hanya MENAMBAH aturan yang belum ada. Aturan milik user tidak ditimpa.
// File berisi komentar (JSONC) tidak ditulis ulang agar komentar tidak hilang.
// Sintaks mengikuti https://opencode.ai/.pawang/permissions (aturan terakhir yang cocok menang).

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());

// Aturan deny diletakkan lebih dulu, lalu allow untuk file contoh (aturan terakhir menang).
const RULES = {
  read: {
    '*.dev.vars': 'deny', '*.dev.vars.*': 'deny', '*.dev.vars.example': 'allow',
    '*.env': 'deny', '*.env.*': 'deny', '*.env.example': 'allow',
  },
  edit: {
    '*.dev.vars': 'deny', '*.dev.vars.*': 'deny', '*.dev.vars.example': 'allow',
    '*.env': 'deny', '*.env.*': 'deny', '*.env.example': 'allow',
  },
  bash: {
    '*.dev.vars': 'deny', '*.dev.vars *': 'deny', '*.dev.vars.*': 'deny', '*.dev.vars.example': 'allow',
    '*.env': 'deny', '*.env *': 'deny', '*.env.*': 'deny', '*.env.example': 'allow',
  },
};

function stripJsonc(s) {
  let o = '', i = 0, inStr = false;
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (inStr) {
      o += c;
      if (c === '\\') { o += s[i + 1] ?? ''; i += 2; continue; }
      if (c === '"') inStr = false;
      i++; continue;
    }
    if (c === '"') { inStr = true; o += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    o += c; i++;
  }
  return o.replace(/,\s*([}\]])/g, '$1');
}

// ---- cari file konfigurasi ----
let file = null, raw = null;
for (const n of ['opencode.json', 'opencode.jsonc']) {
  const f = path.join(root, n);
  if (fs.existsSync(f)) { file = f; raw = fs.readFileSync(f, 'utf8'); break; }
}

let cfg, plainJson = true;
if (file) {
  try { cfg = JSON.parse(raw); } catch {
    plainJson = false;
    try { cfg = JSON.parse(stripJsonc(raw)); } catch {
      console.error(`Gagal mem-parse ${path.basename(file)}. Perbaiki sintaksnya dulu atau tempel blok di bawah secara manual.`);
      process.exit(2);
    }
  }
} else {
  cfg = { $schema: 'https://opencode.ai/config.json' };
}

// ---- gabungkan (hanya tambah) ----
const added = [], conflicts = [];
const before = JSON.stringify(cfg);
if (cfg.permission === undefined) cfg.permission = {};
if (typeof cfg.permission === 'string') cfg.permission = { '*': cfg.permission };
const globalDefault = cfg.permission['*'] ?? 'allow';
for (const [tool, rules] of Object.entries(RULES)) {
  let cur = cfg.permission[tool];
  if (cur === undefined) { cur = { '*': globalDefault }; added.push(`permission.${tool}."*" = ${globalDefault} (mempertahankan perilaku bawaan)`); }
  else if (typeof cur === 'string') { cur = { '*': cur }; }
  for (const [pat, act] of Object.entries(rules)) {
    if (pat in cur) {
      if (cur[pat] !== act) conflicts.push(`permission.${tool}."${pat}" sudah "${cur[pat]}" (usulan: "${act}"), tidak diubah`);
    } else {
      cur[pat] = act;
      added.push(`permission.${tool}."${pat}" = ${act}`);
    }
  }
  cfg.permission[tool] = cur;
}
const changed = JSON.stringify(cfg) !== before;

// ---- peringatan: izin per-agent bisa menimpa ----
const agentOverrides = Object.entries(cfg.agent || {}).filter(([, a]) => a && a.permission).map(([k]) => k);

const rel = file ? path.basename(file) : 'opencode.json (belum ada)';
console.log(`# Pengamanan file rahasia: ${rel}`);
console.log('');
if (!changed) {
  console.log('Aturan baca/ubah/bash untuk .env* dan .dev.vars* sudah lengkap. Tidak ada perubahan.');
} else {
  console.log(`Aturan yang akan ditambahkan (${added.length}):`);
  for (const a of added) console.log('  + ' + a);
}
if (conflicts.length) {
  console.log('');
  console.log('Konflik dengan aturan yang sudah ada (tidak diubah, tanyakan user):');
  for (const c of conflicts) console.log('  ! ' + c);
}
if (agentOverrides.length) {
  console.log('');
  console.log(`Perhatian: agent ${agentOverrides.join(', ')} punya blok permission sendiri yang bisa menimpa aturan global. Periksa manual.`);
}

if (changed && !apply) {
  console.log('');
  console.log('Mode cek: belum ada yang ditulis. Setelah user setuju, jalankan lagi dengan --apply.');
  if (file && !plainJson) console.log(`Catatan: ${path.basename(file)} berisi komentar, jadi --apply tidak akan menulis ulang. Tempel blok "permission" hasil gabungan di bawah secara manual.`);
}

if (changed && (apply || (file && !plainJson))) {
  if (file && !plainJson) {
    console.log('');
    console.log('Blok permission hasil gabungan (tempel manual ke file konfigurasi):');
    console.log(JSON.stringify({ permission: cfg.permission }, null, 2));
  } else if (apply) {
    const target = file || path.join(root, 'opencode.json');
    fs.writeFileSync(target, JSON.stringify(cfg, null, 2) + '\n');
    console.log('');
    console.log(`Ditulis ke ${path.basename(target)}.`);
  }
}

console.log('');
console.log('Batas pengamanan ini (sampaikan ke user apa adanya):');
console.log('- Izin bash berbasis pola, tidak kedap: pembaca lain (mis. python -c, node -e) bisa lolos.');
console.log('- Izin grep mencocokkan pola pencarian, bukan path, jadi pencarian isi bisa menyentuh file rahasia.');
console.log('- Pengaman tambahan: pakai nilai dummy/dev di .dev.vars lokal, pasang secret asli dengan `wrangler secret put`, dan pastikan file rahasia ada di .gitignore.');

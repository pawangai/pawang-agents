#!/usr/bin/env node
// docs-health.mjs: mengukur kesehatan file standar (AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/conventions/), .pawang/, dan skill terpasang di tingkat proyek.
// HANYA BACA, tanpa dependensi (Node 18+). Tidak membaca .env/.dev.vars.
//
// Pemakaian: node docs-health.mjs [path-proyek] [--strict] [--all]
//   --strict exit code 1 bila ada ERROR
//   --all    tampilkan semua temuan (default dibatasi 25 per tingkat)
//
// Yang diukur:
//  0. File standar di root: ada atau tidak, masih template atau tidak, CONTEXT.md punya "## Features", .pawang/specs/ (header, status, spec aktif, temuan belum tuntas),
//     DESIGN.md punya front matter (name, colors), urutan bagian, dan tanpa judul ganda
//  1. AGENTS.md (root dan semua yang bersarang, maks 4 tingkat: apps/api, packages/shared/lib, infra): ukuran, tautan rusak, tautan tanpa pemicu "kapan dibaca";
//     yang bersarang juga diperiksa: ukuran (target 15-50), pengulangan isi root, dan apakah root menyebut foldernya
//  2. .pawang/: file yang terlalu panjang, yatim (tidak ditautkan), ADR tanpa Status, handoff usang
//  3. Skill di tingkat proyek: jumlah, biaya konteks, frontmatter, tumpang tindih. Biaya konteks hanya
//     menghitung skill yang TERLIHAT agent: opencode.json `permission.skill` dengan "deny" menyembunyikan skill
//     dari daftar agent, jadi deskripsinya tidak dimuat. Override per-agent tidak dibaca.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const strict = args.includes('--strict');
const showAll = args.includes('--all');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) { console.error('Folder proyek tidak ditemukan: ' + root); process.exit(2); }

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const exists = (f) => { try { fs.accessSync(f); return true; } catch { return false; } };
const isDir = (f) => { try { return fs.statSync(f).isDirectory(); } catch { return false; } };
const ls = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
const lines = (t) => t.split('\n').length;
const tokens = (chars) => Math.ceil(chars / 4); // perkiraan kasar
const findings = [];
const add = (sev, area, msg, hint) => findings.push({ sev, area, msg, hint });
const rel = (f) => path.relative(root, f) || '.';

// ---------- 0. file standar ----------
const stdFiles = [];
const spec = read(path.join(root, 'CONTEXT.md'));
if (spec == null) add('WARN', 'CONTEXT.md', 'tidak ada CONTEXT.md', 'jalankan /context (proyek baru) atau /adopt (kode sudah ada)');
else {
  const isTemplate = /\*\*Feature one\*\* - description/.test(spec) || /^What problem does this project solve/m.test(spec);
  stdFiles.push(`CONTEXT.md: ${isTemplate ? 'masih template' : 'terisi'}, ${lines(spec)} baris`);
  if (isTemplate) add('WARN', 'CONTEXT.md', 'masih berisi teks template', 'jalankan /context atau /adopt');
  if (!/^## Features\s*$/m.test(spec)) add('ERROR', 'CONTEXT.md', 'bagian "## Features" tidak ada', 'jalankan /context untuk menormalkan');
  else if (!/^- \[[ xX]\] /m.test(spec)) add('WARN', 'CONTEXT.md', 'daftar fitur tanpa checkbox', 'jalankan /context untuk memberi nomor dan checkbox');
}
{
  // satu berkas spec per pekerjaan; spec aktif = Status bukan "done" (lihat .agents/README.md, bagian Specs)
  const specsDir = path.join(root, '.pawang', 'specs');
  if (isDir(specsDir)) {
    const specFiles = ls(specsDir).filter((e) => /\.md$/i.test(e));
    const notDone = [];
    let unresolved = 0;
    for (const e of specFiles) {
      const t = read(path.join(specsDir, e)) || '';
      const where = `.pawang/specs/${e}`;
      const missing = ['Type', 'Status', 'Branch'].filter((k) => !new RegExp(`^\\*\\*${k}:\\*\\*\\s*\\S`, 'm').test(t));
      if (missing.length) add('ERROR', where, `header tanpa ${missing.join(', ')}`, 'tambahkan baris **Type:**, **Status:**, dan **Branch:** di bawah judul');
      const status = ((t.match(/^\*\*Status:\*\*\s*(.+)$/m) || [])[1] || '').trim();
      if (status && !/^(not started|in progress|verified|done)\b/.test(status)) add('WARN', where, `Status tidak baku: "${status}"`, 'pakai not started / in progress / verified / done');
      if (!/^done\b/.test(status)) notDone.push(where);
      unresolved += (t.match(/^### F-\d+ \[P[0-3]\] (open|fixed|unverified)\b/gm) || []).length;
    }
    stdFiles.push(`.pawang/specs: ${specFiles.length} spec, ${notDone.length} belum selesai, ${unresolved} temuan belum tuntas`);
    if (notDone.length > 1) add('WARN', '.pawang/specs', `${notDone.length} spec belum selesai (${notDone.join(', ')})`, 'satu checkout hanya boleh punya satu spec aktif; selesaikan dengan /complete atau pindahkan ke worktree sendiri');
    if (unresolved) add('INFO', '.pawang/specs', `${unresolved} temuan open/fixed/unverified di semua spec`, 'jalankan /status untuk daftarnya dan /audit untuk menutupnya');
  }
}
const design = read(path.join(root, 'DESIGN.md'));
const specHasUi = spec != null && !/^## 5\. UI\/UX\s*\n+\s*(No UI|Tanpa UI)/im.test(spec);
if (design == null) { if (specHasUi && spec != null) add('WARN', 'DESIGN.md', 'tidak ada DESIGN.md padahal CONTEXT.md menyebut UI', 'jalankan /design'); }
else {
  stdFiles.push(`DESIGN.md: ${lines(design)} baris`);
  const fm = design.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) add('ERROR', 'DESIGN.md', 'tidak ada front matter YAML', 'tambahkan version, name, colors (format Google DESIGN.md)');
  else {
    if (!/^name:\s*\S/m.test(fm[1])) add('ERROR', 'DESIGN.md', 'front matter tanpa name', 'tambahkan name:');
    if (!/^colors:/m.test(fm[1])) add('ERROR', 'DESIGN.md', 'front matter tanpa colors', 'tambahkan colors:');
  }
  const order = ['Overview', 'Colors', 'Typography', 'Layout', 'Elevation', 'Shapes', 'Components', "Do's and Don'ts"];
  const heads = [...design.replace(/<!--[\s\S]*?-->/g, '').matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
  const dup = heads.filter((h, i) => heads.indexOf(h) !== i);
  if (dup.length) add('ERROR', 'DESIGN.md', `judul ganda: ${[...new Set(dup)].join(', ')}`, 'hapus duplikat; konsumen spec menolaknya');
  const idx = heads.map((h) => order.findIndex((o) => h.startsWith(o))).filter((i) => i >= 0);
  if (idx.some((v, i) => i && v < idx[i - 1])) add('WARN', 'DESIGN.md', 'urutan bagian tidak sesuai spec', 'urutan: Overview, Colors, Typography, Layout, Elevation, Shapes, Components, Do\'s and Don\'ts');
  if (/#1B2A41|^name: Project Name/m.test(design)) add('WARN', 'DESIGN.md', 'masih berisi nilai template', 'jalankan /design');
  add('INFO', 'DESIGN.md', 'validasi penuh (referensi token, kontras WCAG)', 'npx -y @google/design.md lint DESIGN.md');
}
{
  const f = '.pawang/conventions/README.md';
  const t = read(path.join(root, f));
  if (t == null) add('WARN', f, `tidak ada ${f}`, 'jalankan /adopt atau salin template');
  else stdFiles.push(`${f}: ${lines(t)} baris`);
}

// ---------- 1. AGENTS.md ----------
const agentFiles = [];
if (exists(path.join(root, 'AGENTS.md'))) agentFiles.push(path.join(root, 'AGENTS.md'));
// AGENTS.md bersarang di kedalaman berapa pun (maks 4 tingkat): apps/api, packages/shared/lib, infra, dst.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.wrangler', '.turbo', '.next', '.svelte-kit', '.output', 'vendor', '.terraform', '.pawang', '.agents', '.opencode']);
const findNested = (dir, depth) => {
  if (depth > 4) return;
  for (const n of ls(dir)) {
    if (SKIP_DIRS.has(n)) continue;
    const d = path.join(dir, n);
    if (!isDir(d)) continue;
    const f = path.join(d, 'AGENTS.md');
    if (exists(f)) agentFiles.push(f);
    findNested(d, depth + 1);
  }
};
findNested(root, 1);
const TRIGGER = /baca|saat|sebelum|ketika|bila|kalau|jika|read|when|before|if /i;
const agentInfo = [];
let agentsText = '';
for (const f of agentFiles) {
  const t = read(f) || '';
  agentsText += '\n' + t;
  const n = lines(t);
  agentInfo.push({ f: rel(f), lines: n, tok: tokens(t.length) });
  const where = rel(f);
  const isNested = path.dirname(f) !== root;
  if (isNested) {
    // AGENTS.md bersarang: target 15-50 baris, hanya hal khusus folder; tidak mengulang root.
    if (n > 100) add('ERROR', where, `${n} baris (AGENTS.md bersarang: target 15-50, batas 100)`, 'pindahkan ke .pawang/ atau ke AGENTS.md root bila berlaku global');
    else if (n > 60) add('WARN', where, `${n} baris (AGENTS.md bersarang: target 15-50)`, 'pangkas yang sudah ada di root; sisakan perintah, larangan, dan jebakan folder ini');
    const rootText = read(path.join(root, 'AGENTS.md')) || '';
    const rootSet = new Set(rootText.split('\n').map((l) => l.trim()).filter((l) => l.length >= 30));
    const dupes = t.split('\n').map((l) => l.trim()).filter((l) => l.length >= 30 && rootSet.has(l));
    if (dupes.length >= 2) add('WARN', where, `${dupes.length} baris sama persis dengan AGENTS.md root`, 'hapus pengulangan; aturan root sudah berlaku di folder ini');
    if (/^##\s+(Prinsip kerja|Proportional engineering|Communication|Commits|Writing)\b/im.test(t)) add('WARN', where, 'mengulang bagian bawaan root (Prinsip kerja, Proportional engineering, Communication, Commits, atau Writing)', 'hapus; sumber kebenarannya hanya AGENTS.md root');
    if (rootText && !rootText.includes(rel(path.dirname(f)) + '/')) add('INFO', where, `root tidak menyebut ${rel(path.dirname(f))}/`, 'tambahkan satu baris di AGENTS.md root: baca AGENTS.md folder itu saat mengubahnya');
  }
  if (!isNested && n > 150) add('ERROR', where, `${n} baris (target 40-100, batas 150)`, 'pindahkan detail ke .pawang/ dan tautkan dengan pemicu kapan dibaca (edit AGENTS.md)');
  else if (!isNested && n > 100) add('WARN', where, `${n} baris (target 40-100)`, 'mendekati batas; mulai pindahkan bagian spesifik area ke .pawang/');
  const baseDir = path.dirname(f);
  t.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      let p = m[1].replace(/[:,;.]+$/, '');
      if (!/\//.test(p) && !/\.(md|json|jsonc|mjs|ts|toml|yaml|yml)$/.test(p)) continue;
      if (/^(https?:|npm|npx|pnpm|git|\.\.\.)/.test(p) || /[*{}$|=]/.test(p) || p.startsWith('-') || /^[A-Z]:/.test(p) || /^\/(?!\.pawang)/.test(p)) continue;
      const hasPlaceholder = p.includes('<');
      const check = hasPlaceholder ? p.slice(0, p.indexOf('<')).replace(/\/?[^/]*$/, '') || '.' : p;
      const ok = [root, baseDir].some((b) => exists(path.join(b, check)));
      if (!ok && /^(\.pawang|docs|apps|packages|src|scripts|e2e|tests|\.opencode|\.agents|\.claude|[\w-]+\/)/.test(p) && !/^(e\.g\.|mis\.)/.test(p)) {
        add('ERROR', `${where}:${i + 1}`, `tautan rusak: ${p}`, 'perbarui path atau hapus barisnya');
      } else if (ok && /^\.pawang\//.test(p) && !TRIGGER.test(line)) {
        add('WARN', `${where}:${i + 1}`, `tautan tanpa pemicu "kapan dibaca": ${p}`, 'tambahkan: baca saat/sebelum ...');
      }
    }
  });
}
if (!agentFiles.length) add('WARN', 'AGENTS.md', 'tidak ada AGENTS.md', 'jalankan /adopt');

// ---------- 2. .pawang/ ----------
const docsDir = path.join(root, '.pawang');
const docFiles = [];
(function walk(d) {
  for (const e of ls(d)) {
    if (e.startsWith('.')) continue;
    const f = path.join(d, e);
    if (isDir(f)) walk(f); else if (/\.(md|mdx)$/i.test(e)) docFiles.push(f);
  }
})(docsDir);
const docsReadme = read(path.join(docsDir, 'README.md')) || '';
const linkText = agentsText + '\n' + docsReadme;
let docLines = 0;
for (const f of docFiles) {
  const t = read(f) || '', n = lines(t), r = rel(f).split(path.sep).join('/');
  docLines += n;
  if (/\/_archive\//.test(r) || /^\.pawang\/specs\//.test(r)) continue;
  if (n > 200) add('WARN', r, `${n} baris (ideal 50-150)`, 'pecah per area tugas');
  // dianggap tertaut: disebut persis, atau folder induknya disebut (.pawang/decisions/), atau ada pola (.pawang/handoff/<topik>.md)
  const covered = linkText.includes(r)
    || linkText.split(/\s|`/).some((w) => w.startsWith('.pawang/') && ((w.endsWith('/') && r.startsWith(w)) || (w.includes('<') && r.startsWith(w.slice(0, w.indexOf('<'))))));
  if (!covered && r !== '.pawang/README.md') add('WARN', r, 'yatim: tidak ditautkan dari AGENTS.md atau .pawang/README.md', 'tambahkan ke peta dokumen dengan pemicu kapan dibaca, atau arsipkan');
  if (/^\.pawang\/decisions\/(?!README)/.test(r)) {
    const st = (t.match(/^\*{0,2}Status:\*{0,2}\s*(.+)$/m) || [])[1];
    if (!st) add('ERROR', r, 'keputusan tanpa baris "Status:"', 'tambahkan Status: Accepted atau Superseded by NNNN');
    else if (!/^(Accepted|Superseded|Proposed|Deprecated|Rejected)/i.test(st.trim())) add('WARN', r, `Status tidak baku: "${st.trim()}"`, 'pakai Accepted / Superseded by NNNN / Proposed / Deprecated / Rejected');
    else if (/^Superseded/i.test(st.trim()) && !/\d{3,4}/.test(st)) add('WARN', r, 'Superseded tanpa nomor penggantinya', 'tulis Superseded by NNNN');
  }
  if (/^\.pawang\/handoff\/(?!_archive)/.test(r)) {
    const d = (t.match(/Diperbarui:\s*(\d{4}-\d{2}-\d{2})/) || [])[1];
    const when = d ? new Date(d) : fs.statSync(f).mtime;
    const age = Math.floor((Date.now() - when.getTime()) / 86400000);
    if (age > 14) add('WARN', r, `handoff berumur ${age} hari${d ? '' : ' (dari waktu file; tidak ada baris Diperbarui)'}`, 'verifikasi ke git lalu perbarui, arsipkan, atau hapus; promosikan keputusan permanen');
  }
}

// ---------- 3. skill tingkat proyek ----------
// Aturan `permission.skill` OpenCode: pola berurutan, aturan terakhir yang cocok menang; tanpa aturan = allow.
function skillRules() {
  for (const f of ['opencode.json', 'opencode.jsonc']) {
    const t = read(path.join(root, f));
    if (t == null) continue;
    try {
      const cfg = JSON.parse(t.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));
      const sp = cfg && cfg.permission && cfg.permission.skill;
      if (typeof sp === 'string') return [['*', sp]];
      if (sp && typeof sp === 'object') return Object.entries(sp);
      return [];
    } catch { add('WARN', f, 'tidak bisa dibaca sebagai JSON; semua skill dianggap terlihat agent', 'perbaiki sintaks atau hapus komentar'); return []; }
  }
  return [];
}
const RULES = skillRules();
const globRe = (g) => new RegExp('^' + g.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
function skillAction(name) {
  let act = 'allow';
  for (const [pat, a] of RULES) if (globRe(pat).test(name)) act = a;
  return act;
}
const SKILL_DIRS = ['.agents/skills', '.opencode/skills', '.opencode/skill', '.claude/skills'];
const skills = [], seenReal = new Set();
function frontmatter(t) {
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {}, ls_ = m[1].split('\n');
  for (let i = 0; i < ls_.length; i++) {
    const kv = ls_[i].match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^[>|][-+]?$/.test(v)) { v = ''; while (i + 1 < ls_.length && /^\s+/.test(ls_[i + 1])) v += ' ' + ls_[++i].trim(); }
    fm[kv[1]] = v.replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}
for (const sd of SKILL_DIRS) {
  const base = path.join(root, sd);
  for (const n of ls(base)) {
    const dir = path.join(base, n);
    if (!isDir(dir)) continue;
    let real; try { real = fs.realpathSync(dir); } catch { continue; }
    if (seenReal.has(real)) continue; // symlink ke salinan yang sama: jangan dihitung dua kali
    seenReal.add(real);
    const sk = read(path.join(dir, 'SKILL.md'));
    const where = `${sd}/${n}`;
    if (sk == null) { add('ERROR', where, 'folder skill tanpa SKILL.md', 'hapus atau lengkapi'); continue; }
    const fm = frontmatter(sk);
    if (!fm || !fm.name || !fm.description) { add('ERROR', where, 'frontmatter tidak lengkap (perlu name dan description)', 'perbaiki SKILL.md'); continue; }
    if (fm.name !== n) add('WARN', where, `name "${fm.name}" tidak sama dengan nama folder`, 'samakan agar mudah dilacak');
    if (fm.description.length > 1024) add('ERROR', where, `deskripsi ${fm.description.length} karakter (batas 1024)`, 'persingkat');
    else if (fm.description.length > 400 && skillAction(fm.name) !== 'deny') add('WARN', where, `deskripsi ${fm.description.length} karakter; dimuat di setiap sesi`, 'persingkat menjadi satu atau dua kalimat: apa dan kapan dipakai');
    const scripts = ls(path.join(dir, 'scripts')).length;
    skills.push({ where, name: fm.name, desc: fm.description, lines: lines(sk), scripts, chars: fm.name.length + fm.description.length, action: skillAction(fm.name) });
  }
}
const kw = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9À-ɏ ]/g, ' ').split(/\s+/).filter((w) => w.length > 4));
const stop = new Set(['dengan', 'untuk', 'skill', 'gunakan', 'ketika', 'saat', 'yang', 'dari', 'atau', 'agent', 'proyek', 'digunakan', 'dokumen', 'using', 'when', 'with', 'user', 'files']);
const visible = skills.filter((k) => k.action !== 'deny'), hidden = skills.length - visible.length;
for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
  const a = [...kw(visible[i].desc)].filter((w) => !stop.has(w)), b = new Set([...kw(visible[j].desc)].filter((w) => !stop.has(w)));
  const inter = a.filter((w) => b.has(w)).length, uni = new Set([...a, ...b]).size;
  if (uni && inter / uni >= 0.4 && inter >= 4) add('WARN', `${visible[i].name} <> ${visible[j].name}`, `deskripsi tumpang tindih (${Math.round((inter / uni) * 100)}% kata kunci sama)`, 'gabungkan, atau perjelas batas pemicunya agar agent tidak ragu memilih');
}
const skillTok = tokens(visible.reduce((s, k) => s + k.chars, 0));
const allTok = tokens(skills.reduce((s, k) => s + k.chars, 0));
if (visible.length > 10) add('WARN', 'skill', `${visible.length} skill terlihat agent (disarankan maksimal sekitar 10)`, 'hapus yang jarang dipakai; fakta statis proyek lebih baik jadi .pawang/, bukan skill');

// ---------- laporan ----------
const errs = findings.filter((x) => x.sev === 'ERROR'), warns = findings.filter((x) => x.sev === 'WARN'), infos = findings.filter((x) => x.sev === 'INFO');
const out = [];
out.push(`# Kesehatan state dan skill: ${path.basename(root)}`);
out.push('');
out.push('## Ringkasan');
for (const f of stdFiles) out.push(`- ${f}`);
for (const a of agentInfo) out.push(`- ${a.f}: ${a.lines} baris, ≈${a.tok} token (dibaca di SETIAP sesi)`);
if (!agentInfo.length) out.push('- AGENTS.md: tidak ada');
out.push(`- .pawang/: ${docFiles.length} file, ${docLines} baris`);
out.push(`- Skill tingkat proyek: ${skills.length} terpasang, ${visible.length} terlihat agent, deskripsi yang terlihat ≈${skillTok} token (dimuat di SETIAP sesi)`);
if (hidden) out.push(`- ${hidden} skill disembunyikan oleh permission.skill di opencode.json (≈${allTok - skillTok} token tidak dimuat; dijalankan lewat command)`);
out.push(`- Temuan: ${errs.length} ERROR, ${warns.length} WARN`);
if (skills.length) {
  out.push('');
  out.push('## Skill terpasang (tingkat proyek)');
  for (const s of skills.sort((a, b) => (a.action === 'deny') - (b.action === 'deny') || b.chars - a.chars)) out.push(`- ${s.name}: ${s.action === 'deny' ? 'tersembunyi, ' : ''}deskripsi ${s.desc.length} karakter, SKILL.md ${s.lines} baris, ${s.scripts} skrip (${s.where})`);
  out.push('Catatan: skill global di folder home dan override permission per-agent tidak dipindai; skill global yang terlihat ikut membebani konteks.');
}
const cap = showAll ? Infinity : 25;
for (const [label, list] of [['ERROR', errs], ['WARN', warns], ['INFO', infos]]) {
  if (!list.length) continue;
  out.push('');
  out.push(`## ${label}`);
  for (const x of list.slice(0, cap)) out.push(`- ${x.area}: ${x.msg}${x.hint ? ` -> ${x.hint}` : ''}`);
  if (list.length > cap) out.push(`- ... +${list.length - cap} lagi (gunakan --all)`);
}
if (!errs.length && !warns.length) { out.push(''); out.push('Tidak ada temuan.'); }
out.push('');
out.push('Ini hanya audit. Perubahan dilakukan dengan mengedit AGENTS.md atau atas persetujuan user.');
console.log(out.join('\n'));
process.exit(strict && errs.length ? 1 : 0);

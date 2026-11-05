#!/usr/bin/env node
// Validasi struktur semua skill: frontmatter, nama = folder, panjang description, sintaks skrip .mjs, command OpenCode.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EXTERNAL, AUTO_INVOKE, walk, parseFrontmatter, version } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const errors = [];
const err = (m) => errors.push(m);
const names = fs.readdirSync(SKILLS).filter((n) => fs.statSync(path.join(SKILLS, n)).isDirectory()).sort();
{
  const f = path.join(SKILLS, 'pawang-init', 'assets', 'VERSION');
  const expected = version();
  if (!fs.existsSync(f)) err('skills/pawang-init/assets/VERSION hilang; jalankan node scripts/build-plugin.mjs');
  else if (fs.readFileSync(f, 'utf8').trim() !== expected) err(`skills/pawang-init/assets/VERSION tidak sama dengan package.json (${expected})`);
}

for (const n of names) {
  const f = path.join(SKILLS, n, 'SKILL.md');
  if (!fs.existsSync(f)) { err(`${n}: SKILL.md tidak ada`); continue; }
  const t = fs.readFileSync(f, 'utf8');
  let fm;
  try { fm = parseFrontmatter(t); } catch (e) { err(`${n}: frontmatter tidak valid: ${e.message}`); continue; }
  if (!fm) { err(`${n}: frontmatter tidak ditemukan`); continue; }
  const name = fm.name;
  const desc = fm.description;
  if (name !== n) err(`${n}: name "${name}" tidak sama dengan nama folder`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n) || n.length > 64) err(`${n}: nama folder tidak valid`);
  if (!desc) err(`${n}: description kosong`);
  else if (desc.length > 1024) err(`${n}: description ${desc.length} karakter (maks 1024)`);
  const hasKey = fm['disable-model-invocation'] === 'true';
  if (AUTO_INVOKE.has(n) && hasKey) err(`${n}: boleh dipicu model, hapus disable-model-invocation`);
  if (!AUTO_INVOKE.has(n) && !hasKey) err(`${n}: wajib disable-model-invocation: true (hanya lewat perintah)`);
  // Teks skill harus tidak bergantung lokasi: tanpa .agents/skills/<skill>/... dan <skill-dir> wajib dijelaskan.
  const local = new RegExp('\\.agents/skills/(' + names.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).concat(EXTERNAL).join('|') + ')/');
  let usesDir = false;
  for (const rel of walk(path.join(SKILLS, n)).filter((r) => r.endsWith('.md') && !r.startsWith('assets' + path.sep + 'opencode'))) {
    const txt = fs.readFileSync(path.join(SKILLS, n, rel), 'utf8');
    if (local.test(txt)) err(`${n}/${rel}: rujukan .agents/skills/<skill>/ bergantung lokasi; pakai <skill-dir>`);
    if (txt.includes('<skill-dir>')) usesDir = true;
  }
  if (usesDir && !t.includes('`<skill-dir>` is the folder that contains this `SKILL.md`')) err(`${n}: memakai <skill-dir> tanpa catatan Paths di SKILL.md`);
  for (const rel of walk(path.join(SKILLS, n)).filter((r) => /\.(m?js)$/.test(r))) {
    const r = spawnSync(process.execPath, ['--check', path.join(SKILLS, n, rel)], { encoding: 'utf8' });
    if (r.status !== 0) err(`${n}/${rel}: sintaks salah\n${r.stderr}`);
  }
}

// Berkas agent hasil terjemahan tidak boleh memakai placeholder yang tidak didefinisikan di berkasnya sendiri.
const agentsDir = path.join(ROOT, 'agents');
if (fs.existsSync(agentsDir)) {
  for (const f of fs.readdirSync(agentsDir).filter((x) => x.endsWith('.md')).sort()) {
    const t = fs.readFileSync(path.join(agentsDir, f), 'utf8');
    if (t.includes('<skill-dir>')) err(`agents/${f}: memakai <skill-dir>; agent tidak punya catatan Paths, pakai <skills-root>`);
    if (t.includes('<skills-root>') && !t.includes('`<skills-root>` adalah folder')) err(`agents/${f}: memakai <skills-root> tanpa definisi`);
  }
}

const cmdDir = path.join(SKILLS, 'pawang-init', 'assets', 'opencode', '.opencode', 'commands');
// Skill ini hidup di repo eksternal (pawangai/pawang-skills) tetapi command OpenCode-nya tetap dikirim di sini.
const cmds = fs.readdirSync(cmdDir).map((c) => c.replace(/\.md$/, ''));
for (const c of cmds) if (!names.includes(c) && !EXTERNAL.includes(c)) err(`command OpenCode "${c}" tanpa skill`);
for (const e of EXTERNAL) {
  if (names.includes(e)) err(`skill "${e}" seharusnya eksternal, hapus dari skills/`);
  if (!cmds.includes(e)) err(`command OpenCode untuk skill eksternal "${e}" tidak ada`);
}
// Tidak ada pengecualian: setiap skill, termasuk pawang-init, harus punya command OpenCode.
for (const n of names) if (!cmds.includes(n)) err(`skill "${n}" tanpa command OpenCode`);

// Berkas turunan (agents/, manifest, marketplace) harus sinkron (dibangun oleh build-plugin.mjs).
const chk = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-plugin.mjs'), '--check'], { encoding: 'utf8' });
if (chk.status !== 0) err(`berkas turunan tidak sinkron\n${chk.stderr.trim()}`);

// Versi di package.json dan semua manifest harus sama. Tanpa ini, loop lokal lolos pada keadaan yang digagalkan CI.
const ver = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-version.mjs')], { encoding: 'utf8' });
if (ver.status !== 0) err(`versi manifest tidak sinkron\n${ver.stderr.trim()}`);

const notes = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'release-notes.mjs'), `v${JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version}`], { encoding: 'utf8' });
if (notes.status !== 0) err(notes.stderr.trim());

if (!fs.existsSync(path.join(ROOT, 'LICENSE'))) err('LICENSE tidak ada');
else if (!/^MIT License/.test(fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8'))) err('LICENSE bukan MIT');
if (JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).license !== 'MIT') err('package.json: license harus MIT');

if (errors.length) { console.error(errors.map((e) => `ERROR ${e}`).join('\n')); process.exit(1); }
console.log(`OK: ${names.length} skill, ${cmds.length} command OpenCode`);

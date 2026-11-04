#!/usr/bin/env node
// Validasi struktur semua skill: frontmatter, nama = folder, panjang description, sintaks skrip .mjs, command OpenCode.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { walk } from '../skills/pawang-init/scripts/init.mjs';
import { EXTERNAL, AUTO_INVOKE } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const errors = [];
const err = (m) => errors.push(m);
const names = fs.readdirSync(SKILLS).filter((n) => fs.statSync(path.join(SKILLS, n)).isDirectory()).sort();

for (const n of names) {
  const f = path.join(SKILLS, n, 'SKILL.md');
  if (!fs.existsSync(f)) { err(`${n}: SKILL.md tidak ada`); continue; }
  const t = fs.readFileSync(f, 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { err(`${n}: frontmatter tidak ditemukan`); continue; }
  const fm = m[1];
  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1]?.trim();
  const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1]?.trim();
  if (name !== n) err(`${n}: name "${name}" tidak sama dengan nama folder`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n) || n.length > 64) err(`${n}: nama folder tidak valid`);
  if (!desc) err(`${n}: description kosong`);
  else if (desc.length > 1024) err(`${n}: description ${desc.length} karakter (maks 1024)`);
  const hasKey = /^disable-model-invocation:\s*true$/m.test(fm);
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
  for (const rel of walk(path.join(SKILLS, n)).filter((r) => r.endsWith('.mjs'))) {
    const r = spawnSync(process.execPath, ['--check', path.join(SKILLS, n, rel)], { encoding: 'utf8' });
    if (r.status !== 0) err(`${n}/${rel}: sintaks salah\n${r.stderr}`);
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
for (const n of names) if (n !== 'pawang-init' && !cmds.includes(n)) err(`skill "${n}" tanpa command OpenCode`);

// Berkas turunan (agents/, manifest, marketplace) harus sinkron (dibangun oleh build-plugin.mjs).
const chk = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-plugin.mjs'), '--check'], { encoding: 'utf8' });
if (chk.status !== 0) err(`berkas turunan tidak sinkron\n${chk.stderr.trim()}`);

if (!fs.existsSync(path.join(ROOT, 'LICENSE'))) err('LICENSE tidak ada');
else if (!/^MIT License/.test(fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8'))) err('LICENSE bukan MIT');
if (JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).license !== 'MIT') err('package.json: license harus MIT');

if (errors.length) { console.error(errors.map((e) => `ERROR ${e}`).join('\n')); process.exit(1); }
console.log(`OK: ${names.length} skill, ${cmds.length} command OpenCode`);

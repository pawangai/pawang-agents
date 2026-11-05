#!/usr/bin/env node
// Pasang atau perbarui skill Pawang (salinan persis, tanpa penulisan ulang). Tanpa dependensi.
//   node scripts/install.mjs [--target agents|claude|both] [--global] [--project DIR]
//                            [--skills a,b,c] [--init] [--opencode] [--force] [--dry-run]
//                            [--update [--apply] [--baseline]]
// agents = .agents/skills (universal: OpenCode, Pi, Codex, Gemini CLI, dll). claude = .claude/skills (Claude Code).
// --update adalah laporan (termasuk diff kit); tambahkan --apply untuk menulis. --baseline mencatat
// kondisi proyek saat ini sebagai titik aman berikutnya setelah diff digabungkan.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { init, readLock } from '../skills/pawang-init/scripts/init.mjs';
import { renderAll as renderAgents, detectPm, readScripts } from '../skills/agents/scripts/render.mjs';
import { EXTERNAL, EXTERNAL_REPO, walk } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const DEPS_CMD = `npx skills add ${EXTERNAL_REPO} ${EXTERNAL.map((s) => `--skill ${s}`).join(' ')}`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
// Flag yang butuh nilai tidak boleh diam-diam memakai default: pemanggil salah ketik akan menulis ke folder yang salah.
for (const f of ['--target', '--project', '--skills']) {
  const i = args.indexOf(f);
  if (i >= 0 && (!args[i + 1] || args[i + 1].startsWith('--'))) { console.error(`${f} butuh nilai`); process.exit(1); }
}
if (flag('--help') || flag('-h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 5).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

const target = val('--target', 'agents');
if (!['agents', 'claude', 'both'].includes(target)) { console.error('--target harus agents, claude, atau both'); process.exit(1); }
const isGlobal = flag('--global');
const project = path.resolve(val('--project', '.'));
const dry = flag('--dry-run');
const force = flag('--force');
const update = flag('--update');
const applyUpdate = flag('--apply');
const baseline = flag('--baseline');
const all = fs.readdirSync(SKILLS).filter((n) => fs.existsSync(path.join(SKILLS, n, 'SKILL.md'))).sort();
const picked = val('--skills') ? val('--skills').split(',').map((s) => s.trim()).filter(Boolean) : all;
const unknown = picked.filter((s) => !all.includes(s));
if (unknown.length) { console.error(`Skill tidak dikenal: ${unknown.join(', ')}${unknown.some((u) => EXTERNAL.includes(u)) ? ` (skill eksternal: ${DEPS_CMD})` : ''}`); process.exit(1); }
if (applyUpdate && !update) { console.error('--apply hanya dipakai bersama --update'); process.exit(1); }
if (baseline && !update) { console.error('--baseline hanya dipakai bersama --update'); process.exit(1); }
// Update adalah laporan sampai user menambahkan --apply. Pemasangan awal tetap menulis kecuali --dry-run.
const write = update ? applyUpdate && !dry : !dry;
const lock = readLock(project);
// Saat update tanpa --target, ikuti lokasi skill yang benar-benar ada. Ini mencegah update
// menulis ke .agents/skills padahal proyek memasang skill di .claude/skills.
const skillTargets = (() => {
  if (target === 'both') return ['agents', 'claude'];
  if (!update || isGlobal || args.includes('--target')) return [target];
  const found = [];
  if (fs.existsSync(path.join(project, '.agents/skills'))) found.push('agents');
  if (fs.existsSync(path.join(project, '.claude/skills'))) found.push('claude');
  return found.length ? found : [target];
})();
const withOpencode = flag('--opencode') || (update && lock?.targets?.includes('opencode'));
// Divalidasi sebelum ada yang ditulis: menolak kombinasi ini setelah menyalin skill meninggalkan efek samping.
if (flag('--init') && isGlobal) {
  console.error('--global memasang skill untuk semua proyek, bukan kit. Kit proyek butuh folder proyek: pakai --project DIR --init.');
  process.exit(1);
}

function install(kind) {
  const dirName = kind === 'claude' ? '.claude/skills' : '.agents/skills';
  const dest = path.join(isGlobal ? os.homedir() : project, dirName);
  let created = 0, skipped = 0;
  for (const name of picked) {
    const out = path.join(dest, name);
    if (fs.existsSync(out) && !force && !update) { console.log(`lewati  ${dirName}/${name} (sudah ada, pakai --force untuk menimpa)`); skipped++; continue; }
    for (const rel of walk(path.join(SKILLS, name))) {
      const src = path.join(SKILLS, name, rel);
      if (write) { fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true }); fs.copyFileSync(src, path.join(out, rel)); fs.chmodSync(path.join(out, rel), fs.statSync(src).mode); }
    }
    created++;
  }
  const verb = update ? (write ? 'diperbarui' : 'akan diperbarui') : (write ? 'dipasang' : 'akan dipasang');
  console.log(`${write ? '' : '[dry-run] '}${kind}: ${created} skill ${verb} ke ${dest}, ${skipped} dilewati`);
}

for (const k of skillTargets) install(k);

if ((flag('--init') || update) && !isGlobal) {
  const plan = init({ project, apply: write, update, baseline, opencode: withOpencode, claude: skillTargets.includes('claude') });
  const n = (a) => plan.filter((p) => p.action === a).length;
  if (update) {
    const tag = { create: 'BARU', append: 'TAMBAH', update: 'UBAH', modified: 'LOKAL', untracked: 'LOKAL', missing: 'HILANG', obsolete: 'USANG' };
    console.log(`Pawang ${plan.installedVersion || 'tidak tercatat'} -> ${plan.version}`);
    if (!baseline) for (const p of plan) if (tag[p.action]) console.log(`  ${tag[p.action].padEnd(7)} ${p.rel}`);
    for (const p of plan) if (p.diff) process.stdout.write(p.diff);
    if (baseline) console.log(`${write ? '' : '[dry-run] '}baseline: ${plan.baselineFiles} file dicatat ke .agents/pawang.lock.json`);
    else {
      const kept = n('modified') + n('untracked') + n('missing');
      console.log(`${write ? '' : '[dry-run] '}kit proyek: ${n('update')} aman, ${n('create')} baru, ${kept} dipertahankan, ${n('obsolete')} usang`);
      if (!write) console.log('Ulangi dengan --update --apply untuk menulis perubahan aman dan file baru.');
      else if (kept) console.log('File yang dipertahankan tidak ditimpa. Gabungkan diff-nya, lalu jalankan --update --baseline --apply.');
    }
  } else {
    console.log(`${write ? '' : '[dry-run] '}kit proyek: ${n('create')} dibuat, ${n('append')} ditambah, ${n('exists')} sudah ada (dilewati)`);
  }
} else if (!isGlobal) {
  console.log('Kit proyek (AGENTS.md, .pawang/, ...) belum dipasang. Jalankan lagi dengan --init, atau minta agent menjalankan skill pawang-init.');
}
// Subagent OpenCode dirakit dari templat milik skill `agents`, dengan manajer paket proyek tujuan.
if (withOpencode) {
  const dir = path.join(project, '.opencode', 'agents');
  const agents = renderAgents({ pm: detectPm(project), scripts: readScripts(project), includePrimary: true });
  let written = 0, skipped = 0;
  for (const [n, text] of agents) {
    const dest = path.join(dir, n + '.md');
    if (fs.existsSync(dest) && !force && !update) { skipped++; continue; }
    if (write) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(dest, text); }
    written++;
  }
  console.log(`${write ? '' : '[dry-run] '}subagent OpenCode: ${written} ${update ? (write ? 'diperbarui' : 'akan diperbarui') : (write ? 'ditulis' : 'akan ditulis')}, ${skipped} dilewati`);
}

console.log(`\nDependensi eksternal (${EXTERNAL.join(', ')}) tidak ikut terpasang. Pasang dengan:\n  ${DEPS_CMD}`);

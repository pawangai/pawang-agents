#!/usr/bin/env node
// Pasang skill Pawang ke folder skill agent (salinan persis, tanpa penulisan ulang). Tanpa dependensi.
//   node scripts/install.mjs [--target agents|claude|both] [--global] [--project DIR]
//                            [--skills a,b,c] [--init] [--opencode] [--force] [--dry-run]
// agents = .agents/skills (universal: OpenCode, Pi, Codex, Gemini CLI, dll). claude = .claude/skills (Claude Code).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk, init } from '../skills/pawang-init/scripts/init.mjs';
import { EXTERNAL, EXTERNAL_REPO } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const DEPS_CMD = `npx skills add ${EXTERNAL_REPO} ${EXTERNAL.map((s) => `--skill ${s}`).join(' ')}`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
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
const all = fs.readdirSync(SKILLS).filter((n) => fs.existsSync(path.join(SKILLS, n, 'SKILL.md'))).sort();
const picked = val('--skills') ? val('--skills').split(',').map((s) => s.trim()).filter(Boolean) : all;
const unknown = picked.filter((s) => !all.includes(s));
if (unknown.length) { console.error(`Skill tidak dikenal: ${unknown.join(', ')}${unknown.some((u) => EXTERNAL.includes(u)) ? ` (skill eksternal: ${DEPS_CMD})` : ''}`); process.exit(1); }

function install(kind) {
  const dirName = kind === 'claude' ? '.claude/skills' : '.agents/skills';
  const dest = path.join(isGlobal ? os.homedir() : project, dirName);
  let created = 0, skipped = 0;
  for (const name of picked) {
    const out = path.join(dest, name);
    if (fs.existsSync(out) && !force) { console.log(`lewati  ${dirName}/${name} (sudah ada, pakai --force untuk menimpa)`); skipped++; continue; }
    for (const rel of walk(path.join(SKILLS, name))) {
      const src = path.join(SKILLS, name, rel);
      if (!dry) { fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true }); fs.copyFileSync(src, path.join(out, rel)); fs.chmodSync(path.join(out, rel), fs.statSync(src).mode); }
    }
    created++;
  }
  console.log(`${dry ? '[dry-run] ' : ''}${kind}: ${created} skill ${dry ? 'akan dipasang' : 'dipasang'} ke ${dest}, ${skipped} dilewati`);
}

for (const k of target === 'both' ? ['agents', 'claude'] : [target]) install(k);

if (flag('--init')) {
  const plan = init({ project, apply: !dry, opencode: flag('--opencode'), claude: target !== 'agents' });
  const n = (a) => plan.filter((p) => p.action === a).length;
  console.log(`${dry ? '[dry-run] ' : ''}kit proyek: ${n('create')} dibuat, ${n('append')} ditambah, ${n('exists')} sudah ada (dilewati)`);
} else {
  console.log('Kit proyek (AGENTS.md, .pawang/, ...) belum dipasang. Jalankan lagi dengan --init, atau minta agent menjalankan skill pawang-init.');
}
console.log(`\nDependensi eksternal (${EXTERNAL.join(', ')}) tidak ikut terpasang. Pasang dengan:\n  ${DEPS_CMD}`);

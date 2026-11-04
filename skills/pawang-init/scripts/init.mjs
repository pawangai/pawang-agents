#!/usr/bin/env node
// pawang-init: pasang kit Pawang (AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/, config) ke sebuah proyek.
// Tanpa dependensi. Default dry-run; tambahkan --apply untuk menulis. Tidak pernah menimpa file yang sudah ada.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.join(HERE, '..', 'assets', 'kit');
const OPENCODE = path.join(HERE, '..', 'assets', 'opencode');
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

export function init({ project, apply = false, opencode = false, claude = false }) {
  const plan = [];
  const roots = [KIT, ...(opencode ? [OPENCODE] : [])];
  for (const root of roots) {
    for (const rel of walk(root)) {
      const dest = path.join(project, rel);
      const srcFile = path.join(root, rel);
      const body = fs.readFileSync(srcFile);
      if (!fs.existsSync(dest)) {
        plan.push({ rel, action: 'create', dest, body });
      } else if (rel === '.gitignore') {
        const have = new Set(fs.readFileSync(dest, 'utf8').split(/\r?\n/).map((l) => l.trim()));
        const missing = body.toString('utf8').split(/\r?\n/).filter((l) => l.trim() && !have.has(l.trim()));
        plan.push(missing.length ? { rel, action: 'append', dest, body: Buffer.from(missing.join('\n') + '\n') } : { rel, action: 'same' });
      } else {
        const same = fs.readFileSync(dest).equals(body);
        plan.push({ rel, action: same ? 'same' : 'exists' });
      }
    }
  }
  if (claude) {
    const dest = path.join(project, 'CLAUDE.md');
    plan.push(fs.existsSync(dest) ? { rel: 'CLAUDE.md', action: 'exists' } : { rel: 'CLAUDE.md', action: 'create', dest, body: Buffer.from('@AGENTS.md\n') });
  }
  if (apply) {
    for (const p of plan) {
      if (p.action === 'create') {
        fs.mkdirSync(path.dirname(p.dest), { recursive: true });
        fs.writeFileSync(p.dest, p.body);
      } else if (p.action === 'append') {
        const cur = fs.readFileSync(p.dest, 'utf8');
        fs.writeFileSync(p.dest, cur + (cur.endsWith('\n') ? '' : '\n') + p.body.toString('utf8'));
      }
    }
  }
  return plan;
}

function main() {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(n);
  const project = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
  if (!fs.existsSync(project)) { console.error(`Folder proyek tidak ada: ${project}`); process.exit(1); }
  const apply = flag('--apply');
  const plan = init({ project, apply, opencode: flag('--opencode'), claude: flag('--claude') });
  const label = { create: apply ? 'dibuat' : 'akan dibuat', append: apply ? 'ditambah' : 'akan ditambah', exists: 'sudah ada, dilewati (gabungkan lewat /adopt atau /agents-md)', same: 'identik' };
  for (const p of plan) if (p.action !== 'same') console.log(`${p.action.padEnd(6)} ${p.rel}  [${label[p.action]}]`);
  const n = (a) => plan.filter((p) => p.action === a).length;
  console.log(`\n${apply ? 'Selesai' : 'Dry-run'}: ${n('create')} dibuat, ${n('append')} ditambah, ${n('exists')} dilewati, ${n('same')} identik.`);
  if (!apply) console.log('Ulangi dengan --apply untuk menulis.');
  else console.log('Langkah berikut: git init (bila belum), lalu /context (proyek baru) atau /adopt (kode sudah ada).');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) main();

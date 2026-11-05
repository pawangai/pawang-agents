import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { init, availableVersion } from '../skills/pawang-init/scripts/init.mjs';
import { ROOT, read, tmp } from './helpers.mjs';

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const lockFile = (d) => path.join(d, '.agents/pawang.lock.json');
const writeLock = (d, lock) => fs.writeFileSync(lockFile(d), JSON.stringify(lock, null, 2) + '\n');

test('dry-run tidak menulis apa pun', () => {
  const d = tmp();
  const plan = init({ project: d });
  assert.ok(plan.some((p) => p.rel === 'AGENTS.md' && p.action === 'create'));
  assert.equal(fs.readdirSync(d).length, 0);
});

test('apply membuat kit, termasuk folder .pawang kosong', () => {
  const d = tmp();
  init({ project: d, apply: true });
  for (const f of ['AGENTS.md', 'CONTEXT.md', 'DESIGN.md', '.pawang/rules.md', '.agents/pawang.json']) assert.ok(fs.existsSync(path.join(d, f)), f);
  assert.ok(!fs.existsSync(path.join(d, 'opencode.json')));
});

test('file yang sudah ada tidak pernah ditimpa', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'milik user');
  const plan = init({ project: d, apply: true });
  assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'milik user');
  assert.equal(plan.find((p) => p.rel === 'AGENTS.md').action, 'exists');
});

test('.gitignore hanya ditambah baris yang kurang', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, '.gitignore'), 'node_modules/\n');
  init({ project: d, apply: true });
  const g = fs.readFileSync(path.join(d, '.gitignore'), 'utf8');
  assert.ok(g.startsWith('node_modules/\n'));
  assert.equal(g.split('\n').filter((l) => l === 'node_modules/').length, 1);
});

test('--opencode dan --claude menambah berkas masing-masing', () => {
  const d = tmp();
  init({ project: d, apply: true, opencode: true, claude: true });
  assert.ok(fs.existsSync(path.join(d, 'opencode.json')));
  assert.ok(fs.existsSync(path.join(d, '.opencode/commands/feature.md')));
  assert.equal(fs.readFileSync(path.join(d, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
});

test('kit tidak menyebut lokasi skill tertentu untuk skill lain', () => {
  const d = tmp();
  init({ project: d, apply: true });
  const agents = fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8');
  assert.doesNotMatch(agents, /\.agents\/skills\/(interview|reference|[a-z-]+)\/SKILL\.md/);
  assert.match(agents, /Skill paths and subagents/);
});

test('apply mencatat versi dan hash berkas yang dikelola', () => {
  const d = tmp();
  init({ project: d, apply: true });
  const lock = JSON.parse(fs.readFileSync(lockFile(d), 'utf8'));
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.pawangVersion, availableVersion());
  assert.deepEqual(lock.targets, ['kit']);
  assert.equal(lock.files['AGENTS.md'], sha(fs.readFileSync(path.join(d, 'AGENTS.md'))));
  assert.ok(lock.files['.pawang/rules.md']);
  assert.equal(lock.files['.gitignore'], undefined, '.gitignore dipakai bersama, bukan file terkelola');
});

test('update hanya menimpa berkas yang belum diubah lokal', () => {
  const d = tmp();
  init({ project: d, apply: true });
  const rel = '.pawang/conventions/api.md';
  const dest = path.join(d, rel);
  const current = fs.readFileSync(dest, 'utf8') + '\nbaris lokal\n';
  fs.writeFileSync(dest, current);
  const lock = JSON.parse(fs.readFileSync(lockFile(d), 'utf8'));
  lock.files[rel] = sha(Buffer.from(current));
  writeLock(d, lock);

  const plan = init({ project: d, apply: true, update: true });
  assert.equal(plan.find((p) => p.rel === rel).action, 'update');
  assert.equal(fs.readFileSync(dest, 'utf8'), read(ROOT, 'skills/pawang-init/assets/kit', rel));
  assert.ok(plan.find((p) => p.rel === rel).diff);
});

test('update tidak menimpa berkas yang diubah lokal dan mencatat pending', () => {
  const d = tmp();
  init({ project: d, apply: true });
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'milik user\n');
  const plan = init({ project: d, apply: true, update: true });
  assert.equal(plan.find((p) => p.rel === 'AGENTS.md').action, 'modified');
  assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'milik user\n');
  const lock = JSON.parse(fs.readFileSync(lockFile(d), 'utf8'));
  assert.ok(lock.pending.includes('AGENTS.md'));
});

test('tanpa manifest, update membiarkan berkas lama dan hanya membuat yang baru', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'milik user\n');
  const plan = init({ project: d, apply: true, update: true });
  assert.equal(plan.find((p) => p.rel === 'AGENTS.md').action, 'untracked');
  assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'milik user\n');
  const lock = JSON.parse(fs.readFileSync(lockFile(d), 'utf8'));
  assert.ok(lock.files['.pawang/rules.md']);
  assert.ok(lock.pending.includes('AGENTS.md'));
});

test('baseline mencatat kondisi saat ini tanpa mengubah berkas proyek', () => {
  const d = tmp();
  init({ project: d, apply: true });
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'hasil gabungan\n');
  init({ project: d, apply: true, update: true });
  const plan = init({ project: d, update: true, baseline: true, apply: true });
  assert.ok(plan.some((p) => p.action === 'baseline'));
  assert.equal(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'hasil gabungan\n');
  const lock = JSON.parse(fs.readFileSync(lockFile(d), 'utf8'));
  assert.equal(lock.pending, undefined);
  assert.equal(lock.files['AGENTS.md'], sha(Buffer.from('hasil gabungan\n')));
});

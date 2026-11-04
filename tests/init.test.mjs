import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { init } from '../skills/pawang-init/scripts/init.mjs';
import { tmp } from './helpers.mjs';

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

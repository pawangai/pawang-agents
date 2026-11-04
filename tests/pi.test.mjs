import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read } from './helpers.mjs';

const pkg = JSON.parse(read(ROOT, 'package.json'));

test('paket Pi: keyword dan manifest pi.skills menunjuk folder yang ada', () => {
  assert.ok(pkg.keywords.includes('pi-package'));
  assert.deepEqual(pkg.pi.skills, ['./skills']);
  assert.ok(fs.statSync(path.join(ROOT, 'skills')).isDirectory());
});

test('skills/ hanya berisi folder (Pi memuat .md tingkat atas sebagai skill)', () => {
  for (const e of fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })) assert.ok(e.isDirectory(), e.name);
});

test('tidak ada SKILL.md bersarang selain skills/<nama>/SKILL.md', () => {
  const found = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'SKILL.md') found.push(path.relative(path.join(ROOT, 'skills'), p)); } };
  walk(path.join(ROOT, 'skills'));
  for (const f of found) assert.equal(f.split(path.sep).length, 2, f);
});

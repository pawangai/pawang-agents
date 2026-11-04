import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { walk } from '../skills/pawang-init/scripts/init.mjs';
import { AUTO_INVOKE, EXTERNAL } from '../scripts/lib.mjs';
import { ROOT, read } from './helpers.mjs';

const SKILLS = path.join(ROOT, 'skills');
const names = fs.readdirSync(SKILLS).filter((n) => fs.existsSync(path.join(SKILLS, n, 'SKILL.md')));
const frontmatter = (n) => read(SKILLS, n, 'SKILL.md').match(/^---\n([\s\S]*?)\n---\n/)[1];

test('skill eksternal tidak ada di skills/', () => {
  for (const e of EXTERNAL) assert.ok(!names.includes(e), e);
});

test('hanya agents-md dan pawang-init boleh dipicu model', () => {
  for (const n of names) {
    const has = /^disable-model-invocation:\s*true$/m.test(frontmatter(n));
    assert.equal(has, !AUTO_INVOKE.has(n), n);
  }
});

test('teks skill tidak bergantung lokasi (tanpa .agents/skills/<skill>/)', () => {
  const re = new RegExp('\\.agents/skills/(' + [...names, ...EXTERNAL].join('|') + ')/');
  for (const n of names) {
    for (const rel of walk(path.join(SKILLS, n)).filter((r) => r.endsWith('.md') && !r.startsWith(`assets${path.sep}opencode`))) {
      assert.doesNotMatch(read(SKILLS, n, rel), re, `${n}/${rel}`);
    }
  }
});

test('skill yang memakai <skill-dir> menjelaskannya di SKILL.md', () => {
  let used = 0;
  for (const n of names) {
    const uses = walk(path.join(SKILLS, n)).some((r) => r.endsWith('.md') && !r.startsWith('assets') && read(SKILLS, n, r).includes('<skill-dir>'));
    if (uses) { used++; assert.match(read(SKILLS, n, 'SKILL.md'), /`<skill-dir>` is the folder that contains this `SKILL.md`/, n); }
  }
  assert.ok(used > 5);
});

test('rujukan sibling dan skrip sendiri menunjuk berkas yang ada', () => {
  for (const n of names) {
    for (const rel of walk(path.join(SKILLS, n)).filter((r) => r.endsWith('.md') && !r.startsWith('assets'))) {
      const txt = read(SKILLS, n, rel);
      for (const m of txt.matchAll(/<skill-dir>\/(\.\.\/([a-z0-9-]+)\/)?(scripts\/[A-Za-z0-9_.-]+\.(?:mjs|py))/g)) {
        const target = path.join(SKILLS, m[2] || n, m[3]);
        assert.ok(fs.existsSync(target), `${n}/${rel}: ${m[0]} tidak ada`);
      }
    }
  }
});

test('lisensi MIT ada', () => {
  assert.match(read(ROOT, 'LICENSE'), /^MIT License/);
  assert.equal(JSON.parse(read(ROOT, 'package.json')).license, 'MIT');
});

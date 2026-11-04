import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmp, run, read, ROOT } from './helpers.mjs';

const base = ['--skills', 'advise,pawang-init'];

test('target agents dan claude: salinan persis sumber, tanpa penulisan ulang', () => {
  for (const [target, dir] of [['agents', '.agents/skills'], ['claude', '.claude/skills']]) {
    const d = tmp();
    const r = run('scripts/install.mjs', ['--project', d, '--target', target, ...base]);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['advise/SKILL.md', 'advise/scripts/docs-health.mjs', 'pawang-init/SKILL.md', 'pawang-init/scripts/init.mjs']) {
      assert.equal(read(d, dir, f), read(ROOT, 'skills', f), `${target}/${f}`);
    }
  }
});

test('target both memasang di kedua lokasi', () => {
  const d = tmp();
  run('scripts/install.mjs', ['--project', d, '--target', 'both', ...base]);
  assert.ok(fs.existsSync(path.join(d, '.agents/skills/advise/SKILL.md')));
  assert.ok(fs.existsSync(path.join(d, '.claude/skills/advise/SKILL.md')));
});

test('skill yang sudah ada dilewati kecuali --force', () => {
  const d = tmp();
  run('scripts/install.mjs', ['--project', d, ...base]);
  const f = path.join(d, '.agents/skills/advise/SKILL.md');
  fs.writeFileSync(f, 'diubah');
  assert.match(run('scripts/install.mjs', ['--project', d, ...base]).stdout, /lewati/);
  assert.equal(fs.readFileSync(f, 'utf8'), 'diubah');
  run('scripts/install.mjs', ['--project', d, ...base, '--force']);
  assert.notEqual(fs.readFileSync(f, 'utf8'), 'diubah');
});

test('skill eksternal ditolak dan perintah dependensi dicetak', () => {
  const d = tmp();
  const bad = run('scripts/install.mjs', ['--project', d, '--skills', 'interview']);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /skill eksternal/);
  const ok = run('scripts/install.mjs', ['--project', d, ...base]);
  assert.match(ok.stdout, /npx skills add pawangai\/pawang-skills --skill interview --skill pawang-skill-creator/);
});

test('--init memasang kit dan --dry-run tidak menulis', () => {
  const d = tmp();
  run('scripts/install.mjs', ['--project', d, ...base, '--init']);
  assert.ok(fs.existsSync(path.join(d, 'AGENTS.md')));
  const e = tmp();
  run('scripts/install.mjs', ['--project', e, ...base, '--init', '--dry-run']);
  assert.equal(fs.readdirSync(e).length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmp, run } from './helpers.mjs';

test('validate.mjs lolos pada repo ini (termasuk berkas turunan sinkron)', () => {
  const r = run('scripts/validate.mjs');
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('check-version: tag benar lolos, salah ditolak', () => {
  const v = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'package.json'), 'utf8')).version;
  assert.equal(run('scripts/check-version.mjs', [`v${v}`]).status, 0);
  assert.equal(run('scripts/check-version.mjs', ['v99.0.0']).status, 1);
  assert.equal(run('scripts/check-version.mjs', ['v01.0.0']).status, 1);
  assert.equal(run('scripts/check-version.mjs', [`refs/tags/v${v}`]).status, 0);
});

const hasZip = !spawnSync('zip', ['-v'], { stdio: 'ignore' }).error;
test('pack.mjs menghasilkan ZIP reproducible', { skip: !hasZip && 'zip tidak ada' }, () => {
  const a = tmp(), b = tmp();
  assert.equal(run('scripts/pack.mjs', ['--out', a]).status, 0);
  assert.equal(run('scripts/pack.mjs', ['--out', b]).status, 0);
  assert.equal(fs.readFileSync(path.join(a, 'SHA256SUMS.txt'), 'utf8'), fs.readFileSync(path.join(b, 'SHA256SUMS.txt'), 'utf8'));
  assert.equal(fs.readdirSync(a).filter((f) => f.endsWith('.zip')).length, 2);
  const list = (z) => spawnSync('unzip', ['-Z1', z], { encoding: 'utf8' }).stdout.split('\n');
  const v = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'package.json'), 'utf8')).version;
  const claude = list(path.join(a, `pawang-agents-claude-${v}.zip`));
  const codex = list(path.join(a, `pawang-agents-codex-${v}.zip`));
  assert.ok(claude.includes('.claude-plugin/plugin.json') && !claude.includes('.codex-plugin/plugin.json'));
  assert.ok(codex.includes('.codex-plugin/plugin.json') && !codex.includes('.claude-plugin/plugin.json'));
  for (const l of [claude, codex]) {
    assert.ok(l.includes('LICENSE') && l.includes('agents/reviewer.md') && l.includes('skills/feature/SKILL.md'));
    assert.ok(!l.some((f) => f.startsWith('scripts/') || f.startsWith('tests/') || f.startsWith('docs/')), 'tanpa file pengembangan');
  }
});

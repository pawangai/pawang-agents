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

test('--opencode merakit subagent dari templat dengan manajer paket proyek', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { test: 'x', build: 'y' } }));
  fs.writeFileSync(path.join(d, 'pnpm-lock.yaml'), '');
  const r = run('scripts/install.mjs', ['--project', d, '--skills', 'advise', '--opencode']);
  assert.equal(r.status, 0, r.stderr);
  const v = read(d, '.opencode/agents/verifier.md');
  assert.match(v, /"pnpm run test\*": allow/);
  assert.doesNotMatch(v, /"bun /, 'manajer paket tidak boleh di-hardcode');
  assert.doesNotMatch(v, /\{\{/, 'placeholder tersisa');
  // Agent utama ikut dipasang installer, dan izin proyeknya juga mengikuti manajer paket.
  assert.match(read(d, '.opencode/agents/build.md'), /"pnpm run build\*": allow/);
});

test('--global --init ditolak sebelum ada yang ditulis', () => {
  const home = tmp();
  const r = run('scripts/install.mjs', ['--global', '--init', ...base], { env: { ...process.env, HOME: home } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--global memasang skill untuk semua proyek/);
  assert.deepEqual(fs.readdirSync(home), [], 'tidak boleh ada berkas yang ditulis');
});

test('flag butuh nilai ditolak, bukan diam-diam memakai default', () => {
  const r = run('scripts/install.mjs', ['--target']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--target butuh nilai/);
  const p = run('scripts/pack.mjs', ['--out']);
  assert.equal(p.status, 1);
  assert.match(p.stderr, /--out butuh nilai/);
});

test('skill eksternal ditolak dan perintah dependensi dicetak', () => {
  const d = tmp();
  const bad = run('scripts/install.mjs', ['--project', d, '--skills', 'interview']);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /skill eksternal/);
  const ok = run('scripts/install.mjs', ['--project', d, ...base]);
  assert.match(ok.stdout, /npx skills add pawangai\/pawang-skills --skill interview --skill pawang-skill-creator --skill plans-prototype/);
});

test('--init memasang kit dan --dry-run tidak menulis', () => {
  const d = tmp();
  run('scripts/install.mjs', ['--project', d, ...base, '--init']);
  assert.ok(fs.existsSync(path.join(d, 'AGENTS.md')));
  const e = tmp();
  run('scripts/install.mjs', ['--project', e, ...base, '--init', '--dry-run']);
  assert.equal(fs.readdirSync(e).length, 0);
});

test('--update hanya laporan sampai --apply', () => {
  const d = tmp();
  run('scripts/install.mjs', ['--project', d, ...base, '--init']);
  const skill = path.join(d, '.agents/skills/advise/SKILL.md');
  fs.writeFileSync(skill, 'diubah lokal');
  const report = run('scripts/install.mjs', ['--project', d, ...base, '--update']);
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /Pawang .* -> /);
  assert.match(report.stdout, /akan diperbarui/);
  assert.equal(fs.readFileSync(skill, 'utf8'), 'diubah lokal');

  const applied = run('scripts/install.mjs', ['--project', d, ...base, '--update', '--apply']);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(fs.readFileSync(skill, 'utf8'), read(ROOT, 'skills/advise/SKILL.md'));
  assert.ok(fs.existsSync(path.join(d, '.agents/pawang.lock.json')));
});

test('--apply dan --baseline ditolak tanpa --update', () => {
  const apply = run('scripts/install.mjs', ['--project', tmp(), ...base, '--apply']);
  assert.equal(apply.status, 1);
  assert.match(apply.stderr, /--apply hanya dipakai bersama --update/);
  const baseline = run('scripts/install.mjs', ['--project', tmp(), ...base, '--baseline']);
  assert.equal(baseline.status, 1);
  assert.match(baseline.stderr, /--baseline hanya dipakai bersama --update/);
});

test('--update --apply memperbarui subagent OpenCode', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ scripts: { test: 'x', build: 'y' } }));
  run('scripts/install.mjs', ['--project', d, ...base, '--init', '--opencode']);
  const f = path.join(d, '.opencode/agents/verifier.md');
  fs.writeFileSync(f, 'diubah lokal');
  const r = run('scripts/install.mjs', ['--project', d, ...base, '--update', '--apply']);
  assert.equal(r.status, 0, r.stderr);
  assert.notEqual(fs.readFileSync(f, 'utf8'), 'diubah lokal');
  assert.ok(fs.existsSync(path.join(d, '.agents/pawang.lock.json')));
});

test('--update tanpa --target mengikuti lokasi skill yang ada', () => {
  const d = tmp();
  run('scripts/install.mjs', ['--project', d, '--target', 'claude', ...base, '--init']);
  const f = path.join(d, '.claude/skills/advise/SKILL.md');
  fs.writeFileSync(f, 'diubah lokal');
  const r = run('scripts/install.mjs', ['--project', d, ...base, '--update', '--apply']);
  assert.equal(r.status, 0, r.stderr);
  assert.notEqual(fs.readFileSync(f, 'utf8'), 'diubah lokal');
  assert.ok(!fs.existsSync(path.join(d, '.agents/skills')), 'tidak boleh membuat target agents');
});

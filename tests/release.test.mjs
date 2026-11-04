import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from './helpers.mjs';
import { version } from '../scripts/lib.mjs';

test('release-notes: versi paket punya bagian berisi plus petunjuk pasang', () => {
  const r = run('scripts/release-notes.mjs', [`v${version()}`], { env: { ...process.env, GITHUB_REPOSITORY: 'acme/demo' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /### Ditambahkan/);
  assert.match(r.stdout, /## Pasang/);
  assert.match(r.stdout, /\/plugin marketplace add acme\/demo/);
  assert.match(r.stdout, /pi install git:github\.com\/acme\/demo/);
  assert.doesNotMatch(r.stdout, /^## \[/m); // hanya satu bagian
});

test('release-notes: tag dan versi polos sama; versi tanpa bagian gagal', () => {
  const v = version();
  assert.equal(run('scripts/release-notes.mjs', [v]).stdout, run('scripts/release-notes.mjs', [`refs/tags/v${v}`]).stdout);
  const bad = run('scripts/release-notes.mjs', ['v99.0.0']);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /tidak punya bagian/);
  assert.equal(run('scripts/release-notes.mjs', []).status, 1);
});

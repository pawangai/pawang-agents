import test from 'node:test';
import assert from 'node:assert/strict';
import { read, ROOT } from './helpers.mjs';

// Klaim status verifikasi mudah melenceng saat ditulis di beberapa tempat.
// Satu tabel di docs/harnesses.md; dokumen lain merujuk, tidak mengulang.
test('status verifikasi hanya ditulis di docs/harnesses.md', () => {
  const h = read(ROOT, 'docs/harnesses.md');
  assert.match(h, /^## Status verifikasi$/m);
  assert.match(h, /Claude Code/, 'tabel harus punya baris Claude Code');
  assert.match(h, /Codex/);
  assert.match(h, /Belum diuji/);

  const readme = read(ROOT, 'README.md');
  assert.doesNotMatch(readme, /belum diuji|belum pernah diuji/i, 'README merujuk tabel, bukan mengulang klaim status');
  assert.match(readme, /docs\/harnesses\.md#status-verifikasi/, 'README harus menautkan tabel status');
});

test('README tidak menggeneralisasi bentuk pemanggilan skill', () => {
  const readme = read(ROOT, 'README.md');
  assert.doesNotMatch(readme, /Semua skill dipanggil dengan nama yang sama/);
  assert.match(readme, /`\/pawang:<nama>`/, 'bentuk per harness harus disebut');
  assert.match(readme, /`\/skill:<nama>`/);
});

test('matriks pemasangan tidak diduplikasi di docs/harnesses.md', () => {
  const h = read(ROOT, 'docs/harnesses.md');
  assert.doesNotMatch(h, /plugin marketplace add/, 'perintah pasang hanya di README');
  assert.doesNotMatch(h, /node scripts\/install\.mjs --project/, 'perintah pasang hanya di README');
});

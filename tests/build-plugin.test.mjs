import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build, toClaudeAgent, parseAgent } from '../scripts/build-plugin.mjs';
import { renderAll, TEMPLATES } from '../skills/agents/scripts/render.mjs';
import { version } from '../scripts/lib.mjs';
import { ROOT, read } from './helpers.mjs';

const files = build();
const text = (rel) => files.get(path.normalize(rel)).data.toString('utf8');
// Templat mentah (placeholder belum diisi) dan hasil rakitan. Templat adalah satu-satunya sumber persona.
const OC = (n) => read(TEMPLATES, `${n}.md`);
const RENDERED = (n) => renderAll({ pm: 'npm', scripts: { test: 'x', lint: 'y', build: 'z', e2e: 'w' } }).get(n);

test('berkas turunan di repo sama dengan hasil build', () => {
  for (const [rel, f] of files) assert.ok(fs.readFileSync(path.join(ROOT, rel)).equals(f.data), rel);
});

test('subagent dikirim di agents/, agent utama build tidak', () => {
  for (const n of ['explorer', 'implementer', 'reviewer', 'verifier']) assert.ok(files.has(path.join('agents', `${n}.md`)), n);
  assert.ok(!files.has(path.join('agents', 'build.md')));
});

test('persona hanya punya satu sumber: templat di skills/agents/assets/agents', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'skills/pawang-init/assets/opencode/.opencode/agents')), 'salinan persona di overlay OpenCode harus tidak ada');
  for (const [n, t] of renderAll({ pm: 'npm', scripts: { test: 'x', build: 'y' }, includePrimary: true })) assert.doesNotMatch(t, /\{\{/, `${n}: placeholder tersisa`);
  // Agent utama hanya dipasang installer, tidak oleh /agents.
  assert.ok(!renderAll().has('build'), 'agent utama tidak boleh ikut pemasangan /agents');
  assert.ok(renderAll({ includePrimary: true }).has('build'));
});

test('adapter agent: tool sesuai izin OpenCode', () => {
  const tools = (n) => toClaudeAgent(n, RENDERED(n)).match(/^tools: (.*)$/m)[1].split(', ');
  for (const n of ['explorer', 'reviewer', 'verifier']) {
    assert.ok(!tools(n).includes('Edit') && !tools(n).includes('Write'), `${n} tidak boleh mengedit`);
    assert.ok(tools(n).includes('Bash'));
  }
  assert.ok(tools('implementer').includes('Edit') && tools('implementer').includes('Write'));
});

test('adapter agent: batas shell turunan izin, larangan rahasia jadi prosa', () => {
  const ex = toClaudeAgent('explorer', RENDERED('explorer'));
  assert.match(ex, /Shell hanya untuk pola berikut/);
  assert.match(ex, /`git diff\*`/);
  const lists = ex.split('\n').filter((l) => /^- (Diizinkan|Dilarang):/.test(l));
  assert.ok(lists.length >= 1);
  for (const l of lists) assert.doesNotMatch(l, /\.env|\.dev\.vars/, 'pola rahasia bukan pola perintah shell');
  assert.match(ex, /Berkas rahasia \(`\.env\*`, `\.dev\.vars\*`\) tidak boleh dibaca/);
  const im = toClaudeAgent('implementer', RENDERED('implementer'));
  assert.match(im, /Dilarang: .*`git commit\*`/);
  assert.equal(parseAgent(OC('verifier')).edit, 'deny');
});

test('adapter agent: daftar izin tidak memakai path bergantung lokasi', () => {
  // Catatan definisi `<skills-root>` boleh menyebut lokasi pemasangan; daftar izin tidak boleh.
  const lists = toClaudeAgent('verifier', RENDERED('verifier')).split('\n').filter((l) => /^- (Diizinkan|Dilarang):/.test(l));
  assert.ok(lists.length >= 2, 'daftar izin tidak ditemukan');
  for (const l of lists) assert.doesNotMatch(l, /\.agents\/skills|\/home\/|\/Users\//);
});

test('adapter agent: setiap path skrip yang di-emit menunjuk berkas yang ada', () => {
  let seen = 0;
  for (const n of ['explorer', 'implementer', 'reviewer', 'verifier']) {
    const out = toClaudeAgent(n, RENDERED(n));
    for (const m of out.matchAll(/`node <skills-root>\/([a-z0-9-]+)\/scripts\/([^`*]+)\*?`/g)) {
      seen++;
      assert.ok(fs.existsSync(path.join(ROOT, 'skills', m[1], 'scripts', m[2])), `${n}: ${m[1]}/${m[2]} tidak ada`);
    }
  }
  assert.ok(seen >= 3, 'pola skrip verifier hilang dari keluaran build');
});

test('versi pawang-init ikut dibangun, tidak diedit tangan', () => {
  assert.equal(text('skills/pawang-init/assets/VERSION'), version() + '\n');
});

test('manifest: versi sama, lisensi MIT, root repo adalah plugin', () => {
  const v = version();
  const claude = JSON.parse(text('.claude-plugin/plugin.json'));
  const codex = JSON.parse(text('.codex-plugin/plugin.json'));
  const market = JSON.parse(text('.claude-plugin/marketplace.json'));
  assert.deepEqual([claude.version, codex.version, market.metadata.version], [v, v, v]);
  assert.deepEqual([claude.license, codex.license], ['MIT', 'MIT']);
  assert.equal(codex.skills, './skills/');
  // Claude Code memuat skills/ dan agents/ dari lokasi bawaan; menunjuknya di manifest hanya
  // mengulang. Lihat docs/harnesses.md#manifest.
  assert.equal(claude.skills, undefined, 'skills/ sudah lokasi bawaan Claude Code');
  assert.equal(claude.agents, undefined, 'agents/ sudah lokasi bawaan Claude Code');
  assert.deepEqual(market.plugins.map((p) => p.name), ['pawang', 'pawang-skills']);
  assert.equal(market.plugins[0].source, './');
  assert.equal(market.plugins[1].source.repo, 'pawangai/pawang-skills');
  assert.equal(JSON.parse(text('.agents/plugins/marketplace.json')).plugins[0].source, './');
});

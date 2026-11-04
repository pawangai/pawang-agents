import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build, toClaudeAgent, parseAgent } from '../scripts/build-plugin.mjs';
import { version } from '../scripts/lib.mjs';
import { ROOT, read } from './helpers.mjs';

const files = build();
const text = (rel) => files.get(path.normalize(rel)).data.toString('utf8');
const OC = (n) => read(ROOT, 'skills/pawang-init/assets/opencode/.opencode/agents', `${n}.md`);

test('berkas turunan di repo sama dengan hasil build', () => {
  for (const [rel, f] of files) assert.ok(fs.readFileSync(path.join(ROOT, rel)).equals(f.data), rel);
});

test('subagent dikirim di agents/, agent utama build tidak', () => {
  for (const n of ['explorer', 'implementer', 'reviewer', 'verifier']) assert.ok(files.has(path.join('agents', `${n}.md`)), n);
  assert.ok(!files.has(path.join('agents', 'build.md')));
});

test('adapter agent: tool sesuai izin OpenCode', () => {
  const tools = (n) => toClaudeAgent(n, OC(n)).match(/^tools: (.*)$/m)[1].split(', ');
  for (const n of ['explorer', 'reviewer', 'verifier']) {
    assert.ok(!tools(n).includes('Edit') && !tools(n).includes('Write'), `${n} tidak boleh mengedit`);
    assert.ok(tools(n).includes('Bash'));
  }
  assert.ok(tools('implementer').includes('Edit') && tools('implementer').includes('Write'));
});

test('adapter agent: batas shell turunan izin, tanpa pola rahasia', () => {
  const ex = toClaudeAgent('explorer', OC('explorer'));
  assert.match(ex, /Shell hanya untuk pola berikut/);
  assert.match(ex, /`git diff\*`/);
  assert.doesNotMatch(ex.split('## Batas shell')[1], /\.env|\.dev\.vars/);
  const im = toClaudeAgent('implementer', OC('implementer'));
  assert.match(im, /Dilarang: .*`git commit\*`/);
  assert.equal(parseAgent(OC('verifier')).edit, 'deny');
});

test('adapter agent: path skrip tidak memakai .agents/skills', () => {
  assert.doesNotMatch(toClaudeAgent('verifier', OC('verifier')), /\.agents\/skills/);
});

test('manifest: versi sama, lisensi MIT, root repo adalah plugin', () => {
  const v = version();
  const claude = JSON.parse(text('.claude-plugin/plugin.json'));
  const codex = JSON.parse(text('.codex-plugin/plugin.json'));
  const market = JSON.parse(text('.claude-plugin/marketplace.json'));
  assert.deepEqual([claude.version, codex.version, market.metadata.version], [v, v, v]);
  assert.deepEqual([claude.license, codex.license], ['MIT', 'MIT']);
  assert.equal(codex.skills, './skills/');
  assert.deepEqual(market.plugins.map((p) => p.name), ['pawang', 'pawang-skills']);
  assert.equal(market.plugins[0].source, './');
  assert.equal(market.plugins[1].source.repo, 'pawangai/pawang-skills');
  assert.equal(JSON.parse(text('.agents/plugins/marketplace.json')).plugins[0].source, './');
});

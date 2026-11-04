#!/usr/bin/env node
// Hasilkan berkas turunan yang dibutuhkan agar repo ini menjadi plugin Claude Code dan Codex:
//   agents/*.md                       subagent format Claude Code, diterjemahkan dari agent OpenCode
//   .claude-plugin/plugin.json        manifest plugin Claude Code
//   .claude-plugin/marketplace.json   katalog Claude Code
//   .codex-plugin/plugin.json         manifest plugin Codex
//   .agents/plugins/marketplace.json  katalog Codex
// skills/ dipakai apa adanya oleh semua harness; tidak ada salinan atau penulisan ulang path.
//   node scripts/build-plugin.mjs           tulis keluaran
//   node scripts/build-plugin.mjs --check   gagal bila hasil commit tidak sama dengan hasil build (dipakai CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../skills/pawang-init/scripts/init.mjs';
import { ROOT, EXTERNAL, EXTERNAL_REPO, version } from './lib.mjs';

const OC_AGENTS = path.join(ROOT, 'skills', 'pawang-init', 'assets', 'opencode', '.opencode', 'agents');
const PLUGIN_NAME = 'pawang';
// Agent utama OpenCode (build) tidak dikirim: di harness lain sesi utama berperan sebagai orkestrator.
const SKIP_AGENTS = new Set(['build']);
const DESCRIPTION = 'Workflow Pawang untuk agent coding: rencana, bangun, verifikasi, review, commit, dan batalkan. Jalankan skill pawang-init untuk memasang kit ke proyek.';

// Terjemahkan agent OpenCode (izin di frontmatter) menjadi file agen format Claude Code.
export function parseAgent(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('frontmatter agent tidak valid');
  const fm = m[1];
  const description = (fm.match(/^description:\s*(.+)$/m) || [])[1]?.trim();
  const edit = (fm.match(/^  edit:\s*(\w+)/m) || [])[1];
  const bashBlock = (fm.match(/^  bash:\n((?:    .*\n?)*)/m) || [])[1];
  const rules = [];
  for (const line of (bashBlock || '').split('\n')) {
    const r = line.match(/^    "(.*)":\s*(\w+)\s*$/);
    if (r) rules.push({ pattern: r[1], action: r[2] });
  }
  return { description, edit, hasBash: bashBlock !== undefined, rules, body: m[2].replace(/^\n+/, '') };
}

export function toClaudeAgent(name, text) {
  const a = parseAgent(text);
  const tools = ['Read', 'Grep', 'Glob'];
  if (a.edit !== 'deny') tools.push('Edit', 'Write');
  if (a.hasBash) tools.push('Bash');
  const secret = (p) => p.includes('.env') || p.includes('.dev.vars');
  const show = (p) => '`' + p.replace('node .agents/skills/*/scripts/', 'node <skill-dir>/../<skill>/scripts/') + '`';
  const base = a.rules.find((r) => r.pattern === '*')?.action;
  const allow = a.rules.filter((r) => r.action === 'allow' && r.pattern !== '*').map((r) => show(r.pattern));
  const deny = a.rules.filter((r) => r.action === 'deny' && r.pattern !== '*' && !secret(r.pattern)).map((r) => show(r.pattern));
  let extra = '';
  if (a.hasBash) {
    extra += '\n\n## Batas shell\n\nDaftar ini turunan dari izin OpenCode. Di Claude Code ia berlaku sebagai aturan kerja, bukan penegakan oleh harness.\n';
    if (base === 'deny') extra += '\n- Shell hanya untuk pola berikut; selain itu jangan jalankan.';
    else extra += '\n- Perintah di luar daftar diizinkan berikut mengikuti izin Claude Code milik user.';
    if (allow.length) extra += `\n- Diizinkan: ${allow.join(', ')}.`;
    if (deny.length) extra += `\n- Dilarang: ${deny.join(', ')}.`;
    extra += '\n';
  }
  const fm = ['---', `name: ${name}`, `description: ${JSON.stringify(a.description)}`, `tools: ${tools.join(', ')}`, '---', ''].join('\n');
  return `${fm}\n${a.body.replace(/\n+$/, '')}${extra}`;
}

const json = (o) => ({ data: Buffer.from(JSON.stringify(o, null, 2) + '\n'), mode: 0o644 });

export function build() {
  const v = version();
  const files = new Map();
  for (const f of fs.readdirSync(OC_AGENTS).filter((x) => x.endsWith('.md')).sort()) {
    const name = f.replace(/\.md$/, '');
    if (SKIP_AGENTS.has(name)) continue;
    files.set(path.join('agents', f), { data: Buffer.from(toClaudeAgent(name, fs.readFileSync(path.join(OC_AGENTS, f), 'utf8'))), mode: 0o644 });
  }
  files.set(path.join('.claude-plugin', 'plugin.json'), json({
    name: PLUGIN_NAME, version: v, description: DESCRIPTION, author: { name: 'Pawang' }, license: 'MIT',
    keywords: ['agent-skills', 'workflow', 'pawang'],
  }));
  files.set(path.join('.claude-plugin', 'marketplace.json'), json({
    name: 'pawang-agents',
    owner: { name: 'Pawang' },
    metadata: { description: 'Marketplace Pawang agents.', version: v },
    plugins: [
      { name: PLUGIN_NAME, source: './', description: DESCRIPTION, version: v, category: 'productivity' },
      { name: 'pawang-skills', source: { source: 'github', repo: EXTERNAL_REPO }, description: `Skill eksternal yang dibutuhkan Pawang: ${EXTERNAL.join(' dan ')}.`, category: 'productivity' },
    ],
  }));
  files.set(path.join('.codex-plugin', 'plugin.json'), json({
    name: PLUGIN_NAME, version: v, description: DESCRIPTION, author: { name: 'Pawang' }, license: 'MIT', skills: './skills/',
    interface: { displayName: 'Pawang', shortDescription: 'Workflow Pawang untuk agent coding', developerName: 'Pawang', category: 'Developer Tools', capabilities: ['Plan', 'Implement', 'Review'] },
  }));
  files.set(path.join('.agents', 'plugins', 'marketplace.json'), json({
    name: 'pawang-agents',
    interface: { displayName: 'Pawang agents' },
    plugins: [{ name: PLUGIN_NAME, source: './', policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }],
  }));
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = build();
  const agentsDir = path.join(ROOT, 'agents');
  if (process.argv.includes('--check')) {
    const problems = [];
    for (const [rel, f] of files) {
      const p = path.join(ROOT, rel);
      if (!fs.existsSync(p)) problems.push(`hilang: ${rel}`);
      else if (!fs.readFileSync(p).equals(f.data)) problems.push(`beda: ${rel}`);
    }
    if (fs.existsSync(agentsDir)) for (const r of walk(agentsDir)) if (!files.has(path.join('agents', r))) problems.push(`berlebih: agents/${r}`);
    if (problems.length) {
      console.error(problems.join('\n') + '\nBerkas turunan tidak sinkron. Jalankan: node scripts/build-plugin.mjs');
      process.exit(1);
    }
    console.log(`OK: berkas turunan sinkron (${files.size} file)`);
  } else {
    fs.rmSync(agentsDir, { recursive: true, force: true });
    for (const [rel, f] of files) {
      const p = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, f.data, { mode: f.mode });
    }
    console.log(`Dibangun: ${files.size} file, versi ${version()}`);
  }
}

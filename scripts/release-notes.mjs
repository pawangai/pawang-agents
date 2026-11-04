#!/usr/bin/env node
// Cetak deskripsi rilis untuk sebuah versi: bagian CHANGELOG.md yang sesuai, plus petunjuk pasang.
//   node scripts/release-notes.mjs v0.1.29
// Gagal (status 1) bila CHANGELOG.md tidak punya bagian berisi untuk versi itu.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const version = (process.argv[2] || '').replace(/^refs\/tags\//, '').replace(/^v/, '');
if (!version) { console.error('Pemakaian: node scripts/release-notes.mjs <tag atau versi>'); process.exit(1); }

const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
const esc = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const m = changelog.match(new RegExp(`^## \\[${esc}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`, 'm'));
const body = m?.[1].trim();
if (!body) {
  console.error(`CHANGELOG.md tidak punya bagian berisi untuk versi ${version}. Tambahkan "## [${version}] - YYYY-MM-DD" beserta isinya.`);
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY || 'pawangai/pawang-agents';
console.log(`${body}

## Pasang

- Claude Code: \`/plugin marketplace add ${repo}\`, lalu \`/plugin install pawang@pawang-agents\`
- Codex: \`codex plugin marketplace add ${repo}\`, lalu \`codex plugin add pawang@pawang-agents\`
- Pi: \`pi install git:github.com/${repo}\`
- Manual: \`node scripts/install.mjs --project <proyek> --init\`

Skill \`interview\`, \`pawang-skill-creator\`, dan \`plans-prototype\` datang dari [pawangai/pawang-skills](https://github.com/pawangai/pawang-skills). Aset rilis: dua ZIP runtime (Claude Code dan Codex) dan \`SHA256SUMS.txt\`.`);

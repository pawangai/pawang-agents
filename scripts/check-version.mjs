#!/usr/bin/env node
// Pastikan versi di package.json, semua manifest plugin, dan marketplace sama, dan (bila diberi tag)
// tag berformat vMAJOR.MINOR.PATCH[-prarilis] dan sama dengan versi itu.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const market = read('.claude-plugin/marketplace.json');
const expected = read('package.json').version;
const versions = {
  'package.json': expected,
  '.claude-plugin/plugin.json': read('.claude-plugin/plugin.json').version,
  '.codex-plugin/plugin.json': read('.codex-plugin/plugin.json').version,
  '.claude-plugin/marketplace.json (metadata)': market.metadata?.version,
  '.claude-plugin/marketplace.json (plugin pawang)': market.plugins.find((p) => p.name === 'pawang')?.version,
};
const bad = Object.entries(versions).filter(([, v]) => v !== expected);
if (bad.length) {
  console.error(`Versi tidak sinkron (package.json = ${expected}):\n${bad.map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nJalankan: node scripts/build-plugin.mjs`);
  process.exit(1);
}
const tag = (process.argv[2] || '').replace(/^refs\/tags\//, '');
if (tag) {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(tag)) {
    console.error(`Tag "${tag}" harus berformat vMAJOR.MINOR.PATCH (angka tanpa nol di depan), boleh diikuti -prarilis.`);
    process.exit(1);
  }
  if (tag !== `v${expected}`) {
    console.error(`Tag "${tag}" tidak sama dengan versi paket (v${expected}). Ubah versi di package.json, jalankan node scripts/build-plugin.mjs, commit, lalu buat ulang tag.`);
    process.exit(1);
  }
}
console.log(`OK: ${tag || `v${expected}`}`);

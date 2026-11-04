// render.mjs: satu-satunya tempat definisi subagent OpenCode dirakit.
// Templat ada di skills/agents/assets/agents/*.md (placeholder {{READ}}, {{EDIT}}, {{ALLOW}} dst).
// Dipakai oleh tiga pemanggil, supaya tidak ada salinan yang bisa melenceng:
//   skills/agents/scripts/install-agents.mjs   (skill /agents, proyek OpenCode)
//   skills/pawang-init/scripts/init.mjs        (pawang-init --opencode, proyek OpenCode)
//   scripts/build-plugin.mjs                   (subagent Claude Code dan Codex)
// Tanpa dependensi (Node 18+).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES = path.join(HERE, '..', 'assets', 'agents');

// Manajer paket proyek dari lockfile-nya.
export function detectPm(root) {
  const has = (f) => fs.existsSync(path.join(root, f));
  return has('pnpm-lock.yaml') ? 'pnpm'
    : has('bun.lock') || has('bun.lockb') ? 'bun'
      : has('yarn.lock') ? 'yarn'
        : 'npm';
}

// Script proyek yang boleh dijalankan subagent verifier.
export function readScripts(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  } catch {
    return {};
  }
}

export const WANTED = /^(test|lint|typecheck|type-check|check|build|e2e|test:.*|e2e:.*|lint:.*)$/;
export const DEV = /^(test|lint|typecheck|type-check|check|test:.*|lint:.*)$/;

const ind = (lines) => lines.map((l) => '    ' + l).join('\n');
const SECRET_FILES = ['*.dev.vars', '*.dev.vars.*', '*.env', '*.env.*'];

// Blok izin. Urutan penting: di OpenCode aturan terakhir yang cocok menang,
// jadi blok rahasia dan git ditaruh di akhir blok bash tiap agent.
export function rules() {
  return {
    file: ind(['"*": allow', ...SECRET_FILES.map((p) => `"${p}": deny`), '"*.example": allow']),
    bashSecret: ind([
      // Hanya bentuk berawalan titik, supaya `process.env` tidak ikut terblokir.
      // Berkas *.example dibaca lewat tool read.
      '"* .env*": deny', '"*/.env*": deny', '"*:.env*": deny', "\"*'.env*\": deny", '"*\\".env*": deny',
      '"*.dev.vars*": deny',
    ]),
    gitDeny: ind(['"git commit*": deny', '"git push*": deny', '"git reset*--hard*": deny', '"git*--force*": deny']),
  };
}

// Pemeriksa deterministik milik skill sendiri; tidak bergantung manajer paket.
export const SKILL_SCRIPTS = ['check-layout', 'compare-text', 'docs-health', 'probe'];

export function renderAgent(template, { pm = 'npm', scripts = {} } = {}) {
  const r = rules();
  const wanted = Object.keys(scripts).filter((k) => WANTED.test(k));
  const dev = Object.keys(scripts).filter((k) => DEV.test(k) && !/e2e/.test(k));
  const devAllow = dev.map((k) => `"${pm} run ${k}*": allow`);
  if (scripts.test) devAllow.push(`"${pm} test*": allow`);
  const verAllow = [
    ...wanted.map((k) => `"${pm} run ${k}*": allow`),
    ...(scripts.test ? [`"${pm} test*": allow`] : []),
    ...SKILL_SCRIPTS.map((s) => `"node .agents/skills/*/scripts/${s}.mjs*": allow`),
    '"pdftotext*": allow', '"pdftoppm*": allow', '"pdffonts*": allow', '"pdfinfo*": allow', '"compare *": allow',
  ];
  // Untuk agent utama: seluruh perintah proyek, tanpa baris khusus verifier.
  const projectAllow = [
    ...wanted.map((k) => `"${pm} run ${k}*": allow`),
    ...(scripts.test ? [`"${pm} test*": allow`] : []),
  ];
  return template
    .replace('{{READ}}', r.file).replace('{{EDIT}}', r.file)
    .replace('{{BASH_SECRET}}', r.bashSecret).replace('{{GIT_DENY}}', r.gitDeny)
    .replace('{{ALLOW_DEV}}\n', devAllow.length ? ind(devAllow) + '\n' : '')
    .replace('{{ALLOW_PROJECT}}\n', projectAllow.length ? ind(projectAllow) + '\n' : '')
    .replace('{{ALLOW}}', ind(verAllow));
}

// Nama agent yang dikirim, urut abjad. Agent utama (mode: primary) hanya ikut bila diminta:
// ia menggantikan orkestrator OpenCode, jadi hanya dipasang oleh installer --opencode, bukan oleh /agents.
export function agentNames(dir = TEMPLATES, { includePrimary = false } = {}) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
    .filter((f) => includePrimary || !/^mode:\s*primary$/m.test(fs.readFileSync(path.join(dir, f), 'utf8')))
    .map((f) => f.slice(0, -3)).sort();
}

// Map nama -> teks yang sudah dirakit.
export function renderAll({ dir = TEMPLATES, pm = 'npm', scripts = {}, includePrimary = false } = {}) {
  const out = new Map();
  for (const n of agentNames(dir, { includePrimary })) out.set(n, renderAgent(fs.readFileSync(path.join(dir, n + '.md'), 'utf8'), { pm, scripts }));
  return out;
}

// Fungsi bersama untuk skrip repo (bukan bagian skill).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Hanya skill ini yang boleh dipicu otomatis oleh model; sisanya hanya lewat perintah (disable-model-invocation: true).
export const AUTO_INVOKE = new Set(['agents-md', 'pawang-init']);
// Skill eksternal (repo pawangai/pawang-skills), tidak disimpan di sini.
export const EXTERNAL = ['interview', 'pawang-skill-creator', 'plans-prototype'];
export const EXTERNAL_REPO = 'pawangai/pawang-skills';

export function version() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
}

// Salinan milik alat build. Skill `pawang-init` punya versi sendiri di skripnya, karena skrip itu
// harus berjalan sendiri di proyek pengguna tanpa repo ini. Keduanya dijaga sama oleh tes.
export function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(path.relative(base, p));
  }
  return out.sort();
}

// Pembaca frontmatter YAML seperlunya, tanpa dependensi. Mendukung nilai satu baris (dikutip
// atau tidak) dan blok `>` (lipat) maupun `|` (literal). Melempar galat untuk bentuk yang
// memang tidak valid YAML, supaya kontribusi gagal di CI, bukan saat harness memuat skill.
export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const lines = m[1].split('\n');
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    if (/^\t/.test(line)) throw new Error('indentasi memakai tab; YAML hanya menerima spasi');
    const kv = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!kv) continue; // baris bersarang (mis. blok permission) — bukan bidang tingkat atas
    const key = kv[1];
    let val = (kv[2] ?? '').trim();
    if (/^[>|][+-]?$/.test(val)) {
      const folded = val[0] === '>';
      const body = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || /^\s*$/.test(lines[i + 1]))) body.push(lines[++i].trim());
      val = folded ? body.filter(Boolean).join(' ') : body.join('\n');
    } else if (/^".*"$/.test(val) || /^'.*'$/.test(val)) {
      val = val.slice(1, -1);
    } else if (/:\s/.test(val)) {
      throw new Error(`${key}: nilai tanpa kutip berisi ": "; bungkus dengan tanda kutip atau pakai blok >-`);
    }
    out[key] = val;
  }
  return out;
}

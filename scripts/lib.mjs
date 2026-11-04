// Fungsi bersama untuk skrip repo (bukan bagian skill).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Hanya skill ini yang boleh dipicu otomatis oleh model; sisanya hanya lewat perintah (disable-model-invocation: true).
export const AUTO_INVOKE = new Set(['agents-md', 'pawang-init']);
// Skill eksternal (repo pawangai/pawang-skills), tidak disimpan di sini.
export const EXTERNAL = ['interview', 'pawang-skill-creator'];
export const EXTERNAL_REPO = 'pawangai/pawang-skills';

export function version() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
}

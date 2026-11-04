import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pawang-test-'));
export const run = (script, args = [], opts = {}) =>
  spawnSync(process.execPath, [path.join(ROOT, script), ...args], { encoding: 'utf8', ...opts });
export const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

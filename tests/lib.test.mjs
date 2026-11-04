import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { walk, parseFrontmatter } from '../scripts/lib.mjs';
import { walk as skillWalk } from '../skills/pawang-init/scripts/init.mjs';
import { ROOT } from './helpers.mjs';

// Alat build punya salinan `walk` sendiri supaya tidak bergantung pada skrip skill yang dikirim
// ke proyek pengguna. Tes ini yang menjaga keduanya tidak melenceng.
test('walk alat build sama dengan walk milik skill', () => {
  for (const dir of ['scripts', 'skills', 'skills/pawang-init/assets', 'tests']) {
    const abs = path.join(ROOT, dir);
    assert.deepEqual(walk(abs), skillWalk(abs), dir);
  }
});

test('frontmatter: nilai satu baris, dikutip, dan blok', () => {
  assert.equal(parseFrontmatter('---\nname: fitur\n---\n').name, 'fitur');
  assert.equal(parseFrontmatter('---\nname: "fitur"\n---\n').name, 'fitur');
  assert.equal(parseFrontmatter("---\nname: 'fitur'\n---\n").name, 'fitur');
  assert.equal(parseFrontmatter('---\ndescription: >-\n  satu dua\n  tiga\n---\n').description, 'satu dua tiga');
  assert.equal(parseFrontmatter('---\ndescription: |\n  satu\n  dua\n---\n').description, 'satu\ndua');
  assert.equal(parseFrontmatter('---\ndisable-model-invocation: true\n---\n')['disable-model-invocation'], 'true');
  assert.equal(parseFrontmatter('tanpa frontmatter'), null);
  // Bidang bersarang (blok permission) tidak boleh dianggap bidang tingkat atas.
  const nested = parseFrontmatter('---\nname: a\npermission:\n  edit: deny\n  bash:\n    "*": deny\n---\n');
  assert.equal(nested.name, 'a');
  assert.equal(nested.edit, undefined);
});

test('frontmatter: YAML tidak valid ditolak, bukan diterima diam-diam', () => {
  assert.throws(() => parseFrontmatter('---\ndescription: pakai ini: untuk X\n---\n'), /tanpa kutip berisi/);
  assert.throws(() => parseFrontmatter('---\nname: x\n\tdescription: y\n---\n'), /tab/);
});

test('frontmatter semua SKILL.md bisa diparse dan wajib punya name + description', () => {
  for (const n of fs.readdirSync(path.join(ROOT, 'skills'))) {
    const f = path.join(ROOT, 'skills', n, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    const fm = parseFrontmatter(fs.readFileSync(f, 'utf8'));
    assert.ok(fm, `${n}: frontmatter tidak ada`);
    assert.equal(fm.name, n, `${n}: name tidak sama dengan folder`);
    assert.ok(fm.description && fm.description.length <= 1024, `${n}: description kosong atau terlalu panjang`);
  }
});

#!/usr/bin/env node
// compare-text.mjs: bandingkan dua teks per baris (dan per kata untuk baris yang berubah).
// HANYA BACA, tanpa dependensi (Node 18+).
//
// Pemakaian:
//   node compare-text.mjs <a.txt> <b.txt> [--samples] [--replace-a=map.json] [--ignore-pipes] [--all] [--strict]
//
// --ignore-pipes : abaikan tanda | (penanda kolom tabel). Pakai saat salah satu teks berasal dari OCR
//                  atau PDF yang tidak punya penanda kolom.
//
// Mode fidelitas (default): A = referensi, B = hasil buatan. Melaporkan baris yang sama, berubah, hilang, dan tambahan.
// Mode --samples: A dan B = dua sampel dokumen jenis sama. Baris yang sama = kandidat TEKS TEMPLATE,
//                 baris yang berbeda = kandidat FIELD DINAMIS.
// --replace-a=map.json : objek JSON {"nilai asli": "nilai sintetis"} yang diterapkan ke A sebelum dibandingkan,
//                 supaya referensi berisi data nyata bisa dicocokkan dengan hasil yang memakai data sintetis.
//                 File map berisi data nyata: simpan di assets/_work (di-gitignore), jangan di-commit.
// --words  : uji KONTEN (L1) saja: bandingkan urutan kata dengan mengabaikan pemotongan baris dan penanda tabel.
//            Tiga hasil: sama persis (urutan juga), kata sama tetapi urutan beda, atau ada kata hilang/tambahan.
//            Mode baris (default) dipakai untuk menguji struktur (L2).
// --strict : exit code 1 bila ada selisih (untuk dipakai di test/CI).

import fs from 'node:fs';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const flag = (n) => args.includes('--' + n);
const opt = (n) => (args.find((a) => a.startsWith('--' + n + '=')) || '').split('=').slice(1).join('=');
if (files.length < 2) { console.error('Pemakaian: node compare-text.mjs <a.txt> <b.txt> [--samples] [--replace-a=map.json] [--all] [--strict]'); process.exit(2); }

let rawA = fs.readFileSync(files[0], 'utf8');
const rawB = fs.readFileSync(files[1], 'utf8');
if (opt('replace-a')) {
  const map = JSON.parse(fs.readFileSync(opt('replace-a'), 'utf8'));
  for (const [from, to] of Object.entries(map)) if (from) rawA = rawA.split(from).join(to);
}
const ignorePipes = flag('ignore-pipes');
const norm = (raw) => raw.replace(/\f/g, '\n').split('\n')
  .map((l) => l.replace(/ /g, ' ').replace(/\s*\|\s*/g, ignorePipes ? ' ' : ' | ').replace(/\s+/g, ' ').trim())
  .filter((l) => l && l !== '|');
const A = norm(rawA), B = norm(rawB);

// ---------- mode --words: uji KONTEN (L1) tanpa memperhatikan pemotongan baris ----------
if (flag('words')) {
  const strictW = flag('strict');
  const squash = (lines) => lines.join(' ').replace(/\s+/g, '').replace(/\|/g, '');
  // token yang berakhiran '-' (kata terpotong di ujung baris) digabung dengan token berikutnya, di kedua sisi
  const tok = (lines) => {
    const raw = lines.join(' ').replace(/\|/g, ' ').split(/\s+/).filter(Boolean), out = [];
    for (let i = 0; i < raw.length; i++) {
      let w = raw[i];
      while (w.length > 1 && w.endsWith('-') && i + 1 < raw.length) { w += raw[++i]; }
      out.push(w);
    }
    return out;
  };
  const ta = tok(A), tb = tok(B);
  console.log('# Perbandingan konten (L1): kata demi kata, abaikan pemotongan baris dan penanda tabel');
  console.log(`A (referensi): ${ta.length} kata | B (hasil): ${tb.length} kata`);
  if (squash(A) === squash(B)) {
    console.log('\nHASIL: KONTEN SAMA PERSIS, termasuk urutan (selisih yang mungkin ada hanya pada spasi, pemotongan baris, atau kolom tabel).');
    console.log('Tata letak (L2/L3) diperiksa terpisah: mode baris (tanpa --words) dan perbandingan gambar.');
    process.exit(0);
  }
  const bag = (t) => { const c = new Map(); for (const x of t) c.set(x, (c.get(x) || 0) + 1); return c; };
  const ba = bag(ta), bb = bag(tb);
  const missing = [], extra = [];
  for (const [w, c] of ba) { const d = c - (bb.get(w) || 0); if (d > 0) missing.push(d > 1 ? `${w} (x${d})` : w); }
  for (const [w, c] of bb) { const d = c - (ba.get(w) || 0); if (d > 0) extra.push(d > 1 ? `${w} (x${d})` : w); }
  if (!missing.length && !extra.length) {
    console.log('\nHASIL: KATA SAMA, URUTAN BERBEDA.');
    console.log('Semua kata ada di kedua sisi tetapi urutannya tidak sama. Pada PDF ini sering hanya artefak urutan baca tabel (tiap pembuat PDF menyusun sel dengan cara berbeda). Cara membuktikan: bandingkan teks dari FORMAT SUMBER hasil (HTML/DOCX sebelum jadi PDF), yang urutannya pasti, atau periksa gambarnya.');
    process.exit(strictW ? 1 : 0);
  }
  console.log('\nHASIL: ADA SELISIH KONTEN.');
  if (missing.length) { console.log(`\n## Ada di referensi, tidak ada di hasil (${missing.length})`); missing.slice(0, flag('all') ? Infinity : 60).forEach((w) => console.log('- ' + w)); }
  if (extra.length) { console.log(`\n## Ada di hasil, tidak ada di referensi (${extra.length})`); extra.slice(0, flag('all') ? Infinity : 60).forEach((w) => console.log('- ' + w)); }
  console.log('\nCatatan: kata yang terpotong di tanda hubung pada akhir baris digabung otomatis. Mode ini tidak memeriksa urutan bila ada kata hilang; gunakan mode baris untuk rincian lokasi.');
  process.exit(strictW ? 1 : 0);
}

// ---------- LCS baris ----------
const n = A.length, m = B.length;
const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
const ops = [];
for (let i = 0, j = 0; i < n || j < m;) {
  if (i < n && j < m && A[i] === B[j]) { ops.push(['eq', A[i]]); i++; j++; }
  else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) { ops.push(['del', A[i]]); i++; }
  else { ops.push(['ins', B[j]]); j++; }
}

// ---------- kemiripan dan selisih kata ----------
function lcsTokens(a, b) {
  const t = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  return t;
}
function wordDiff(a, b) {
  const x = a.split(' '), y = b.split(' '), t = lcsTokens(x, y);
  const parts = []; let i = 0, j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { parts.push(x[i]); i++; j++; }
    else if (j >= y.length || (i < x.length && t[i + 1][j] >= t[i][j + 1])) { parts.push(`[-${x[i]}-]`); i++; }
    else { parts.push(`{+${y[j]}+}`); j++; }
  }
  return parts.join(' ');
}
const similarity = (a, b) => {
  const x = a.split(' '), y = b.split(' ');
  if (!x.length || !y.length) return 0;
  return (2 * lcsTokens(x, y)[0][0]) / (x.length + y.length);
};

// ---------- kelompokkan hunk dan pasangkan ----------
const equal = [], changed = [], onlyA = [], onlyB = [];
for (let k = 0; k < ops.length;) {
  if (ops[k][0] === 'eq') { equal.push(ops[k][1]); k++; continue; }
  const dels = [], inss = [];
  while (k < ops.length && ops[k][0] !== 'eq') { (ops[k][0] === 'del' ? dels : inss).push(ops[k][1]); k++; }
  const usedB = new Set();
  for (const d of dels) {
    let best = -1, bs = 0.5;
    inss.forEach((s, idx) => { if (!usedB.has(idx)) { const sc = similarity(d, s); if (sc >= bs) { bs = sc; best = idx; } } });
    if (best >= 0) { usedB.add(best); changed.push([d, inss[best]]); } else onlyA.push(d);
  }
  inss.forEach((s, idx) => { if (!usedB.has(idx)) onlyB.push(s); });
}

const lim = flag('all') ? Infinity : 60;
const show = (arr, f) => { arr.slice(0, lim).forEach(f); if (arr.length > lim) console.log(`- ... +${arr.length - lim} lagi (gunakan --all)`); };
const same = changed.length === 0 && onlyA.length === 0 && onlyB.length === 0;

if (flag('samples')) {
  console.log('# Perbandingan dua sampel (cari mana template, mana data)');
  console.log(`Sampel 1: ${A.length} baris | Sampel 2: ${B.length} baris`);
  console.log(`Baris sama: ${equal.length} | berbeda: ${changed.length} | hanya di sampel 1: ${onlyA.length} | hanya di sampel 2: ${onlyB.length}`);
  console.log('\n## Baris sama di kedua sampel (kandidat TEKS TEMPLATE; periksa juga data yang kebetulan sama)');
  show(equal, (l) => console.log('- ' + l));
  console.log('\n## Baris berbeda (kandidat FIELD DINAMIS; bagian dalam [- -] dan {+ +} adalah nilai yang berubah)');
  show(changed, ([a, b]) => console.log('- ' + wordDiff(a, b)));
  if (onlyA.length || onlyB.length) {
    console.log('\n## Hanya ada di salah satu sampel (kandidat blok kondisional atau jumlah baris yang bervariasi, mis. baris layanan)');
    show(onlyA, (l) => console.log('- [sampel 1] ' + l));
    show(onlyB, (l) => console.log('- [sampel 2] ' + l));
  }
  console.log('\nIni masih kandidat. Konfirmasikan daftar template, profil, data, dan hasil hitung ke user.');
} else {
  console.log('# Perbandingan teks: referensi (A) vs hasil (B)');
  console.log(`A: ${A.length} baris | B: ${B.length} baris`);
  console.log(`Sama persis: ${equal.length} | berubah: ${changed.length} | hilang di B: ${onlyA.length} | tambahan di B: ${onlyB.length}`);
  console.log(same ? '\nHASIL: SAMA PERSIS (setelah spasi dinormalisasi).' : '\nHASIL: ADA SELISIH.');
  if (changed.length) { console.log('\n## Berubah ([-teks A-] diganti {+teks B+})'); show(changed, ([a, b]) => console.log('- ' + wordDiff(a, b))); }
  if (onlyA.length) { console.log('\n## Ada di referensi, hilang di hasil'); show(onlyA, (l) => console.log('- ' + l)); }
  if (onlyB.length) { console.log('\n## Ada di hasil, tidak ada di referensi'); show(onlyB, (l) => console.log('- ' + l)); }
}
process.exit(flag('strict') && !same && !flag('samples') ? 1 : 0);

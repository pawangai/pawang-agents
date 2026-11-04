#!/usr/bin/env node
// probe.mjs: inventaris dan ekstraksi teks dokumen referensi. HANYA BACA, tanpa dependensi npm (Node 18+).
// Memakai CLI yang sudah ada bila tersedia (pdftotext, pdfinfo, pdffonts, pdftoppm, tesseract, convert, soffice).
// Tidak memasang apa pun dan tidak mengirim file ke mana pun.
//
// Pemakaian:
//   node probe.mjs [file-atau-folder] [--render] [--full] [--no-ocr] [--lang=ind+eng] [--out=folder]
//   Tanpa argumen: memindai folder ../assets (dropzone skill ini).
//   --render   render halaman PDF ke PNG (150 dpi) di folder kerja agar bisa dilihat
//   --full     tampilkan seluruh teks (default dipotong 6000 karakter; teks lengkap selalu disimpan di file)
//   --no-ocr   jangan jalankan OCR
//   --out=DIR  folder kerja (default ../assets/_work, yang di-gitignore)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillAssets = path.join(here, '..', 'assets');
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => (args.find((a) => a.startsWith('--' + n + '=')) || '').split('=').slice(1).join('=');
const target = path.resolve(args.find((a) => !a.startsWith('--')) || skillAssets);
const workDir = path.resolve(opt('out') || path.join(skillAssets, '_work'));
const FULL = flag('full'), RENDER = flag('render'), NO_OCR = flag('no-ocr');
const LIMIT = 6000;

// ---------- util ----------
const out = [];
const p = (s = '') => out.push(s);
const has = (cmd) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
const run = (cmd, a, o = {}) => {
  const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, timeout: 180000, ...o });
  return r.status === 0 ? r.stdout : null;
};
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const uniq = (a) => [...new Set(a)];
const topN = (arr, n) => {
  const c = new Map(); for (const x of arr) c.set(x, (c.get(x) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v}x)`);
};
const safeName = (f) => path.basename(f).replace(/[^A-Za-z0-9._-]+/g, '_');
const tools = Object.fromEntries(['pdftotext', 'pdfinfo', 'pdffonts', 'pdftoppm', 'tesseract', 'convert', 'soffice'].map((t) => [t, has(t)]));

function ensureWork() { try { fs.mkdirSync(workDir, { recursive: true }); return true; } catch { return false; } }
function saveText(file, text) {
  if (!ensureWork()) return null;
  const f = path.join(workDir, safeName(file) + '.txt');
  fs.writeFileSync(f, text);
  return f;
}
function showText(text) {
  p('```');
  p(FULL || text.length <= LIMIT ? text : text.slice(0, LIMIT) + `\n... [dipotong; ${text.length - LIMIT} karakter lagi di file teks]`);
  p('```');
}

// ---------- deteksi tipe ----------
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  const total = buf.readUInt16LE(eocd + 10), cdOff = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  let q = cdOff;
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(q) !== 0x02014b50) break;
    const method = buf.readUInt16LE(q + 10), csize = buf.readUInt32LE(q + 20), usize = buf.readUInt32LE(q + 24);
    const nl = buf.readUInt16LE(q + 28), el = buf.readUInt16LE(q + 30), cl = buf.readUInt16LE(q + 32), lho = buf.readUInt32LE(q + 42);
    entries.set(buf.toString('utf8', q + 46, q + 46 + nl), { method, csize, usize, lho });
    q += 46 + nl + el + cl;
  }
  const get = (name) => {
    const e = entries.get(name); if (!e) return null;
    const lnl = buf.readUInt16LE(e.lho + 26), lel = buf.readUInt16LE(e.lho + 28);
    const start = e.lho + 30 + lnl + lel;
    const data = buf.subarray(start, start + e.csize);
    return e.method === 0 ? data : zlib.inflateRawSync(data);
  };
  return { names: [...entries.keys()], sizes: entries, get };
}
function detect(buf, name) {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf.subarray(0, 5).toString() === '%PDF-') return 'pdf';
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const z = readZip(buf);
    if (z && z.names.includes('word/document.xml')) return 'docx';
    return 'zip-lain';
  }
  const head = buf.subarray(0, 4096).toString('utf8').toLowerCase();
  if (/<!doctype html|<html|<body|<table/.test(head) || /\.html?$/i.test(name)) return 'html';
  if (/\.(webp|gif|bmp|tiff?)$/i.test(name)) return 'gambar-lain';
  if (/\.(doc|odt|rtf)$/i.test(name)) return 'dokumen-lain';
  return 'tidak-dikenal';
}

// ---------- gambar ----------
function imageInfo(buf, type) {
  let w, h, dpi = null;
  if (type === 'png') {
    w = buf.readUInt32BE(16); h = buf.readUInt32BE(20);
    const i = buf.indexOf('pHYs');
    if (i > 0 && buf[i + 12] === 1) dpi = Math.round(buf.readUInt32BE(i + 4) * 0.0254);
  } else {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (m === 0xe0 && buf.toString('ascii', i + 4, i + 8) === 'JFIF') {
        const units = buf[i + 11], xd = buf.readUInt16BE(i + 12);
        if (units === 1) dpi = xd; else if (units === 2) dpi = Math.round(xd * 2.54);
      }
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; }
      i += 2 + len;
    }
  }
  return { w, h, dpi };
}
function paperGuess(w, h) {
  if (!w || !h) return '-';
  const r = Math.max(w, h) / Math.min(w, h), orient = h >= w ? 'portrait' : 'landscape';
  const papers = [['A4/A5 (rasio 1.414)', 1.414], ['Letter (1.294)', 1.294], ['Legal (1.647)', 1.647], ['F4/Folio (1.535)', 1.535], ['persegi/lainnya', 1]];
  const best = papers.map(([n, v]) => [n, Math.abs(r - v) / v]).sort((a, b) => a[1] - b[1])[0];
  return best[1] <= 0.03 ? `${best[0]}, ${orient}` : `rasio ${r.toFixed(3)} (${orient}), tidak cocok kertas standar: mungkin screenshot atau foto`;
}
let ocrLangCache = null;
function ocrLang() {
  if (opt('lang')) return opt('lang');
  if (ocrLangCache) return ocrLangCache;
  const l = run('tesseract', ['--list-langs']) || '';
  ocrLangCache = l.includes('ind') && l.includes('eng') ? 'ind+eng' : l.includes('eng') ? 'eng' : '';
  return ocrLangCache;
}
function ocr(file) {
  const lang = ocrLang();
  const a = [file, 'stdout']; if (lang) a.push('-l', lang);
  const psm = opt('psm'); if (psm) a.push('--psm', psm);
  a.push('tsv');
  const tsv = run('tesseract', a);
  if (!tsv) return null;
  const lines = new Map(), low = [];
  for (const row of tsv.split('\n').slice(1)) {
    const c = row.split('\t');
    if (c.length < 12) continue;
    const conf = parseFloat(c[10]), text = c[11].trim();
    if (!text || conf < 0) continue;
    const key = `${c[2]}-${c[3]}-${c[4]}`;
    lines.set(key, (lines.get(key) || []).concat(text));
    if (conf < 70) low.push(`"${text}" (${Math.round(conf)}%) @${c[6]},${c[7]}`);
  }
  return { text: [...lines.values()].map((w) => w.join(' ')).join('\n'), low, lang: lang || '(default)' };
}
function doOcr(file, label) {
  if (NO_OCR) { p('OCR dilewati (--no-ocr). Baca teks dari gambar secara visual dan konfirmasikan ke user.'); return null; }
  if (!tools.tesseract) { p('tesseract tidak ada: OCR tidak dijalankan. Baca teks dari gambar secara visual dan konfirmasikan teks statis ke user. (Saran: pasang tesseract-ocr dengan paket bahasa ind.)'); return null; }
  const r = ocr(file);
  if (!r) { p('OCR gagal dijalankan.'); return null; }
  p(`Teks: OCR tesseract (bahasa ${r.lang}). HASIL OCR BELUM TERVERIFIKASI: bandingkan dengan gambar dan konfirmasikan ke user, terutama angka dan pasal.`);
  if (r.low.length) p(`Kata berkepercayaan rendah (periksa): ${r.low.slice(0, 40).join('; ')}${r.low.length > 40 ? ` ... +${r.low.length - 40}` : ''}`);
  return r.text;
}

// ---------- PDF ----------
function pdfProbe(file, buf) {
  let pages = null;
  if (tools.pdfinfo) {
    const info = run('pdfinfo', [file]) || '';
    pages = +(info.match(/^Pages:\s+(\d+)/m) || [])[1] || null;
    p(`Halaman: ${pages ?? '?'} | Ukuran: ${(info.match(/^Page size:\s+(.+)$/m) || [])[1] || '?'} | Pembuat: ${(info.match(/^Producer:\s+(.+)$/m) || [])[1] || '?'}`);
  } else {
    pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    p(`Halaman (perkiraan kasar): ${pages}. pdfinfo tidak ada (paket poppler-utils).`);
  }
  if (tools.pdffonts) {
    const f = (run('pdffonts', [file]) || '').split('\n').slice(2).filter(Boolean).map((l) => l.trim().split(/\s+/)).map((c) => `${c[0]} [${c.slice(1, c.length - 6).join(' ')}${c[c.length - 5] === 'no' ? ', TIDAK embedded' : ''}]`);
    p(`Font: ${f.length ? uniq(f).join('; ') : '(tidak ada font teks: kemungkinan gambar hasil scan)'}`);
  }
  let text = null;
  if (tools.pdftotext) text = run('pdftotext', ['-layout', file, '-']);
  else p('pdftotext tidak ada: ekstraksi teks PDF tidak bisa dilakukan tanpa poppler-utils. Render halaman jadi gambar dan baca secara visual.');
  const perPage = text && pages ? text.replace(/\f/g, '').replace(/\s/g, '').length / pages : 0;
  const scanned = text !== null && perPage < 25;
  if (RENDER || scanned) {
    if (tools.pdftoppm && ensureWork()) {
      const base = path.join(workDir, safeName(file).replace(/\.pdf$/i, ''));
      run('pdftoppm', ['-r', scanned ? '300' : '150', '-png', file, base]);
      const made = fs.readdirSync(workDir).filter((n) => n.startsWith(path.basename(base) + '-') && n.endsWith('.png')).sort();
      p(`Halaman dirender ke: ${made.map((n) => path.join(workDir, n)).join(', ') || '(gagal)'}`);
      if (scanned) {
        p('Lapisan teks PDF kosong atau minim: ini hasil scan, memakai OCR per halaman.');
        const parts = [];
        for (const n of made) { const t = doOcr(path.join(workDir, n), n); if (t) parts.push(t); }
        text = parts.join('\n\n');
        return { text, source: 'OCR (PDF hasil scan)' };
      }
    } else if (scanned) p('PDF hasil scan, tetapi pdftoppm tidak ada untuk merender halaman.');
  }
  return { text: text && text.replace(/\f/g, '\n\n').replace(/[ \t]+$/gm, ''), source: 'pdftotext -layout (lapisan teks asli: akurat)' };
}

// ---------- DOCX ----------
const paraText = (x) => {
  let t = '', m;
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\b[^>]*\/>|<w:cr\s*\/>/g;
  while ((m = re.exec(x))) t += m[1] !== undefined ? decode(m[1]) : m[0].startsWith('<w:tab') ? '\t' : '\n';
  return t;
};
function blocksText(xml) {
  const lines = [];
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[0];
    if (b.startsWith('<w:tbl>')) {
      for (const tr of b.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []) {
        const cells = (tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []).map((tc) => (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(paraText).join(' ').replace(/\s+/g, ' ').trim());
        lines.push('| ' + cells.join(' | ') + ' |');
      }
    } else lines.push(paraText(b));
  }
  return lines.join('\n');
}
function docxProbe(buf) {
  const z = readZip(buf);
  const read = (n) => { const d = z.get(n); return d ? d.toString('utf8') : ''; };
  const doc = read('word/document.xml');
  const extra = z.names.filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n));
  const styles = read('word/styles.xml'), theme = read('word/theme/theme1.xml');
  const all = doc + extra.map(read).join('');
  const defaults = (styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/) || [''])[0];
  const themeMap = { major: (theme.match(/<a:majorFont>\s*<a:latin typeface="([^"]*)"/) || [])[1], minor: (theme.match(/<a:minorFont>\s*<a:latin typeface="([^"]*)"/) || [])[1] };
  const fontsIn = (x) => [...x.matchAll(/<w:rFonts\b[^>]*>/g)].flatMap((t) => [
    ...[...t[0].matchAll(/w:(?:ascii|hAnsi|cs|eastAsia)="([^"]+)"/g)].map((m) => m[1]),
    ...[...t[0].matchAll(/w:(?:ascii|hAnsi)Theme="(major|minor)\w*"/g)].map((m) => themeMap[m[1]] ? `${themeMap[m[1]]} (tema ${m[1]})` : null).filter(Boolean),
  ]);
  const themeFonts = [['major', theme.match(/<a:majorFont>\s*<a:latin typeface="([^"]*)"/)], ['minor', theme.match(/<a:minorFont>\s*<a:latin typeface="([^"]*)"/)]].filter(([, m]) => m && m[1]).map(([k, m]) => `${m[1]} (tema ${k})`);
  const sect = (doc.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || []).pop() || '';
  const attr = (tag, a) => (tag.match(new RegExp(`w:${a}="([^"]+)"`)) || [])[1];
  const pgSz = (sect.match(/<w:pgSz[^>]*>/) || [''])[0], pgMar = (sect.match(/<w:pgMar[^>]*>/) || [''])[0];
  const mm = (tw) => (tw ? (+tw / 1440 * 25.4).toFixed(1) : '?');
  p(`Halaman: ${mm(attr(pgSz, 'w'))} x ${mm(attr(pgSz, 'h'))} mm${attr(pgSz, 'orient') ? ' (' + attr(pgSz, 'orient') + ')' : ''} | Margin atas/kanan/bawah/kiri (mm): ${['top', 'right', 'bottom', 'left'].map((s) => mm(attr(pgMar, s))).join(' / ')}`);
  p(`Font eksplisit di isi dokumen: ${uniq(fontsIn(all)).join(', ') || '-'} | Font bawaan (docDefaults): ${uniq(fontsIn(defaults)).join(', ') || '-'}${themeFonts.length ? ' | Font tema: ' + themeFonts.join(', ') : ''}`);
  p(`Ukuran font eksplisit (pt): ${topN([...all.matchAll(/<w:sz w:val="(\d+)"/g)].map((m) => +m[1] / 2), 6).join(', ') || '-'} | Ukuran bawaan (pt): ${[...defaults.matchAll(/<w:sz w:val="(\d+)"/g)].map((m) => +m[1] / 2).join(', ') || '-'}`);
  p(`Gaya yang dipakai: ${topN([...doc.matchAll(/<w:(?:pStyle|tblStyle|rStyle) w:val="([^"]+)"/g)].map((m) => m[1]), 8).join(', ') || '-'} (detail font/warna gaya ada di word/styles.xml)`);
  p(`Warna teks eksplisit: ${topN([...all.matchAll(/<w:color w:val="([0-9A-Fa-f]{6})"/g)].map((m) => '#' + m[1].toUpperCase()), 6).join(', ') || '-'} | Warna latar eksplisit: ${topN([...all.matchAll(/<w:shd [^>]*w:fill="([0-9A-Fa-f]{6})"/g)].map((m) => '#' + m[1].toUpperCase()), 6).join(', ') || '-'}`);
  const media = z.names.filter((n) => n.startsWith('word/media/'));
  p(`Tabel: ${(doc.match(/<w:tbl>/g) || []).length} | Paragraf: ${(doc.match(/<w:p[ >]/g) || []).length} | Gambar tertanam: ${media.length}${media.length ? ' (' + media.map((n) => `${path.basename(n)} ${z.sizes.get(n).usize}B`).join(', ') + ')' : ''}`);
  let text = blocksText(doc);
  for (const n of extra) text = `[${/header/.test(n) ? 'HEADER' : 'FOOTER'} ${path.basename(n)}]\n${blocksText(read(n))}\n\n` + text;
  return { text, source: 'XML DOCX (teks asli: akurat; tabel ditulis sebagai | a | b |)' };
}

// ---------- HTML ----------
function htmlProbe(src) {
  const css = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n') + '\n' + [...src.matchAll(/style="([^"]*)"/gi)].map((m) => m[1]).join(';');
  p(`Judul: ${decode((src.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '-').trim()}`);
  p(`Font (font-family): ${topN([...css.matchAll(/font-family:\s*([^;}"]+)/gi)].map((m) => m[1].trim()), 5).join(' | ') || '-'}`);
  const ff = uniq([...css.matchAll(/@font-face\s*{[^}]*font-family:\s*([^;}]+)/gi)].map((m) => m[1].trim()));
  if (ff.length) p(`@font-face: ${ff.join(', ')}`);
  p(`Ukuran font: ${topN([...css.matchAll(/font-size:\s*([^;}"]+)/gi)].map((m) => m[1].trim()), 6).join(', ') || '-'}`);
  p(`Warna hex: ${topN([...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()), 8).join(', ') || '-'}`);
  const pg = [...css.matchAll(/@page[^{]*{[^}]*}/g)].map((m) => m[0].replace(/\s+/g, ' '));
  p(`@page: ${pg.join(' ') || 'tidak ada'}`);
  const imgs = [...src.matchAll(/<img[^>]*\ssrc="([^"]+)"/gi)].map((m) => (m[1].startsWith('data:') ? 'data:URI(' + m[1].length + ' karakter)' : m[1]));
  p(`Tabel: ${(src.match(/<table/gi) || []).length} | Gambar: ${imgs.length}${imgs.length ? ' (' + imgs.slice(0, 5).join(', ') + ')' : ''}`);
  let s = src.replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6]|section|header|footer|table|thead|tbody|tfoot|ul|ol)>/gi, '\n').replace(/<\/(td|th)>/gi, ' | ');
  s = decode(s.replace(/<[^>]+>/g, ''));
  const lines = s.split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).map((l) => (/\|\s*$/.test(l) ? '| ' + l : l));
  return { text: lines.join('\n'), source: 'HTML (teks asli: akurat; teks yang diisi lewat JavaScript tidak ikut terbaca)' };
}

// ---------- jalankan ----------
function probeFile(file) {
  const buf = fs.readFileSync(file);
  const type = detect(buf, file);
  p(`## ${path.basename(file)}  [${type}]`);
  p(`Ukuran: ${(buf.length / 1024).toFixed(1)} KB`);
  let res = null;
  try {
    if (type === 'png' || type === 'jpeg') {
      const { w, h, dpi } = imageInfo(buf, type);
      p(`Dimensi: ${w} x ${h} px${dpi ? `, ${dpi} dpi (≈ ${(w / dpi * 25.4).toFixed(0)} x ${(h / dpi * 25.4).toFixed(0)} mm)` : ', dpi tidak tercatat'} | Perkiraan kertas: ${paperGuess(w, h)}`);
      if (w < 1000) p('Peringatan: resolusi rendah; OCR dan pembacaan visual kurang andal. Minta versi beresolusi lebih tinggi atau PDF aslinya.');
      p('Font dan warna pasti tidak bisa dibaca dari gambar: itu perkiraan visual. Minta nama font ke user atau file aslinya.');
      const t = doOcr(file, path.basename(file)); res = t ? { text: t, source: 'OCR (belum terverifikasi)' } : null;
    } else if (type === 'pdf') res = pdfProbe(file, buf);
    else if (type === 'docx') res = docxProbe(buf);
    else if (type === 'html') res = htmlProbe(buf.toString('utf8'));
    else if (type === 'gambar-lain') p(`Format gambar ini belum dibaca langsung. Konversi dulu: ${tools.convert ? `convert "${file}" "${path.join(workDir, safeName(file) + '.png')}"` : 'pasang ImageMagick atau minta PNG/JPEG'}.`);
    else if (type === 'dokumen-lain') p(`Konversi dulu ke PDF/DOCX: ${tools.soffice ? `soffice --headless --convert-to pdf --outdir "${workDir}" "${file}"` : 'pasang LibreOffice atau minta PDF'}.`);
    else p('Tipe tidak dikenali. Minta user mengirim PDF, DOCX, HTML, PNG, atau JPEG.');
  } catch (e) { p(`Gagal memproses: ${e.message}`); }
  if (res && res.text && res.text.trim()) {
    const f = saveText(file, res.text);
    p(`Sumber teks: ${res.source}${f ? ` | tersimpan: ${f}` : ''}`);
    showText(res.text.trim());
  }
  p('');
}

if (!fs.existsSync(target)) { console.error('Tidak ditemukan: ' + target); process.exit(1); }
p('# Inventaris dokumen referensi');
p(`Alat tersedia: ${Object.entries(tools).map(([k, v]) => `${k}=${v ? 'ya' : 'tidak'}`).join(', ')}`);
p('');
let list;
if (fs.statSync(target).isDirectory()) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || e.name === '_work' || e.isSymbolicLink()) return [];
    const f = path.join(d, e.name);
    if (e.isDirectory()) return walk(f);
    return e.name === 'README.md' && d === target ? [] : [f];
  });
  list = walk(target).sort();
  if (!list.length) {
    p(`Folder kosong: ${target}`);
    p('Taruh dokumen referensi (PNG, JPEG, PDF, DOCX, HTML) di folder ini atau lampirkan di chat, lalu jalankan lagi.');
  }
} else list = [target];
for (const f of list) probeFile(f);
if (list.length) {
  p('Langkah berikut: lihat dokumennya langsung (gambar atau halaman render), cocokkan dengan teks di atas, lalu klasifikasikan teks menjadi T/P/D/C (lihat SKILL.md).');
}
console.log(out.join('\n'));

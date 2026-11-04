#!/usr/bin/env node
// skill-precheck.mjs: pemeriksaan STATIS sebuah folder skill sebelum dipasang. Lapis 1.
// Tanpa LLM, tanpa jaringan, tanpa dependensi (Node 18+). Tidak mengeksekusi apa pun dari skill,
// tidak mengikuti symlink, hanya membaca. Karena tidak memakai LLM, isi skill tidak bisa "membujuk" pemeriksa ini.
//
// Pemakaian: node skill-precheck.mjs <folder-skill> [--all] [--strict]
//   <folder-skill>  folder yang berisi SKILL.md (hasil clone ke folder sementara DI LUAR proyek)
//   --all           tampilkan semua temuan (default dibatasi per tingkat)
//   --strict        exit code 1 bila ada temuan HIGH
//
// PENTING: hasil BERSIH bukan berarti AMAN. Skrip ini hanya menangkap pola yang dikenal.
// Tinjauan semantik (maksud, kesesuaian izin) tetap perlu skill-inspector dan pembacaan oleh manusia.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const target = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const showAll = args.includes('--all'), strict = args.includes('--strict');
if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) { console.error('Folder skill tidak ditemukan: ' + target); process.exit(2); }

const MAX_FILE = 1_000_000, MAX_FILES = 2000;
const findings = [];
const add = (sev, where, id, msg, ex) => findings.push({ sev, where, id, msg, ex });
const show = (s) => String(s)
  .replace(/[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g, (c) => `<U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}>`)
  .replace(/[\u{E0000}-\u{E007F}]/gu, (c) => `<U+${c.codePointAt(0).toString(16).toUpperCase()}>`)
  .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '?').trim().slice(0, 110);

// ---------- telusur (tanpa mengikuti symlink) ----------
const files = [];
let count = 0;
(function walk(d) {
  let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (++count > MAX_FILES) return;
    const f = path.join(d, e.name), r = path.relative(target, f).split(path.sep).join('/');
    if (e.name === '.git') continue;
    if (e.isSymbolicLink()) {
      let to = ''; try { to = fs.readlinkSync(f); } catch { /* abaikan */ }
      const outside = path.isAbsolute(to) || to.split('/').includes('..');
      add(outside ? 'HIGH' : 'MED', r, 'symlink', `symlink ke "${show(to)}"${outside ? ' (keluar dari folder skill)' : ''}`, '');
      continue;
    }
    if (e.isDirectory()) { if (e.name === 'node_modules') add('MED', r, 'node_modules', 'folder node_modules ikut dibawa (kode pihak ketiga yang tidak terbaca)', ''); else walk(f); }
    else if (e.isFile()) files.push({ f, r, size: fs.statSync(f).size, mode: fs.statSync(f).mode });
  }
})(target);
if (count > MAX_FILES) add('MED', '.', 'banyak-file', `lebih dari ${MAX_FILES} file; pemindaian dipotong`, '');
if (!fs.existsSync(path.join(target, 'SKILL.md'))) add('MED', '.', 'tanpa-skill-md', 'tidak ada SKILL.md di folder ini (bukan folder skill?)', '');

// ---------- aturan ----------
const R = (sev, id, re, msg) => ({ sev, id, re, msg });
const CODE_RULES = [
  R('HIGH', 'pipe-ke-shell', /\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(ba|z|k|da)?sh\b|Invoke-Expression|\biex\s*\(?\s*(iwr|irm|\(New-Object)/i, 'mengunduh lalu langsung menjalankan kode'),
  R('HIGH', 'akses-kredensial', /(\.ssh\b|\.aws\b|\.gnupg\b|\.kube\b|\.docker\/config|\.npmrc|\.netrc|\.git-credentials|gcloud\/credentials|id_rsa|id_ed25519|\/etc\/(passwd|shadow)|keychain|Login Data|Cookies\.sqlite)/i, 'menyentuh lokasi kredensial atau kunci'),
  R('HIGH', 'tulis-konfigurasi-agent', /(writeFile|appendFile|writeFileSync|>>|\btee\b|sed\s+-i|fs\.write)[^\n]*(opencode\.json|AGENTS\.md|CLAUDE\.md|settings\.json|\.bashrc|\.zshrc|authorized_keys)/i, 'menulis ke konfigurasi agent, shell, atau SSH'),
  R('HIGH', 'destruktif-berat', /\bmkfs\b|\bdd\s+if=|>\s*\/dev\/sd|:\(\)\s*\{\s*:\|:&\s*\};:/, 'perintah yang menghancurkan disk'),
  R('MED', 'rahasia-env', /(\.env\b|\.dev\.vars|credentials\.json|secrets?\.(json|ya?ml))/i, 'menyebut atau membaca berkas rahasia (.env, .dev.vars, dst.)'),
  R('MED', 'panen-env', /(JSON\.stringify\(\s*process\.env|Object\.(keys|entries|values)\(\s*process\.env|\.\.\.process\.env|\bprintenv\b|\benv\s*\||os\.environ(?!\s*[\[.]get))/, 'mengambil seluruh variabel lingkungan'),
  R('MED', 'jaringan', /\b(fetch|axios|XMLHttpRequest|WebSocket|http\.request|https\.request|urllib|requests\.(get|post|put)|net\.connect)\b\s*\(|\b(curl|wget|nc|ncat|scp|rsync|sftp|ftp)\s+-?\w/, 'akses jaringan keluar'),
  R('MED', 'eval-dinamis', /\beval\s*\(|new Function\s*\(|\bexec\s*\(\s*(atob|base64)|Function\(\s*['"]return/, 'menjalankan kode dinamis'),
  R('MED', 'base64', /base64\s+(-d|--decode)|\batob\s*\(|Buffer\.from\([^)]*['"]base64['"]/, 'dekode base64 (sering dipakai menyembunyikan muatan)'),
  R('MED', 'destruktif', /\brm\s+-[a-zA-Z]*r[a-zA-Z]*\b|\bsudo\b|chmod\s+(-R\s+)?[0-7]*7[0-7]{1,2}\b|git\s+push\s+(--force|-f)\b|git\s+reset\s+--hard/, 'perintah destruktif atau berhak tinggi'),
  R('MED', 'persistensi', /\b(crontab|launchctl|systemctl|schtasks)\b|authorized_keys|\.git\/hooks|\.husky\b|\.bashrc|\.zshrc|\.profile\b/, 'menanam proses atau hook yang bertahan'),
  R('MED', 'pasang-paket', /\b(npm|pnpm|yarn|bun)\s+(i|install|add)\b|\bpip3?\s+install\b|npx\s+(-y|--yes)\b|\bgo\s+install\b|cargo\s+install/, 'memasang paket saat dijalankan'),
  R('MED', 'obfuscation', /[A-Za-z0-9+\/=]{200,}|(\\x[0-9a-fA-F]{2}){12,}|String\.fromCharCode\([^)]{40,}\)/, 'blob panjang atau penyamaran (base64, hex, charcode)'),
  R('LOW', 'proses-anak', /child_process|\bspawn(Sync)?\s*\(|\bexecSync\s*\(|\bexec\s*\(|subprocess\.|os\.system\s*\(|popen\s*\(/, 'menjalankan proses lain'),
];
const PROSE_RULES = [
  R('HIGH', 'injeksi-abaikan', /ignore (all |any |the )?(previous|prior|above|earlier|other) (instructions|rules|prompts|messages)|disregard (all |any |the )?(previous|prior|above|system)|abaikan (semua )?(instruksi|aturan|perintah) (sebelumnya|di atas|lain|sistem)/i, 'instruksi untuk mengabaikan aturan lain'),
  R('HIGH', 'injeksi-rahasiakan', /(do not|don'?t|never) (tell|inform|mention|show|reveal|alert|notify)( to)? (the )?user|jangan (beri tahu|katakan|tampilkan|laporkan|sebutkan) (ke |kepada )?(user|pengguna)/i, 'instruksi menyembunyikan sesuatu dari user'),
  R('HIGH', 'injeksi-matikan-pengaman', /(bypass|disable|turn off|override|skip)\b[^.\n]{0,30}\b(safety|permission|sandbox|approval|confirmation|guardrail|security)|(nonaktifkan|matikan|lewati)\b[^.\n]{0,30}\b(izin|permission|sandbox|persetujuan|konfirmasi|keamanan)/i, 'instruksi mematikan pengaman atau izin'),
  R('HIGH', 'injeksi-kirim-keluar', /exfiltrat\w*|(send|upload|post|forward|kirim|unggah)\b[^.\n]{0,60}\b(to|ke)\b[^.\n]{0,40}https?:\/\//i, 'instruksi mengirim data ke alamat luar'),
  R('MED', 'injeksi-diam-diam', /\b(secretly|silently|quietly|covertly|diam-diam|tanpa sepengetahuan)\b/i, 'tindakan yang disebut dilakukan diam-diam'),
  R('MED', 'injeksi-tanpa-izin', /without (asking|telling|informing|notifying|confirmation|user (approval|consent))|tanpa (bertanya|memberi tahu|konfirmasi|persetujuan)/i, 'tindakan tanpa izin atau konfirmasi (periksa konteks: bisa berupa larangan yang sah)'),
  R('MED', 'tiru-struktur-prompt', /\[system\]|<\/?system>|<\|im_(start|end)\|>|system prompt|developer message/i, 'meniru struktur pesan sistem'),
];
const UNICODE = [
  R('HIGH', 'unicode-tag', /[\u{E0000}-\u{E007F}]/u, 'karakter tag Unicode tak terlihat (dapat menyelundupkan teks)'),
  R('HIGH', 'unicode-tak-terlihat', /[​-‏‪-‮⁠-⁤⁦-⁩]/, 'karakter tak terlihat atau pengatur arah teks'),
];
const textExt = /\.(md|mdx|txt|json|jsonc|ya?ml|toml|js|mjs|cjs|ts|mts|tsx|jsx|py|sh|bash|zsh|ps1|rb|go|rs|php|html?|css|csv|sql|ini|cfg)$/i;
const binExt = /\.(exe|dll|so|dylib|bin|wasm|jar|class|pyc|o|a|node|dmg|msi|apk)$/i;

for (const { f, r, size, mode } of files) {
  const ext = path.extname(r).toLowerCase();
  if (binExt.test(r)) { add('MED', r, 'biner', 'file biner/terkompilasi yang tidak bisa dibaca', ''); continue; }
  if (size > MAX_FILE) { add('MED', r, 'besar', `file ${(size / 1e6).toFixed(1)} MB tidak dipindai`, ''); continue; }
  let buf; try { buf = fs.readFileSync(f); } catch { continue; }
  if (buf.subarray(0, 8000).includes(0)) { add('MED', r, 'biner', 'file berisi byte biner yang tidak bisa dibaca', ''); continue; }
  if (!textExt.test(r) && ext) add('LOW', r, 'ekstensi-asing', `ekstensi tidak lazim (${ext}), tetap dipindai sebagai teks`, '');
  if (mode & 0o111 && !/\.(sh|mjs|js|py)$/.test(r)) add('LOW', r, 'dapat-dieksekusi', 'berkas memiliki izin eksekusi', '');
  if (path.basename(r).startsWith('.') && r.indexOf('/') < 0 && !['.gitignore'].includes(r)) add('LOW', r, 'berkas-tersembunyi', 'berkas tersembunyi', '');
  const text = buf.toString('utf8');
  const lines = text.split('\n');
  const isMd = /\.(md|mdx)$/i.test(r);

  // karakter tak terlihat
  for (const u of UNICODE) {
    const hits = [...text.matchAll(new RegExp(u.re.source, u.re.flags.includes('g') ? u.re.flags : u.re.flags + 'g'))];
    if (hits.length) { const ln = text.slice(0, hits[0].index).split('\n').length; add(u.sev, `${r}:${ln}`, u.id, `${u.msg}, ${hits.length} kali`, show(lines[ln - 1] || '')); }
  }
  if (r.split('/').pop() === 'SKILL.md' || isMd) {
    // komentar HTML tersembunyi
    for (const m of text.matchAll(/<!--([\s\S]*?)-->/g)) {
      if (m[1].trim().length > 15) { const ln = text.slice(0, m.index).split('\n').length; add('MED', `${r}:${ln}`, 'komentar-html', 'komentar HTML tidak tampil di versi ter-render tetapi dibaca agent', show(m[1])); }
    }
  }
  if (r === 'package.json') {
    try {
      const j = JSON.parse(text);
      for (const k of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack']) if (j.scripts && j.scripts[k]) add('HIGH', r, 'hook-npm', `skrip siklus hidup "${k}" berjalan otomatis saat npm install`, show(j.scripts[k]));
      const deps = Object.keys({ ...(j.dependencies || {}), ...(j.devDependencies || {}) });
      if (deps.length) add('LOW', r, 'dependensi', `${deps.length} dependensi npm: ${deps.slice(0, 8).join(', ')}${deps.length > 8 ? ', ...' : ''}`, '');
    } catch { /* abaikan */ }
  }

  // aturan per baris
  let fence = false;
  lines.forEach((line, i) => {
    const where = `${r}:${i + 1}`;
    if (isMd && /^\s*(```|~~~)/.test(line)) { fence = !fence; return; }
    const inCode = !isMd || fence;
    if (inCode) for (const rule of CODE_RULES) { if (rule.re.test(line)) add(isMd && rule.sev !== 'HIGH' ? 'LOW' : rule.sev, where, rule.id, rule.msg + (isMd ? ' (di blok kode dokumen)' : ''), show(line)); }
    if (isMd && !fence) for (const rule of PROSE_RULES) { if (rule.re.test(line)) add(rule.sev, where, rule.id, rule.msg, show(line)); }
    if (!isMd) for (const rule of PROSE_RULES.filter((x) => x.id.startsWith('injeksi'))) { if (/^\s*(\/\/|#|\*|--)/.test(line) && rule.re.test(line)) add(rule.sev, where, rule.id, rule.msg + ' (di komentar kode)', show(line)); }
  });
}

// ---------- frontmatter SKILL.md ----------
const sk = path.join(target, 'SKILL.md');
if (fs.existsSync(sk)) {
  const t = fs.readFileSync(sk, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) add('MED', 'SKILL.md', 'tanpa-frontmatter', 'tidak ada frontmatter (name dan description)', '');
  else {
    const get = (k) => (m[1].match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1];
    const name = (get('name') || '').replace(/^["']|["']$/g, ''), desc = (get('description') || '');
    if (!name || !desc) add('MED', 'SKILL.md', 'frontmatter-kurang', 'name atau description kosong', '');
    if (name && name !== path.basename(target)) add('LOW', 'SKILL.md', 'nama-beda', `name "${name}" berbeda dari nama folder "${path.basename(target)}"`, '');
    if (/\b(always|every (task|request|message|prompt|session)|any task|all tasks|all requests|semua (tugas|permintaan)|setiap (tugas|permintaan|pesan|sesi)|untuk apa saja)\b/i.test(desc)) add('MED', 'SKILL.md', 'pemicu-luas', 'deskripsi memicu skill di hampir semua situasi (membebani setiap sesi dan memudahkan dibajak)', show(desc));
    if (desc.length > 400) add('LOW', 'SKILL.md', 'deskripsi-panjang', `deskripsi ${desc.length} karakter (dimuat di setiap sesi)`, '');
    if (/^\s*(allowed-tools|tools)\s*:.*(\*|Bash)/mi.test(m[1])) add('MED', 'SKILL.md', 'izin-luas', 'meminta izin tool yang luas di frontmatter', show((m[1].match(/^\s*(allowed-tools|tools)\s*:.*$/mi) || [''])[0]));
    if (/internal\s*:\s*true/i.test(m[1])) add('LOW', 'SKILL.md', 'tersembunyi', 'ditandai metadata.internal (tidak muncul di penelusuran biasa)', '');
  }
}

// ---------- host dari URL ----------
const hosts = new Map();
for (const { f, r, size } of files) {
  if (size > MAX_FILE || binExt.test(r)) continue;
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const m of t.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) hosts.set(m[1].toLowerCase(), (hosts.get(m[1].toLowerCase()) || 0) + 1);
}

// ---------- laporan ----------
const order = { HIGH: 0, MED: 1, LOW: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.where.localeCompare(b.where));
const c = (s) => findings.filter((x) => x.sev === s).length;
const out = [];
out.push(`# Pra-pemeriksaan statis skill: ${path.basename(target)}`);
out.push(`File dipindai: ${files.length} (${files.reduce((s, x) => s + x.size, 0)} byte) | Temuan: ${c('HIGH')} HIGH, ${c('MED')} MED, ${c('LOW')} LOW`);
out.push(`Skrip di dalam skill: ${files.filter((x) => /\.(sh|bash|mjs|js|ts|py|ps1|rb|go|php)$/i.test(x.r)).map((x) => x.r).join(', ') || 'tidak ada'}`);
out.push(`Host dalam URL: ${hosts.size ? [...hosts.keys()].slice(0, 15).join(', ') + (hosts.size > 15 ? ', ...' : '') : 'tidak ada'}`);
const cap = showAll ? Infinity : 30;
for (const sev of ['HIGH', 'MED', 'LOW']) {
  const list = findings.filter((x) => x.sev === sev);
  if (!list.length) continue;
  out.push('', `## ${sev}`);
  for (const x of list.slice(0, cap)) out.push(`- [${x.id}] ${x.where}: ${x.msg}${x.ex ? `\n    > ${x.ex}` : ''}`);
  if (list.length > cap) out.push(`- ... +${list.length - cap} lagi (gunakan --all)`);
}
out.push('');
if (c('HIGH')) out.push('SARAN: ada temuan HIGH. Jangan pasang sebelum temuan dibaca dan user menyetujui secara eksplisit. Sebagian bisa sah (mis. dokumen yang menjelaskan tanda bahaya), tetapi itu harus diputuskan manusia.');
else if (c('MED')) out.push('SARAN: tidak ada HIGH, tetapi ada MED. Baca temuan dan pastikan setiap perilaku sesuai tujuan skill.');
else out.push('SARAN: tidak ada pola berbahaya yang dikenal. Ini BUKAN jaminan aman: lanjutkan ke tinjauan semantik (skill-inspector) dan baca SKILL.md serta skrip secara langsung.');
console.log(out.join('\n'));
process.exit(strict && c('HIGH') ? 1 : 0);

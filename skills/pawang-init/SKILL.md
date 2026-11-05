---
name: pawang-init
description: Memasang atau memperbarui kit proyek Pawang (AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/, .agents/pawang.json, opsional integrasi OpenCode). Update memakai manifest .agents/pawang.lock.json, menampilkan diff, dan tidak menimpa file yang diubah lokal. Gunakan saat setup, memasang, memperbarui Pawang, atau saat skill Pawang lain gagal karena kit belum ada.
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# pawang-init - pasang atau perbarui kit Pawang

Skill Pawang lain (`/context`, `/feature`, `/implement`, ...) membaca file yang ada di proyek: `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/rules.md`, `.pawang/conventions/`, `.agents/pawang.json`. Skill ini memasang atau memperbarui file-file itu. Pemasangan awal hanya membuat file yang belum ada; update tidak menimpa file yang diubah lokal.

## Langkah

1. Tentukan folder proyek (default: direktori kerja). Jangan jalankan scaffolder framework di folder yang sudah berisi file Pawang; scaffold aplikasi dulu di folder kosong, baru pasang kit.
2. Dry-run dulu, tampilkan rencananya ke user:
   ```
   node <skill-dir>/scripts/init.mjs "<path-proyek>"
   ```
   Tambahkan `--opencode` bila user memakai OpenCode (menambah `.opencode/commands`, `.opencode/plugins`, dan `opencode.json`). Subagent OpenCode tidak termasuk: pasang lewat skill `agents` (`node <skill-dir>/../agents/scripts/install-agents.mjs "<path-proyek>"`), yang mengisi izin dari `package.json` proyek. Tambahkan `--claude` bila user memakai Claude Code (membuat `CLAUDE.md` berisi `@AGENTS.md`).
3. Setelah user setuju, jalankan lagi dengan `--apply`.
4. File yang sudah ada dilaporkan `exists` dan tidak disentuh. Untuk `AGENTS.md` yang sudah ada, gabungkan lewat `/agents-md`; untuk `CONTEXT.md` dan `DESIGN.md` yang sudah ada, gabungkan lewat `/adopt`. Jangan menimpanya sendiri. `.gitignore` hanya ditambah baris yang kurang. `opencode.json` yang sudah ada digabung manual: pertahankan model dan server MCP user, ambil blok `permission`.
5. Skill `interview`, `pawang-skill-creator`, dan `plans-prototype` tidak dibundel; ketiganya dari repo eksternal `pawangai/pawang-skills`. Bila belum ada, beri tahu user dan sarankan (butuh persetujuan karena memakai jaringan): Claude Code `/plugin marketplace add pawangai/pawang-agents` lalu `/plugin install pawang-skills@pawang-agents`; Codex `codex plugin marketplace add pawangai/pawang-skills` lalu `codex plugin add pawang-skills@pawang`; agent lain `npx skills add pawangai/pawang-skills --skill interview --skill pawang-skill-creator --skill plans-prototype`.
6. Laporkan hasilnya, lalu arahkan: `git init` bila belum ada repo; `/context` untuk proyek baru, `/adopt` bila kode sudah ada, `/design` bila ada UI.

## Update

Update dipakai setelah skill atau plugin Pawang diperbarui. `.agents/pawang.lock.json` mencatat versi dan hash file yang dikelola installer. Jalankan dari root proyek dengan flag yang sama seperti pemasangan awal (`--opencode`, `--claude`).

1. Tampilkan laporan dan diff dulu, jangan langsung menulis:
   ```
   node <skill-dir>/scripts/init.mjs "<path-proyek>" --update
   ```
2. Jelaskan status tiap file: `update` aman diganti karena belum diubah lokal, `create` file baru, `modified`/`untracked`/`missing` akan dipertahankan. Tampilkan diff yang diberikan skrip.
3. Setelah user setuju, tulis perubahan aman dan file baru:
   ```
   node <skill-dir>/scripts/init.mjs "<path-proyek>" --update --apply
   ```
4. File yang dipertahankan tidak boleh ditimpa. Gabungkan lewat `/agents-md` untuk `AGENTS.md`, `/adopt` untuk `CONTEXT.md` dan `DESIGN.md`, atau edit manual setelah diff dibaca. Setelah semua selesai, catat kondisi baru sebagai baseline:
   ```
   node <skill-dir>/scripts/init.mjs "<path-proyek>" --update --baseline --apply
   ```
   Baseline hanya menulis `.agents/pawang.lock.json`; tidak mengubah file proyek.
5. Bila `.agents/pawang.lock.json` belum ada (proyek yang dipasang sebelum update tersedia), update hanya membuat file baru dan menampilkan diff file lama sebagai `untracked`. Gabungkan, lalu jalankan baseline. Jangan menyalin seluruh file baru di atas file lama tanpa membaca diff.
6. Setelah update, jalankan `docs-health.mjs` dan periksa `git diff` sebelum user commit.

Pemasangan lewat installer memakai alur yang sama: `node scripts/install.mjs --project <path> --update`, lalu `--apply`. Update skill selalu menimpa salinan skill; file proyek mengikuti aturan manifest di atas.

## Aturan

- Jangan menulis atau menampilkan nilai rahasia; `env.example` hanya referensi nama variabel.
- Jangan commit atas nama user. Minta persetujuan sesuai `AGENTS.md`.
- Isi kit ada di `assets/kit/` (inti) dan `assets/opencode/` (opsional). Jangan edit kit dari dalam proyek pengguna; perubahan kit lewat skrip update atau `/agents-md`.
- Jangan mengedit `.agents/pawang.lock.json` dengan tangan; file itu ditulis oleh skrip. Jangan menimpa file `modified`, `untracked`, atau `missing` tanpa membaca diff dan persetujuan user.

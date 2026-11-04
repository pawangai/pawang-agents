---
name: pawang-init
description: Memasang kit proyek Pawang (AGENTS.md, CONTEXT.md, DESIGN.md, folder .pawang/, .agents/pawang.json, opsional integrasi OpenCode) ke sebuah proyek, tanpa menimpa file yang ada. Gunakan saat user minta setup, pasang, init, atau bootstrap Pawang di proyek, atau saat skill Pawang lain (feature, implement, check, ...) gagal karena AGENTS.md atau .pawang/ belum ada. Install the Pawang workflow kit into a project.
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# pawang-init - pasang kit Pawang ke proyek

Skill Pawang lain (`/context`, `/feature`, `/implement`, ...) membaca file yang ada di proyek: `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/rules.md`, `.pawang/conventions/`, `.agents/pawang.json`. Skill ini memasang file-file itu. Ia hanya membuat file yang belum ada.

## Langkah

1. Tentukan folder proyek (default: direktori kerja). Jangan jalankan scaffolder framework di folder yang sudah berisi file Pawang; scaffold aplikasi dulu di folder kosong, baru pasang kit.
2. Dry-run dulu, tampilkan rencananya ke user:
   ```
   node <skill-dir>/scripts/init.mjs "<path-proyek>"
   ```
   Tambahkan `--opencode` bila user memakai OpenCode (menambah `.opencode/commands`, `.opencode/plugins`, dan `opencode.json`). Subagent OpenCode tidak termasuk: pasang lewat skill `agents` (`node <skill-dir>/../agents/scripts/install-agents.mjs "<path-proyek>"`), yang mengisi izin dari `package.json` proyek. Tambahkan `--claude` bila user memakai Claude Code (membuat `CLAUDE.md` berisi `@AGENTS.md`).
3. Setelah user setuju, jalankan lagi dengan `--apply`.
4. File yang sudah ada dilaporkan `exists` dan tidak disentuh. Untuk `AGENTS.md`, `CONTEXT.md`, `DESIGN.md` yang sudah ada, gabungkan lewat `/adopt` atau `/agents-md`, bukan dengan menimpa. `.gitignore` hanya ditambah baris yang kurang. `opencode.json` yang sudah ada digabung manual: pertahankan model dan server MCP user, ambil blok `permission`.
5. Skill `interview`, `pawang-skill-creator`, dan `plans-prototype` tidak dibundel; ketiganya dari repo eksternal `pawangai/pawang-skills`. Bila belum ada, beri tahu user dan sarankan (butuh persetujuan karena memakai jaringan): Claude Code `/plugin install pawang-skills@pawang-agents`; Codex `codex plugin marketplace add pawangai/pawang-skills` lalu `codex plugin add pawang-skills@pawang`; agent lain `npx skills add pawangai/pawang-skills --skill interview --skill pawang-skill-creator --skill plans-prototype`.
6. Laporkan hasilnya, lalu arahkan: `git init` bila belum ada repo; `/context` untuk proyek baru, `/adopt` bila kode sudah ada, `/design` bila ada UI.

## Aturan

- Jangan menulis atau menampilkan nilai rahasia; `env.example` hanya referensi nama variabel.
- Jangan commit atas nama user. Minta persetujuan sesuai `AGENTS.md`.
- Isi kit ada di `assets/kit/` (inti) dan `assets/opencode/` (opsional). Jangan edit kit dari dalam proyek pengguna.

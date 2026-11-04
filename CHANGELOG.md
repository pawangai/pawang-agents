# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/). Setiap rilis wajib punya bagiannya di sini; workflow rilis memakainya sebagai deskripsi GitHub Release.

## [0.1.29] - 2026-11-04

Rilis pertama pawang-agents: workflow Pawang v0.1.29 dikemas ulang sebagai Agent Skills.

### Ditambahkan

- 31 skill Pawang plus `pawang-init`, yang memasang kit proyek (`AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/`, `.agents/pawang.json`).
- Plugin Claude Code dan Codex di root repo, lengkap dengan marketplace. Di Claude Code skill dipanggil sebagai `/pawang:<nama>`.
- Paket Pi (`pi install git:...`); skill dipanggil dengan `/skill:<nama>`.
- Overlay OpenCode (command, subagent, plugin, `opencode.json`) lewat `pawang-init --opencode`.
- Empat subagent (`explorer`, `implementer`, `reviewer`, `verifier`) untuk Claude Code dan Codex, diterjemahkan dari agent OpenCode.
- Installer (`scripts/install.mjs`), ZIP runtime yang reproducible, validasi, tes, dan workflow CI serta rilis.

### Diubah dibanding Pawang asli

- Teks skill dan kit tidak bergantung lokasi: `<skill-dir>` menggantikan path `.agents/skills/<skill>/`.
- `disable-model-invocation: true` ditulis di frontmatter semua skill kecuali `agents-md` dan `pawang-init`.
- `interview` dan `skill-creator` dikeluarkan dari repo ini. Keduanya kini dari `pawangai/pawang-skills` (`interview`, `pawang-skill-creator`).

### Catatan

- Pemuatan plugin di Claude Code, Codex, dan Pi sungguhan belum diuji.
- Lisensi MIT.

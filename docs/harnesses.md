# Harness

Pawang agents adalah satu set skill dengan satu sumber, `skills/`. Semua harness memakainya apa adanya: tidak ada salinan per harness dan tidak ada penulisan ulang path saat dipasang. Root repo adalah plugin Claude Code dan Codex; berkas turunan kecil (subagent dan manifest) dihasilkan oleh `scripts/build-plugin.mjs`.

## Pasang

| Harness | Cara | Bentuk |
| --- | --- | --- |
| Claude Code | `/plugin marketplace add pawangai/pawang-agents`, lalu `/plugin install pawang@pawang-agents` dan `/plugin install pawang-skills@pawang-agents` | plugin di root repo |
| Codex | `codex plugin marketplace add pawangai/pawang-agents`, lalu `codex plugin add pawang@pawang-agents`; dan `codex plugin marketplace add pawangai/pawang-skills` lalu `codex plugin add pawang-skills@pawang` | plugin di root repo |
| Pi | `pi install git:github.com/pawangai/pawang-agents` (tambah `-l` untuk proyek saja), plus `pi install git:github.com/pawangai/pawang-skills`; panggil dengan `/skill:<nama>` | paket Pi (`pi.skills` di `package.json`) |
| OpenCode, Pi, dan agent lain yang membaca `.agents/skills` | `node scripts/install.mjs --project <proyek> --init` (tambah `--opencode` untuk command, subagent, plugin) | salinan persis `skills/` |
| Claude Code tanpa plugin | `node scripts/install.mjs --project <proyek> --target claude --init` | `.claude/skills`, salinan persis |

Kit proyek (`AGENTS.md`, `CONTEXT.md`, `.pawang/`, ...) dipasang oleh skill `pawang-init`. Memasang hanya `skills/` tanpa kit tidak cukup: skill membaca file itu saat berjalan.

Status verifikasi: build, struktur manifest, dan pemasangan lokal diuji otomatis (`npm test`). Pemuatan plugin di Claude Code dan Codex sungguhan belum diuji. Antigravity, ChatGPT, omp, dan Muse belum didukung.

Pi: manifest paket (`keywords`, `pi.skills`) dan lokasi `.agents/skills/` mengikuti dokumentasi Pi dan dicek oleh tes. Tidak ada prompt template `/<nama>`: skill kita explicit-only (`disable-model-invocation`), yang menurut dokumentasi Pi hanya tersedia lewat `/skill:<nama>`, dan template prompt tidak bisa memanggil skill. Pi juga tidak punya penegakan izin atau subagent bernama yang saya temukan di dokumentasinya, jadi langkah subagent memakai jalur cadangan (sesi baru).

## Manifest

| Berkas | Dihasilkan oleh | Fungsi |
| --- | --- | --- |
| `package.json` | tangan | satu-satunya sumber versi |
| `.claude-plugin/plugin.json` | `build-plugin.mjs` | manifest plugin Claude Code |
| `.claude-plugin/marketplace.json` | `build-plugin.mjs` | katalog Claude Code; memuat `pawang` (source `./`) dan menautkan `pawang-skills` |
| `.codex-plugin/plugin.json` | `build-plugin.mjs` | manifest plugin Codex |
| `.agents/plugins/marketplace.json` | `build-plugin.mjs` | katalog Codex |
| `agents/*.md` | `build-plugin.mjs` | subagent format Claude Code |

Jangan edit berkas turunan dengan tangan. Ubah sumber, lalu jalankan `node scripts/build-plugin.mjs`. `validate.mjs` menggagalkan CI bila hasilnya tidak sinkron, dan `check-version.mjs` menggagalkan bila versi manifest berbeda.

## Path di dalam skill

Skill dipasang di tempat berbeda: folder proyek (`.agents/skills/`, `.claude/skills/`) atau cache plugin. Karena itu teks skill tidak pernah menulis lokasi skill lain secara langsung. Aturannya:

- `<skill-dir>` adalah folder yang berisi `SKILL.md`. Skrip sendiri: `<skill-dir>/scripts/x.mjs`. Skill lain: `<skill-dir>/../<nama>/...`.
- Setiap `SKILL.md` yang memakai `<skill-dir>` memuat satu catatan "Paths" yang menjelaskannya, termasuk anjuran memakai path relatif proyek bila skill terpasang di proyek (supaya cocok dengan pola izin shell).
- `interview` dan `pawang-skill-creator` (eksternal) dirujuk lewat nama.
- Kit proyek merujuk skill lewat nama, bukan path.

`validate.mjs` dan `tests/skills.test.mjs` menjaga aturan ini: rujukan `.agents/skills/<skill>/...` di teks skill menggagalkan CI, begitu pula `<skill-dir>` tanpa catatan.

Satu pengecualian: gambar acuan desain disimpan di folder `assets/` milik skill `reference`. Di mode plugin folder itu ada di cache plugin dan tidak bertahan saat pembaruan.

## Subagent

Skill menyebut subagent lewat nama: `explorer`, `implementer`, `reviewer`, `verifier`. Persona-nya hidup sebagai agent OpenCode di `skills/pawang-init/assets/opencode/.opencode/agents/`, dan build menerjemahkannya ke `agents/`:

| Harness | Pemetaan |
| --- | --- |
| OpenCode | agent langsung (`task`), izin di frontmatter ditegakkan oleh OpenCode |
| Claude Code | `agents/<nama>.md` (di sesi: `pawang:<nama>`); `tools` turunan dari izin `edit`; pembatasan shell menjadi aturan kerja di badan agen, bukan penegakan harness |
| Codex | `agents/<nama>.md` sebagai persona; agent umum diminta membacanya dulu |
| Pi | tidak ada subagent bernama yang terdokumentasi; jalur cadangan (sesi baru) |

Agent utama `build` (hanya OpenCode) tidak dikirim. Di harness lain, sesi utama berperan sebagai orkestrator dan aturan commit ada di `AGENTS.md`. Kalau harness tidak bisa memulai subagent, `audit` meminta user membuka sesi baru (mode `fresh session`), karena review di konteks yang sama bukan review dengan konteks bersih.

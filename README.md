# pawang-agents

Workflow [Pawang](#asal-usul) dalam format [Agent Skills](https://agentskills.io): 31 skill Pawang ditambah `pawang-init`, satu folder per skill di `skills/<nama>/SKILL.md`. Bisa dipakai di agent universal (`.agents/skills`), OpenCode, Pi (paket Pi), Claude Code (marketplace), dan Codex (marketplace). Detail per harness: [docs/harnesses.md](docs/harnesses.md).

Pawang adalah lapisan alur kerja untuk agent coding (rencana, bangun, verifikasi, review, commit, batalkan), bukan kerangka aplikasi.

## Satu sumber, tanpa penulisan ulang

`skills/` dipakai apa adanya oleh semua harness: tidak ada salinan per harness dan tidak ada penulisan ulang path saat dipasang. Di dalam skill, berkas dirujuk lewat `<skill-dir>` (folder yang berisi `SKILL.md`; skill lain di `<skill-dir>/../<nama>/`), dan setiap skill yang memakainya punya catatan satu paragraf di atas yang menjelaskannya. Root repo ini sendiri adalah plugin Claude Code dan Codex.

## Dependensi eksternal

Dua skill tidak dibundel di repo ini. Keduanya diambil dari [`pawangai/pawang-skills`](https://github.com/pawangai/pawang-skills):

| Skill | Dipakai oleh |
| --- | --- |
| `interview` | `AGENTS.md` dan hampir semua skill, setiap kali agent perlu bertanya ke user |
| `pawang-skill-creator` | `advise`, `agents-md`; membuat dan mengaudit skill baru |

```sh
npx skills add pawangai/pawang-skills --skill interview --skill pawang-skill-creator
```

Di Claude Code dan Codex ini sudah tercakup oleh marketplace di bawah (plugin `pawang-skills`). Untuk pemasangan manual, pasang di folder skill yang sama dengan skill Pawang lain. `install.mjs` mencetak perintah ini di akhir, dan `pawang-init` mengingatkannya.

## Penting: skill butuh kit di proyek

Skill adalah prosedur. Mereka membaca file yang hidup di proyek Anda: `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/rules.md`, `.pawang/conventions/`, `.agents/pawang.json`. Kumpulan file itu disebut kit dan dipasang oleh `pawang-init` (atau `--init` pada installer). Tanpa kit, `/feature`, `/implement`, dan kawan-kawannya tidak punya aturan untuk dibaca.

## Pasang lewat marketplace

**Claude Code**

```text
/plugin marketplace add pawangai/pawang-agents
/plugin install pawang@pawang-agents
/plugin install pawang-skills@pawang-agents
```

Skill dipanggil dengan namespace plugin: `/pawang:feature`, `/pawang:implement`, dan seterusnya. Plugin juga mengirim empat subagent (`explorer`, `implementer`, `reviewer`, `verifier`) sebagai `pawang:<nama>`. Daftar izin shell mereka di OpenCode menjadi aturan kerja di Claude Code, bukan penegakan oleh harness ([detail](docs/harnesses.md#subagent)). Lalu, di proyek Anda, jalankan `/pawang:pawang-init`. Pembaruan: `/plugin marketplace update pawang-agents`.

**Codex**

```text
codex plugin marketplace add pawangai/pawang-agents
codex plugin add pawang@pawang-agents
codex plugin marketplace add pawangai/pawang-skills
codex plugin add pawang-skills@pawang
```

Pemuatan plugin di Codex sungguhan belum diuji.

**Pi**

```text
pi install git:github.com/pawangai/pawang-agents        # semua proyek (pengaturan pengguna)
pi install git:github.com/pawangai/pawang-agents -l     # hanya proyek ini
pi install git:github.com/pawangai/pawang-skills       # interview, pawang-skill-creator
```

Repo ini adalah paket Pi: `package.json` memuat `keywords: ["pi-package"]` dan `pi.skills`. Jalankan `/reload` sesudah memasang, lalu panggil skill dengan `/skill:feature`, `/skill:implement`, dan seterusnya; mulai di proyek dengan `/skill:pawang-init`. Untuk mencoba tanpa memasang: `pi -e .` di folder repo. Kalau `/skill:` tidak muncul di autocomplete, periksa pengaturan `enableSkillCommands`.

Catatan Pi:

- Tidak ada perintah pendek `/feature`. Skill kita bertanda `disable-model-invocation: true`, dan menurut dokumentasi Pi skill seperti itu hanya tersedia lewat perintah `/skill:<nama>`. Prompt template Pi hanya memperluas teks, dan saya tidak menemukan cara di dokumentasinya untuk memanggil skill dari template, jadi template `/feature` tidak dibuat.
- `pawang-skills` ikut membawa skill lain miliknya. Untuk memasang hanya `interview` dan `pawang-skill-creator`, sempitkan lewat objek `packages` di pengaturan Pi (lihat dokumentasi Pi Packages).
- Pi tidak punya penegakan izin seperti `opencode.json`, dan dokumentasi yang saya baca tidak menyebut subagent bernama. Langkah subagent jatuh ke jalur cadangan: Anda diminta menjalankannya di sesi baru.
- Skill proyek baru dimuat setelah proyek dipercaya (project trust). Dengan nama kembar, Pi menyimpan skill yang ditemukan pertama; jangan pasang paket yang sama di dua lokasi.

Batasan di mode plugin: folder `assets/` milik skill `reference` (tempat gambar acuan desain) berada di cache plugin, jadi gambar yang Anda taruh di sana hilang saat plugin diperbarui. Untuk alur yang banyak memakai gambar acuan, pasang skill lewat installer ke dalam proyek.

## Pasang manual (installer)

Butuh Node 18+ (tanpa dependensi lain).

```sh
git clone https://github.com/pawangai/pawang-agents.git pawang-agents
cd pawang-agents

# Universal (OpenCode, Pi, Codex, Gemini CLI, dll): .agents/skills di proyek
node scripts/install.mjs --project /path/ke/proyek --init

# Claude Code tanpa plugin: .claude/skills di proyek, plus CLAUDE.md berisi @AGENTS.md
node scripts/install.mjs --project /path/ke/proyek --target claude --init

# OpenCode lengkap: tambah command, subagent, plugin, dan opencode.json
node scripts/install.mjs --project /path/ke/proyek --init --opencode

# Global (semua proyek), tanpa kit proyek
node scripts/install.mjs --global --target both
```

Lalu pasang dua dependensi eksternal di atas. Opsi: `--skills a,b,c` (sebagian saja), `--force` (timpa skill yang sudah ada), `--dry-run`. Installer menyalin skill apa adanya dan tidak menimpa skill yang sudah ada kecuali `--force`; kit proyek tidak pernah menimpa file yang ada.

Pemasangan lewat CLI generik (`npx skills add pawangai/pawang-agents`) juga bisa, karena struktur `skills/<nama>/SKILL.md` standar; jalankan `pawang-init` sesudahnya untuk memasang kit.

### Per agent

| Agent | Lokasi skill | Cara memanggil | Catatan |
| --- | --- | --- | --- |
| Universal (`.agents/skills`) | `.agents/skills/` | sesuai agent (mis. `/feature`) | |
| OpenCode | `.agents/skills/` + `.opencode/` | `/feature`, `/implement`, ... | Tambah `--opencode` untuk command, subagent, plugin, `opencode.json`. Ganti `model` di `opencode.json` (bawaan: `deepseek/deepseek-flash`) |
| Pi | `.agents/skills/` atau paket Pi | `/skill:feature`, ... | Pi membaca `.agents/skills/` secara native; `pi install git:...` juga bisa (lihat atas) |
| Claude Code (installer) | `.claude/skills/` | `/feature`, ... | Opsi `--claude` pada init membuat `CLAUDE.md` berisi `@AGENTS.md` |
| Claude Code, Codex (marketplace) | cache plugin | `/pawang:feature`, ... | Lihat atas |

Semua skill kecuali `agents-md` dan `pawang-init` berisi `disable-model-invocation: true` di frontmatter, jadi hanya jalan lewat perintah (sejalan dengan `opencode.json`).

### Aplikasi chat (claude.ai)

Tidak ada paket zip per skill. Aplikasi chat tidak punya marketplace berbasis URL, dan Pawang dirancang untuk agent yang bekerja di dalam repo git (membaca `AGENTS.md`, membuat branch, commit, menjalankan test), jadi alur utamanya tidak berguna di sana. Kalau tetap perlu satu skill di aplikasi chat, zip folder `skills/<nama>/` secara manual dan unggah di Settings, Capabilities, Skills.

## Daftar skill

Semua skill dipanggil dengan nama yang sama sebagai perintah (`/feature`).

| Kelompok | Skill |
| --- | --- |
| Siapkan | `pawang-init` (baru, bukan bagian Pawang asli), `adopt`, `assess`, `plan`, `context`, `design`, `tests`, `ci`, `ci-deploy` |
| Bangun | `feature`, `implement`, `check`, `complete`, `buildall` |
| Pahami dan review | `status`, `debug`, `audit`, `sync` |
| Pulihkan dan rilis | `fix`, `rollback`, `incident`, `deps`, `auth`, `data`, `release` |
| Tambahan | `handoff`, `runbook`, `layout`, `agents-md`, `advise`, `reference`, `agents` |
| Eksternal | `interview`, `pawang-skill-creator` (dari `pawangai/pawang-skills`) |

Alur utama: `/context` -> `/design` -> `/feature` -> `/implement` -> `/check` -> `/audit` -> `/complete`. Proyek yang sudah berjalan mulai dari `/adopt`; ide mentah dari `/assess`. Dokumen lengkap alur dan konfigurasi ada di kit: `.pawang/workflow.md`, `.pawang/rules.md`, `.agents/README.md`.

## Isi repo

```text
skills/<nama>/SKILL.md      sumber kanonik (31 skill Pawang, plus pawang-init); dipakai apa adanya
skills/pawang-init/
  scripts/init.mjs          pasang kit ke proyek (dry-run default)
  assets/kit/               AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/, .agents/pawang.json
  assets/opencode/          .opencode/{commands,agents,plugins}, opencode.json
agents/                     subagent format Claude Code (HASIL BUILD dari agent OpenCode)
.claude-plugin/             plugin.json dan marketplace.json Claude Code (HASIL BUILD)
.codex-plugin/              plugin.json Codex (HASIL BUILD)
.agents/plugins/            marketplace.json Codex (HASIL BUILD)
scripts/install.mjs         pasang skill ke .agents/skills atau .claude/skills
scripts/build-plugin.mjs    bangun agents/ dan semua manifest dari sumber
scripts/pack.mjs            ZIP runtime reproducible + SHA256SUMS.txt untuk rilis
scripts/validate.mjs        cek frontmatter, kebebasan lokasi, command OpenCode, berkas turunan, lisensi
scripts/check-version.mjs   cocokkan tag rilis dengan versi di semua manifest
tests/                      tes unit (node --test)
docs/harnesses.md           pemetaan harness, manifest, path, subagent
.github/workflows/          tests.yml (tiap push), release.yml (tag v*)
```

Validasi dan tes: `node scripts/validate.mjs` dan `npm test` (Node 22+), keduanya dijalankan GitHub Actions. Panduan kontributor: [CONTRIBUTING.md](CONTRIBUTING.md).

## Rilis

Rilis dibuat oleh `.github/workflows/release.yml` saat tag `vMAJOR.MINOR.PATCH` didorong.

```sh
# 1. Ubah "version" di package.json (satu-satunya sumber versi), lalu bangun ulang manifest:
node scripts/build-plugin.mjs
# 2. Commit, beri tag, dorong:
git add -A && git commit -m "chore: release 0.1.30"
git tag v0.1.30
git push origin main v0.1.30
```

Workflow memastikan format tag valid dan sama dengan versi di `package.json` serta semua manifest, menjalankan `validate.mjs` dan `npm test`, lalu membuat **draft** GitHub Release berisi:

- `pawang-agents-claude-<versi>.zip`: manifest Claude Code, `agents/`, `skills/`, `LICENSE`
- `pawang-agents-codex-<versi>.zip`: manifest Codex, `agents/`, `skills/`, `LICENSE`
- `SHA256SUMS.txt`

ZIP hanya berisi runtime (tanpa `scripts/`, `tests/`, `docs/`) dan dibangun reproducible (urutan berkas dan waktu tetap; ada tesnya). Periksa draft, lalu publikasikan. Tag dengan tanda hubung (mis. `v0.2.0-rc.1`) menjadi pre-release. Pengguna marketplace menerima versi baru lewat `/plugin marketplace update pawang-agents` (Claude Code) atau `codex plugin marketplace upgrade pawang-agents` (Codex).

## Asal-usul

Diturunkan dari arsip `pawang-v0_1_30.zip`. Folder di dalam arsip itu berlabel `pawang-v0.1.29` dan `README.md`-nya menyebut v0.1.29, jadi versi paket ini mengikuti 0.1.29. Perbedaan dari sumber: `pawang-init` (baru); `interview` dan `skill-creator` dikeluarkan (kini dari `pawangai/pawang-skills`, dengan nama `pawang-skill-creator`); rujukan `.agents/skills/<skill>/` di teks skill dan kit diganti `<skill-dir>` atau nama skill agar tidak bergantung lokasi; `disable-model-invocation: true` ditulis di frontmatter sumber.

Kustomisasi sebelum dipakai: `opencode.json` (model dan server MCP; kunci lewat variabel lingkungan, lihat `env.example`), dan bagian `## Commands` di `AGENTS.md` yang bawaannya untuk Hono + Cloudflare Workers + Bun.

## Lisensi

[MIT](LICENSE).

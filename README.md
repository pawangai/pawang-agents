# pawang-agents

Workflow [Pawang](#asal-usul) dalam format [Agent Skills](https://agentskills.io): 31 skill Pawang ditambah `pawang-init`, satu folder per skill di `skills/<nama>/SKILL.md`. Bisa dipakai di agent universal (`.agents/skills`), OpenCode, Pi (paket Pi), Claude Code (marketplace), dan Codex (marketplace). Detail per harness: [docs/harnesses.md](docs/harnesses.md).

Pawang adalah lapisan alur kerja untuk agent coding (rencana, bangun, verifikasi, review, commit, batalkan), bukan kerangka aplikasi.

## Satu sumber, tanpa penulisan ulang

`skills/` dipakai apa adanya oleh semua harness: tidak ada salinan per harness dan tidak ada penulisan ulang path saat dipasang. Di dalam skill, berkas dirujuk lewat `<skill-dir>` (folder yang berisi `SKILL.md`; skill lain di `<skill-dir>/../<nama>/`), dan setiap skill yang memakainya punya catatan satu paragraf di atas yang menjelaskannya. Root repo ini sendiri adalah plugin Claude Code dan Codex.

## Dependensi eksternal

Tiga skill tidak dibundel di repo ini. Ketiganya diambil dari [`pawangai/pawang-skills`](https://github.com/pawangai/pawang-skills):

| Skill | Dipakai oleh |
| --- | --- |
| `interview` | `AGENTS.md` dan hampir semua skill, setiap kali agent perlu bertanya ke user |
| `pawang-skill-creator` | `advise`, `agents-md`; membuat dan mengaudit skill baru |
| `plans-prototype` | `plan` (Path C), `adopt`; mengubah paket capture menjadi `01-PRD.md` sampai `04-edge-cases.md` yang dibaca `plan` |

```sh
npx skills add pawangai/pawang-skills --skill interview --skill pawang-skill-creator --skill plans-prototype
```

**Paket capture** (`pawang-capture-*`) adalah ZIP opsional dari ekstensi Pawang Capture, atau sumber lain yang formatnya sama. Isinya `capture-report.md`, `design-tokens.md`, `design-tokens.json`, `kandidat-dokumen.md`, `pages.json`, dan `screens/*.png`. Paket itu bukti "apa yang ada sekarang" pada produk live, dipakai `/plan` dan `/design` sebagai bahan, bukan rencana. Repo ini tidak memproduksinya: format dan cara memakainya didefinisikan di skill `plans-prototype`.

Di Claude Code dan Codex ini sudah tercakup oleh marketplace di bawah (plugin `pawang-skills`). Untuk pemasangan manual, pasang di folder skill yang sama dengan skill Pawang lain. `install.mjs` mencetak perintah ini di akhir, dan `pawang-init` mengingatkannya.

## Penting: skill butuh kit di proyek

Skill adalah prosedur. Mereka membaca file yang hidup di proyek Anda: `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/rules.md`, `.pawang/conventions/`, `.agents/pawang.json`. Kumpulan file itu disebut kit dan dipasang oleh `pawang-init` (atau `--init` pada installer). Tanpa kit, `/feature`, `/implement`, dan skill lain yang membaca aturan proyek tidak punya apa pun untuk dibaca.

## Pasang lewat marketplace

Status verifikasi tiap jalur ada di [docs/harnesses.md](docs/harnesses.md#status-verifikasi); tabel itu satu-satunya tempatnya. Ringkasnya: yang diuji otomatis adalah build, struktur manifest, dan pemasangan lokal — bukan pemuatan oleh harness. Semua jalur di bawah ini bisa dicoba, tetapi belum ada yang dibuktikan memuat.

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

Lihat tabel status sebelum memakai jalur ini.


**Pi**

```text
pi install git:github.com/pawangai/pawang-agents        # semua proyek (pengaturan pengguna)
pi install git:github.com/pawangai/pawang-agents -l     # hanya proyek ini
pi install git:github.com/pawangai/pawang-skills       # interview, pawang-skill-creator
```

Repo ini adalah paket Pi: `package.json` memuat `keywords: ["pi-package"]` dan `pi.skills`. Jalankan `/reload` sesudah memasang, lalu panggil skill dengan `/skill:feature`, `/skill:implement`, dan seterusnya; mulai di proyek dengan `/skill:pawang-init`. Untuk mencoba tanpa memasang: `pi -e .` di folder repo. Kalau `/skill:` tidak muncul di autocomplete, periksa pengaturan `enableSkillCommands`.

Catatan Pi:

- Tidak ada perintah pendek `/feature`. Skill kita bertanda `disable-model-invocation: true`, dan menurut dokumentasi Pi skill seperti itu hanya tersedia lewat perintah `/skill:<nama>`. Prompt template Pi hanya memperluas teks dan tidak bisa memanggil skill, jadi template `/feature` tidak dibuat.
- `pawang-skills` ikut membawa skill lain miliknya. Untuk memasang hanya `interview`, `pawang-skill-creator`, dan `plans-prototype`, sempitkan lewat objek `packages` di pengaturan Pi (lihat dokumentasi Pi Packages).
- Pi tidak punya penegakan izin seperti `opencode.json`, dan dokumentasinya tidak menyebut subagent bernama. Langkah subagent jatuh ke jalur cadangan: Anda diminta menjalankannya di sesi baru.
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

Lalu pasang dua dependensi eksternal di atas. Opsi: `--skills a,b,c` (sebagian saja), `--force` (timpa skill yang sudah ada), `--dry-run`. Installer menyalin skill apa adanya dan tidak menimpa skill yang sudah ada kecuali `--force`; pemasangan awal kit proyek juga tidak menimpa file yang ada. Untuk update, lihat bagian [Update](#update).

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

## Update

Perbarui skill lebih dulu, lalu kit proyek. Kit memakai manifest `.agents/pawang.lock.json`: file yang belum diubah lokal boleh diganti, file yang diubah lokal tidak pernah ditimpa.

**Marketplace**

- Claude Code: `/plugin marketplace update pawang-agents`, lalu jalankan `/pawang:pawang-init update` di proyek.
- Codex: `codex plugin marketplace upgrade pawang-agents`, lalu jalankan `pawang-init update` lewat agent.
- Pi: pasang ulang `pi install git:github.com/pawangai/pawang-agents`, lalu `/reload`; jalankan `/skill:pawang-init update` di proyek.

**Installer**

```sh
cd pawang-agents && git pull

# 1. laporan + diff, tidak menulis
node scripts/install.mjs --project /path/ke/proyek --update

# 2. tulis skill dan perubahan kit yang aman
node scripts/install.mjs --project /path/ke/proyek --update --apply
```

Pakai flag yang sama seperti pemasangan awal (`--target claude`, `--opencode`, atau `--claude`) agar skill dan subagent di lokasi itu ikut diperbarui. Update menimpa salinan skill karena skill adalah berkas terkelola; jangan menyimpan perubahan lokal di folder skill. File proyek yang `modified`, `untracked`, atau `missing` dipertahankan dan ditampilkan diff-nya. Gabungkan lewat `/agents-md` atau `/adopt`, lalu catat baseline:

```sh
node scripts/install.mjs --project /path/ke/proyek --update --baseline --apply
```

`--baseline` hanya menulis manifest; tidak mengubah berkas proyek. Proyek yang dipasang sebelum manifest ada akan melihat file lamanya sebagai `untracked` pada update pertama: baca diff, gabungkan, baru baseline. Jangan menyalin seluruh file baru di atas file lama tanpa membaca diff. Commit `.agents/pawang.lock.json` bersama hasil update agar tim memakai baseline yang sama.

## Daftar skill

Bentuk pemanggilan berbeda per harness: `/pawang:<nama>` di Claude Code lewat plugin, `/skill:<nama>` di Pi, `/<nama>` pada pemasangan lewat installer dan OpenCode. Tabel lengkapnya di [docs/harnesses.md](docs/harnesses.md#pasang).

| Kelompok | Skill |
| --- | --- |
| Siapkan | `pawang-init` (baru, bukan bagian Pawang asli), `adopt`, `assess`, `plan`, `context`, `design`, `tests`, `ci`, `ci-deploy` |
| Bangun | `feature`, `implement`, `check`, `complete`, `buildall` |
| Pahami dan review | `status`, `debug`, `audit`, `sync` |
| Pulihkan dan rilis | `fix`, `rollback`, `incident`, `deps`, `auth`, `data`, `release` |
| Tambahan | `handoff`, `runbook`, `layout`, `agents-md`, `advise`, `reference`, `agents` |
| Eksternal | `interview`, `pawang-skill-creator`, `plans-prototype` (dari `pawangai/pawang-skills`) |

Alur utama: `/context` -> `/design` -> `/feature` -> `/implement` -> `/check` -> `/audit` -> `/complete`. Proyek yang sudah berjalan mulai dari `/adopt`; ide mentah dari `/assess`. Dokumen lengkap alur dan konfigurasi ada di kit: `.pawang/workflow.md`, `.pawang/rules.md`, `.agents/README.md`.

## Isi repo

```text
skills/<nama>/SKILL.md      sumber kanonik (31 skill Pawang, plus pawang-init); dipakai apa adanya
skills/agents/
  assets/agents/*.md        templat persona (explorer, implementer, reviewer, verifier, build)
  scripts/render.mjs        rakit templat jadi berkas agent; satu sumber izin subagent
  scripts/install-agents.mjs  pasang subagent ke .opencode/agents proyek (dry-run default)
skills/pawang-init/
  scripts/init.mjs          pasang atau perbarui kit (dry-run default; update dengan --update)
  assets/kit/               AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/, .agents/pawang.json
  assets/VERSION            versi yang dibaca pawang-init (HASIL BUILD dari package.json)
  assets/opencode/          .opencode/{commands,plugins}, opencode.json (subagent dirakit dari skill agents)
agents/                     subagent format Claude Code (HASIL BUILD dari skills/agents/assets/agents)
.claude-plugin/             plugin.json dan marketplace.json Claude Code (HASIL BUILD)
.codex-plugin/              plugin.json Codex (HASIL BUILD)
.agents/plugins/            marketplace.json Codex (HASIL BUILD)
scripts/install.mjs         pasang atau perbarui skill dan kit (.agents/skills atau .claude/skills)
scripts/build-plugin.mjs    bangun agents/ dan semua manifest dari sumber
scripts/pack.mjs            ZIP runtime reproducible + SHA256SUMS.txt untuk rilis
scripts/validate.mjs        cek frontmatter, kebebasan lokasi, command OpenCode, berkas turunan, lisensi
scripts/check-version.mjs   cocokkan tag rilis dengan versi di semua manifest
scripts/release-notes.mjs   ambil bagian CHANGELOG untuk deskripsi GitHub Release
scripts/lib.mjs             fungsi bersama skrip repo (walk, frontmatter, versi, daftar eksternal)
tests/                      tes unit (node --test)
docs/harnesses.md           pemetaan harness, manifest, path, subagent, status verifikasi
.github/workflows/          tests.yml (tiap push), release.yml (tag v*)
```

Validasi dan tes: `node scripts/validate.mjs` dan `npm test` (Node 22+), keduanya dijalankan GitHub Actions. Panduan kontributor: [CONTRIBUTING.md](CONTRIBUTING.md).

## Rilis

Rilis dibuat oleh `.github/workflows/release.yml` saat tag `vMAJOR.MINOR.PATCH` didorong.

```sh
# 1. Ubah "version" di package.json (satu-satunya sumber versi), tulis bagian "## [versi] - tanggal" di CHANGELOG.md, lalu bangun ulang manifest:
node scripts/build-plugin.mjs
# 2. Commit, beri tag, dorong:
git add -A && git commit -m "chore: release 0.1.31"
git tag v0.1.31
git push origin main v0.1.30
```

Workflow memastikan format tag valid dan sama dengan versi di `package.json` serta semua manifest, menjalankan `validate.mjs` (yang juga mewajibkan bagian CHANGELOG untuk versi itu) dan `npm test`, lalu langsung menerbitkan GitHub Release dengan deskripsi dari `CHANGELOG.md` (plus petunjuk pasang) dan aset:

- `pawang-agents-claude-<versi>.zip`: manifest Claude Code, `agents/`, `skills/`, `LICENSE`
- `pawang-agents-codex-<versi>.zip`: manifest Codex, `agents/`, `skills/`, `LICENSE`
- `SHA256SUMS.txt`

ZIP hanya berisi runtime (tanpa `scripts/`, `tests/`, `docs/`) dan dibangun reproducible (urutan berkas dan waktu tetap; ada tesnya). Tag dengan tanda hubung (mis. `v0.2.0-rc.1`) menjadi pre-release. Pengguna marketplace menerima versi baru lewat `/plugin marketplace update pawang-agents` (Claude Code) atau `codex plugin marketplace upgrade pawang-agents` (Codex). Pengguna installer menjalankan `node scripts/install.mjs --project <proyek> --update` dari checkout terbaru, lalu `--apply`; kit memakai `.agents/pawang.lock.json` dan tidak menimpa file yang diubah lokal.

## Asal-usul

Titik awal repo ini adalah arsip `pawang-v0_1_30.zip`. Folder di dalam arsip itu berlabel `pawang-v0.1.29` dan `README.md`-nya menyebut v0.1.29; label arsip dan label isi tidak sama, dan `package.json` mengikuti label isi, `0.1.29`. Perbedaan dari arsip itu: `pawang-init` (baru); `interview` dan `skill-creator` dikeluarkan (kini dari `pawangai/pawang-skills`, dengan nama `pawang-skill-creator`); `plans-prototype` ditambahkan sebagai skill eksternal; rujukan `.agents/skills/<skill>/` di teks skill dan kit diganti `<skill-dir>` atau nama skill agar tidak bergantung lokasi; `disable-model-invocation: true` ditulis di frontmatter sumber.

**Sejak 0.1.29, repo ini adalah hulu.** Arsip itu titik awal, bukan sumber yang dilacak: tidak ada repo upstream yang di-diff, tidak ada sinkronisasi otomatis, dan perubahan isi skill dilakukan di sini lalu dirilis lewat tag. `pawangai/pawang-skills` terpisah dan hanya memasok tiga skill eksternal yang disebut di atas.

Kustomisasi sebelum dipakai: `opencode.json` (model dan server MCP; kunci lewat variabel lingkungan, lihat `env.example`), dan bagian `## Commands` di `AGENTS.md` yang bawaannya untuk Hono + Cloudflare Workers + Bun.

## Lisensi

[MIT](LICENSE).

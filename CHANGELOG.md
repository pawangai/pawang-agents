# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/). Setiap rilis wajib punya bagiannya di sini; workflow rilis memakainya sebagai deskripsi GitHub Release.

## [0.1.30] - 2026-11-04

Perbaikan dari dua putaran review: `egm-review` Stage 5-8 atas seluruh repo, lalu review isi 32 prosedur terhadap kit. Laporan keduanya ada di `repo-review.md` dan `procedure-review.md`.

### Diperbaiki

- `pawang-init` kini punya command OpenCode dan diizinkan di `opencode.json`; sebelumnya skill pemasang kit tidak bisa dipanggil di OpenCode sama sekali. `validate.mjs` tidak lagi mengecualikannya dari kewajiban punya command.
- Pola skrip di `agents/verifier.md` sekarang menunjuk skill sebenarnya (`layout`, `reference`, `advise`) dengan `<skills-root>` terdefinisi, bukan placeholder `<skill-dir>/../<skill>` yang tidak bisa diresolusi. Build gagal bila ada pola yang tidak bisa diterjemahkan.
- `plans-prototype` (dari `pawangai/pawang-skills`) masuk daftar skill eksternal, lengkap dengan command OpenCode dan dokumentasi, setelah dirujuk di `plan` dan `adopt` tanpa pernah didefinisikan.
- Paket capture `pawang-capture-*` didefinisikan di `README.md`.
- `install.mjs --global --init` ditolak sebelum menulis apa pun.
- `--target`, `--project`, `--skills`, dan `--out` yang diberikan tanpa nilai ditolak, bukan diam-diam memakai default.
- `validate.mjs` ikut menjalankan `check-version.mjs`, dan memeriksa placeholder di `agents/`.
- `validate.mjs` membaca frontmatter lewat `parseFrontmatter` di `scripts/lib.mjs`, bukan regex: blok lipat `>-`/`|` diterima, dan YAML tidak valid (mis. `:` tanpa kutip, indentasi tab) ditolak dengan pesan yang jelas.
- `skills/audit/SKILL.md` tidak lagi memakai `<default-branch>` literal dan mengeluarkan seluruh state sesi dari hash (`specs`, `handoff`, `runbooks`, `assessments`), sementara `decisions` dan `conventions` tetap masuk.
- `skills/deps/SKILL.md` tidak lagi punya dua `## Step 5`; `skills/ci/SKILL.md:123` memakai `###` untuk Step 3b.
- `.agents/README.md` tidak lagi menyatakan folder itu memuat `skills/`.

### Ditambahkan

- `engines.node: ">=18"` di `package.json`.
- `.agents/plugins` masuk `files` npm.
- Tes: path skrip di `agents/*.md` harus menunjuk berkas yang ada; guard `--global --init`; flag tanpa nilai; `walk` alat build harus sama dengan `walk` milik skill; frontmatter 32 skill harus bisa diparse.

### Diubah

- Persona subagent kini punya satu sumber: templat `skills/agents/assets/agents/*.md`, dirakit `skills/agents/scripts/render.mjs`. Salinan persona di overlay OpenCode (`skills/pawang-init/assets/opencode/.opencode/agents/`) dihapus, jadi tidak ada dua daftar izin yang bisa melenceng.
- Manajer paket tidak lagi di-hardcode `bun`. `/agents` dan `install.mjs --opencode` sama-sama membaca lockfile proyek dan mengisi izin dari `package.json`; `/agents` dan installer menghasilkan berkas yang sama untuk proyek yang sama.
- `pawang-init --opencode` berhenti memasang subagent; itu tugas skill `agents`. Installer `install.mjs --opencode` menjalankan keduanya.
- Terjemahan ke Claude Code dan Codex tidak lagi mengarang `bun run test*`. Izin yang bergantung manajer paket diganti aturan prosa, dan larangan berkas rahasia yang sebelumnya dibuang diam-diam kini ditulis sebagai kalimat.
- Agent utama OpenCode `build` ikut menjadi templat (`skills/agents/assets/agents/build.md`), jadi izin bash-nya juga mengikuti manajer paket proyek. Ia tetap hanya dipasang oleh `install.mjs --opencode`, tidak oleh `/agents`.

### Dokumentasi

- Status verifikasi kini satu tabel di `docs/harnesses.md#status-verifikasi`: per harness, apa yang diuji otomatis dan apa yang belum. `README.md` dan `CHANGELOG.md` merujuk ke tabel itu, tidak mengulang klaimnya.
- Matriks pemasangan tidak lagi ditulis dua kali: `docs/harnesses.md` memetakan mekanisme, `README.md` memuat perintah yang bisa disalin.
- Klaim "semua skill dipanggil dengan nama yang sama (`/feature`)" diganti bentuk per harness (`/pawang:<nama>`, `/skill:<nama>`, `/<nama>`), karena Pi dan Claude Code memakai bentuk lain.
- Narasi orang pertama di README ("saya tidak menemukan") diganti pernyataan netral yang bisa diperiksa.
- `validate.mjs` ikut memeriksa sintaks berkas `.js` di dalam skill (`permissions.js`, `runlog.js`), tidak hanya `.mjs`.
- Manifest Claude Code tidak punya medan `skills`/`agents` dan itu memang benar: keduanya lokasi bawaan plugin Claude Code, sedangkan medan itu hanya untuk komponen di luar lokasi bawaan. Alasan dan tesnya ada di `docs/harnesses.md#manifest`.
- `CONTRIBUTING.md` menyatakan kebijakan bahasa: satu bahasa per berkas, satu kalimat Inggris utuh di akhir `description` diperbolehkan, dan aturan ini tidak ditegakkan mesin.
- Peta "Isi repo" di `README.md` dilengkapi: `skills/agents/`, `scripts/lib.mjs`, `scripts/release-notes.mjs`.
- Asal-usul diperjelas: sejak 0.1.29 repo ini adalah hulu. Arsip `pawang-v0_1_30.zip` adalah titik awal, bukan sumber yang dilacak; tidak ada upstream yang di-diff dan tidak ada sinkronisasi otomatis.

### Isi prosedur (review 32 skill)

Review isi menjalankan satu reviewer berkonteks baru per skill terhadap `kit/AGENTS.md` dan `.pawang/rules.md`, menghasilkan 98 temuan. Laporan: `procedure-review.md`.

- Lima skill melanggar aturan kepemilikan berkas kit sendiri (`advise`, `agents`, `handoff`, `reference`, `ci`). Empat di antaranya kini menyerahkan ke `/agents-md` atau `/handoff`; kit menambahkan kepemilikan baris `Verify` untuk `ci` dan folder `.pawang/specs/documents/` untuk `reference`.
- Nilai gate disamakan dengan skema: `verification.logicTests`/`uiEvidence` memakai `always`/`when-configured`, bukan `required` yang tidak dikenal kode mana pun. `complete` dan `implement` memakai nilai yang benar.
- `/status` melaporkan default audit `when-sensitive` (sebelumnya `manual`), menyertakan `independentReview`, dan memakai default branch yang dideteksi.
- `status/scripts/permissions.mjs` tidak lagi berhenti saat `.agents/pawang.json` hilang atau JSON-nya rusak; keduanya dilaporkan sebagai catatan.
- Istilah yang tidak ada di kit dihapus: `activity`/`ready` di `feature` dan `implement`, "repo manifest" di `context`, "dispatcher" di `check`.
- Dua URL OpenCode yang 404 diganti dengan `/docs/permissions/` dan `/docs/plugins/`; `bunx auth@latest` diganti `bunx @better-auth/cli@latest`.
- Prasyarat yang sebelumnya diam ditulis eksplisit: repo git di `ci`, `CONTEXT.md` di `design`, kit di `adopt`, Node dan lockfile di `agents`, `AGENTS.md` di `implement`.
- Langkah yang menuntut bukti yang belum bisa ada diperbaiki: `/auth` hanya memeriksa rute yang sudah ada, `ci-deploy` menyebut smoke test sebagai langkah remote, `deps` punya fallback saat `Verify` belum ada.
- Nama seksi `CONTEXT.md` di `auth`, `data`, dan tabel pemetaan `plan` disamakan dengan template kit. `env.example` diseragamkan (kit mengirim nama tanpa titik), termasuk negasi di `.gitignore` kit dan pola izin di `opencode.json`.
- Pertanyaan ke user dirutekan lewat `interview` di `debug` dan `layout`; klausa "question count" yang menggantung di `auth` dan `tests` dihapus.
- `rollback` mengecualikan seluruh `.pawang/**` dan `openapi.json`; `incident` mengizinkan Cause/Route diperbarui setelah `/debug`; `runbook` memakai `.pawang/runs/` untuk pengukuran; `layout` memakai satu daftar kata terlarang dari `layout-rules.json`.

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

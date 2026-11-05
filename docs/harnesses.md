# Harness

Pawang agents adalah satu set skill dengan satu sumber, `skills/`. Semua harness memakainya apa adanya: tidak ada salinan per harness dan tidak ada penulisan ulang path saat dipasang. Root repo adalah plugin Claude Code dan Codex; berkas turunan kecil (subagent dan manifest) dihasilkan oleh `scripts/build-plugin.mjs`.

## Pasang

Dokumen ini memetakan **mekanisme** tiap jalur. Perintah yang bisa disalin ada di [`README.md`](../README.md#pasang-lewat-marketplace) dan tidak diulang di sini, supaya tidak ada dua daftar yang bisa melenceng.

| Harness | Bentuk | Yang dipasang | Catatan |
| --- | --- | --- | --- |
| Claude Code | plugin di root repo, lewat marketplace | `skills/` + `agents/*.md` dari cache plugin | dipanggil `/pawang:<nama>`; subagent `pawang:<nama>` |
| Codex | plugin di root repo, lewat marketplace | `skills/` + `agents/*.md` dari cache plugin | manifest mendeklarasikan `skills: ./skills/` |
| Pi | paket Pi (`keywords`, `pi.skills` di `package.json`) | `skills/` dari folder paket | dipanggil `/skill:<nama>`; eksplisit, tidak bisa dipicu model |
| OpenCode, dan agent lain yang membaca `.agents/skills` | salinan persis `skills/` | `.agents/skills/<nama>/` di proyek | `--opencode` menambah command, plugin, `opencode.json`, dan subagent hasil rakitan |
| Claude Code tanpa plugin | salinan persis `skills/` | `.claude/skills/<nama>/` di proyek | `--init` menambah `CLAUDE.md` berisi `@AGENTS.md` |

Kit proyek (`AGENTS.md`, `CONTEXT.md`, `.pawang/`, ...) dipasang oleh skill `pawang-init`. Memasang hanya `skills/` tanpa kit tidak cukup: skill membaca file itu saat berjalan. Update memakai manifest `.agents/pawang.lock.json` yang mencatat versi dan hash file; perintahnya ada di [`README.md`](../README.md#update), tidak diulang di sini.

## Status verifikasi

Ini satu-satunya tempat status verifikasi ditulis; `README.md` dan `CHANGELOG.md` merujuk ke sini. `npm test` menguji build, struktur manifest, dan pemasangan lokal — bukan pemuatan oleh harness.

| Harness | Jalur | Diuji otomatis | Belum diuji |
| --- | --- | --- | --- |
| Claude Code | plugin marketplace | isi `agents/*.md`, manifest, marketplace | pemuatan plugin oleh Claude Code; namespace `pawang:<nama>`; penemuan `skills/` |
| Codex | plugin marketplace | struktur manifest, katalog marketplace | pemuatan plugin oleh Codex |
| Pi | paket `pi install git:` | `keywords`, `pi.skills`, lokasi `skills/` | pemuatan skill oleh Pi; `/skill:<nama>` muncul di autocomplete |
| OpenCode | installer `--opencode` | berkas yang ditulis, isi dan izin hasil rakitan | penegakan izin oleh versi OpenCode pengguna |
| Universal `.agents/skills`, `.claude/skills` | installer | salinan persis `skills/`, kit, dry-run, tidak menimpa | perilaku agent di tiap harness |

Antigravity, ChatGPT, omp, dan Muse belum didukung.

Catatan Pi: skill kita explicit-only (`disable-model-invocation`), yang menurut dokumentasi Pi hanya tersedia lewat `/skill:<nama>`. Prompt template Pi tidak bisa memanggil skill, jadi tidak ada template `/<nama>`. Pi juga tidak punya penegakan izin seperti `opencode.json`, dan dokumentasinya tidak menyebut subagent bernama, sehingga langkah subagent memakai jalur cadangan (sesi baru).

## Manifest

| Berkas | Dihasilkan oleh | Fungsi |
| --- | --- | --- |
| `package.json` | tangan | satu-satunya sumber versi |
| `.claude-plugin/plugin.json` | `build-plugin.mjs` | manifest plugin Claude Code |
| `.claude-plugin/marketplace.json` | `build-plugin.mjs` | katalog Claude Code; memuat `pawang` (source `./`) dan menautkan `pawang-skills` |
| `.codex-plugin/plugin.json` | `build-plugin.mjs` | manifest plugin Codex |
| `.agents/plugins/marketplace.json` | `build-plugin.mjs` | katalog Codex |
| `skills/pawang-init/assets/VERSION` | `build-plugin.mjs` | versi yang dibaca `pawang-init` di proyek |
| `agents/*.md` | `build-plugin.mjs` | subagent format Claude Code |

Jangan edit berkas turunan dengan tangan. Ubah sumber, lalu jalankan `node scripts/build-plugin.mjs`. `validate.mjs` menggagalkan CI bila hasilnya tidak sinkron, dan `check-version.mjs` menggagalkan bila versi manifest berbeda.

Asimetri yang disengaja: `.codex-plugin/plugin.json` mendeklarasikan `"skills": "./skills/"`, `.claude-plugin/plugin.json` tidak punya medan `skills` maupun `agents`. Menurut dokumentasi plugin Claude Code, setiap jenis komponen punya lokasi bawaan di root plugin — `skills/<nama>/SKILL.md` dan `agents/*.md` — dan manifest hanya perlu menunjuk bila komponen berada di luar lokasi itu. Repo ini memakai lokasi bawaan, jadi tidak ada yang perlu dideklarasikan; menambahkan `skills` di sana hanya akan menunjuk folder yang sama. Tes menjaga agar manifest Claude tidak menunjuk `./skills/` atau `./agents/`, supaya asimetri ini tidak "diperbaiki" tanpa alasan.

## Path di dalam skill

Skill dipasang di tempat berbeda: folder proyek (`.agents/skills/`, `.claude/skills/`) atau cache plugin. Karena itu teks skill tidak pernah menulis lokasi skill lain secara langsung. Aturannya:

- `<skill-dir>` adalah folder yang berisi `SKILL.md`. Skrip sendiri: `<skill-dir>/scripts/x.mjs`. Skill lain: `<skill-dir>/../<nama>/...`.
- Setiap `SKILL.md` yang memakai `<skill-dir>` memuat satu catatan "Paths" yang menjelaskannya, termasuk anjuran memakai path relatif proyek bila skill terpasang di proyek (supaya cocok dengan pola izin shell).
- `interview` dan `pawang-skill-creator` (eksternal) dirujuk lewat nama.
- Kit proyek merujuk skill lewat nama, bukan path.

`validate.mjs` dan `tests/skills.test.mjs` menjaga aturan ini: rujukan `.agents/skills/<skill>/...` di teks skill menggagalkan CI, begitu pula `<skill-dir>` tanpa catatan.

Satu pengecualian: gambar acuan desain disimpan di folder `assets/` milik skill `reference`. Di mode plugin folder itu ada di cache plugin dan tidak bertahan saat pembaruan.

## Subagent

Skill menyebut subagent lewat nama: `explorer`, `implementer`, `reviewer`, `verifier`. Persona punya satu sumber: templat `skills/agents/assets/agents/*.md`. Templat itu dirakit `skills/agents/scripts/render.mjs` untuk tiga tujuan, dan tidak ada salinan persona yang dirawat terpisah:

| Tujuan | Pemanggil | Manajer paket |
| --- | --- | --- |
| `.opencode/agents/` (empat subagent) | `/agents` (`install-agents.mjs`) | dari lockfile proyek |
| `.opencode/agents/` (+ agent utama `build`) | `install.mjs --opencode` | dari lockfile proyek |
| `agents/<nama>.md` untuk Claude Code dan Codex | `build-plugin.mjs` | tidak dirakit, lihat di bawah |

| Harness | Pemetaan |
| --- | --- |
| OpenCode | agent langsung (`task`), izin di frontmatter ditegakkan oleh OpenCode |
| Claude Code | `agents/<nama>.md` (di sesi: `pawang:<nama>`); `tools` turunan dari izin `edit`; pembatasan shell menjadi aturan kerja di badan agen, bukan penegakan harness |
| Codex | `agents/<nama>.md` sebagai persona; agent umum diminta membacanya dulu |
| Pi | tidak ada subagent bernama yang terdokumentasi; jalur cadangan (sesi baru) |

Build tidak tahu proyek pengguna, jadi terjemahan ke Claude Code dan Codex bersifat lossy di dua titik, dan keduanya diganti aturan prosa di badan agen:

- Izin bash yang bergantung manajer paket (`npm run test*`, `bun test*`, ...) tidak dirakit. Agent diberi tahu menjalankan perintah yang ada di `package.json` proyek.
- Pola tolak berkas rahasia (`.env*`, `.dev.vars*`) tidak bisa ditulis sebagai pola izin file, jadi larangannya ditulis sebagai kalimat: jangan baca, edit, tampilkan, atau sentuh lewat shell.

`pawang-init --opencode` tidak memasang subagent; itu tugas skill `agents`. Installer `install.mjs --opencode` menjalankan keduanya, dan menambahkan agent utama `build` — agent itu menggantikan orkestrator OpenCode, jadi hanya installer yang memasangnya. `build` tidak pernah dikirim sebagai `agents/build.md` untuk Claude Code atau Codex (`SKIP_AGENTS` di `build-plugin.mjs`).

Di harness lain, sesi utama berperan sebagai orkestrator dan aturan commit ada di `AGENTS.md`. Kalau harness tidak bisa memulai subagent, `audit` meminta user membuka sesi baru (mode `fresh session`), karena review di konteks yang sama bukan review dengan konteks bersih.

# Penilaian isi 32 prosedur `pawang-agents`

Ditulis 2026-11-04. Basis commit `41bbdd5`. 32 reviewer, masing-masing konteks baru.

## Cara penilaian ini dilakukan

Tiap skill dinilai satu reviewer terpisah, dijalankan sebagai proses `pi -p --no-session` dengan hanya `read` dan `bash` (read-only). Setiap reviewer membaca `skills/<nama>/SKILL.md` penuh, semua berkas di folder skill itu yang dirujuk, lalu `kit/AGENTS.md` dan `kit/.pawang/rules.md` — aturan proyek yang harus dipatuhi prosedur. Reviewer hanya membaca skill lain bila prosedur itu menyebutnya.

Rubriknya delapan hal, dan hanya itu: pemicu dan cakupan, prasyarat, langkah yang bisa diperiksa, keluaran, batas dan izin, rujukan silang, YAGNI, dan klaim yang kedaluwarsa.

**Kegagalan pass pertama, dan kenapa itu penting.** Prompt awal membolehkan verdict "KUAT" tanpa temuan. Hasilnya: **25 dari 32 reviewer mengembalikan "KUAT" tanpa satu temuan pun** — termasuk `audit`, 378 baris, yang jelas punya cacat. Itu bukan bukti 25 prosedur bersih; itu reviewer yang berhenti terlalu cepat. Pass kedua memakai prompt yang mewajibkan menyebut dua titik terlemah dengan `path:line`, walaupun verdict-nya KUAT, dan meminta daftar apa yang benar-benar dibaca. Baru setelah itu hasilnya spesifik. Semua angka di bawah berasal dari pass kedua.

Biaya: sekitar 57 proses model. Satu run gagal karena batas konkurensi (429) dan diulang.

**Yang saya verifikasi sendiri, bukan diterima dari reviewer:** semua tema lintas-skill di bawah, plus setiap temuan `serius` yang saya kutip. Temuan `kecil` saya terima sebagai klaim reviewer, kecuali yang saya sebut terverifikasi.

---

## Hasil ringkas

| Verdict | Jumlah |
| --- | --- |
| RUSAK | 0 |
| PERLU PERBAIKAN | 30 |
| KUAT | 2 (`sync`, `tests`) |
| Total temuan | 98 (0 fatal, 13 serius, 85 kecil) |

Tidak ada prosedur yang rusak sampai tidak bisa diikuti. Yang ada: 98 titik gesekan, dan sebagian besar bukan salah ketik — mereka bertabrakan dengan aturan kit yang repo ini tulis sendiri.

---

## Delapan tema lintas-skill

Ini bagian yang paling berguna. Lima tema pertama menyumbang sekitar 40 dari 98 temuan.

### T1. Lima skill melanggar aturan kepemilikan berkas milik kit sendiri — terverifikasi

`kit/AGENTS.md:39` menyatakan: *"Only the listed skill, or the user, writes a file. A skill that needs a change elsewhere hands off to the owner."* Dan `:23` menetapkan penulis `AGENTS.md` hanya `agents-md`, `sync`, `layout`.

Lima prosedur menyuruh agent menulis berkas yang bukan miliknya:

| Skill | Baris | Yang disuruh | Pemilik menurut kit |
| --- | --- | --- | --- |
| `advise` | 89 | "Edit AGENTS.md langsung" | `agents-md`, `sync`, `layout` |
| `agents` | 57 | "Keputusan baru: tulis ke `.pawang/decisions/`" | `agents-md`, `layout`, `handoff` |
| `handoff` | 45, 46 | menulis `AGENTS.md` dan baris peta dokumen | `agents-md`, `sync`, `layout` |
| `reference` | 83 | "daftarkan di peta dokumen AGENTS.md dengan mengedit AGENTS.md" | `agents-md`, `sync`, `layout` |
| `ci` | 81-82 | "Document the exact invocation as `Verify` in the Commands section of `AGENTS.md`" | `agents-md`, `sync`, `layout` |

`reference:83` menambah satu pelanggaran lagi: ia membuat `.pawang/specs/documents/` tanpa baris pemilik, padahal `kit/AGENTS.md:40` mewajibkan baris pemilik sebelum ada yang menulis ke folder baru.

Ini bukan soal selera. Aturan itu ada supaya dua skill tidak saling menimpa `AGENTS.md`. Lima prosedur mengabaikannya, jadi aturannya sekarang hanya berlaku di atas kertas.

### T2. Istilah yang tidak ada di kit

- **`activity` dan status `ready`** — `feature/SKILL.md:220` dan `implement/SKILL.md:158` menyuruh "update activity to `ready`". `grep -rn activity kit/` kosong. Status spec yang kit definisikan hanya `not started`, `in progress`, `verified`, `done` (`kit/.agents/README.md:23`). Agent yang mengikuti instruksi ini harus mengarang apa yang diperbarui.
- **"repo manifest"** — `context/SKILL.md:19` menyuruh membaca "repo manifest" tanpa pernah menyebut berkas apa. Kit tidak mendefinisikannya.
- **"dispatcher"** — `check/reference/verify.md:15` menyebut "dispatcher" yang tidak ada di repo.

### T3. Nilai konfigurasi yang tidak cocok dengan skema kit — terverifikasi

| Lokasi | Yang ditulis | Yang ada di kit |
| --- | --- | --- |
| `complete/SKILL.md:94`, `implement/SKILL.md:82,84` | `verification.logicTests: "required"`, `uiEvidence: "required"` | `config.md:147-149` dan `pawang.json:26`: `always` / `when-configured` / `when-available` |
| `status/SKILL.md:46-47` | "Audit and check default to `manual`" | `pawang.json:31`: `audit: "when-sensitive"` |

Akibatnya bukan kosmetik. Gate `logicTests: "required"` tidak pernah menyala di proyek mana pun, karena tidak ada kode yang mengenali nilai `required` — jadi syarat yang ditulis `complete` sebagai penghalang tidak menghalangi apa pun. Dan `/status` melaporkan default yang salah tentang audit, sehingga user mengira audit tidak akan jalan otomatis padahal `when-sensitive` bisa memicunya.

### T4. Langkah yang menuntut bukti yang belum bisa ada

- `auth/SKILL.md:108-111` — Step 3 meminta verifikasi bahwa "protected route rejects anonymous" dan "authorization checked on server", padahal `/auth` berjalan **sebelum** `/feature` membangun rute itu. Pemeriksaan utamanya vakum saat dijalankan.
- `ci-deploy/SKILL.md:151` vs `:137` — laporan mensyaratkan "the smoke test", sementara Step 4 melarang deploy dan smoke test baru bisa jalan setelah deploy hidup.
- `deps/SKILL.md:31,54` — mewajibkan "Verify command that must pass" tanpa fallback, padahal `Verify` baru dibuat oleh `/ci` dan tidak ada di `Commands` bawaan kit.

### T5. Prasyarat yang tidak dinyatakan

Hampir separuh prosedur mengasumsikan sesuatu yang tidak pernah disebut sebelum langkah pertama: repo git (`ci:136`, `handoff:17`, `deps`), `CONTEXT.md` sudah ada (`design:26,48`), `package.json` ada (`runbook:30-31`, `agents`), lockfile ada (`agents` — tanpa lockfile `detectPm` diam-diam jatuh ke `npm`). Agent yang mengikuti berkasnya secara literal akan menebak, dan tebakan yang salah baru ketahuan jauh di belakang.

### T6. Rujukan mati dan klaim yang tidak berdasar

- **Dua URL 404, terverifikasi.** `agents-md/SKILL.md:103` dan `advise/scripts/harden-permissions.mjs:11` menunjuk `https://opencode.ai/.pawang/permissions` dan `/.pawang/plugins`. Keduanya 404; yang benar `https://opencode.ai/docs/permissions/` dan `/docs/plugins/` (keduanya 200). Terlihat seperti hasil pencarian-ganti string yang salah sasaran.
- `auth/reference/providers.md:32` memakai `bunx auth@latest`, padahal CLI Better Auth adalah `@better-auth/cli`. Perintahnya akan gagal.
- `release/reference/providers.md:97` memuat angka kuota Cloudflare Previews tanpa sumber, dan `ci-deploy` memuat versi tindakan GitHub yang tidak dicek.
- `agents/SKILL.md:20,73` merujuk "issue #5894" OpenCode dan klaim "sudah dicek ke dokumentasi resmi" yang tidak bisa diverifikasi dari repo.

### T7. Satu bug yang terbukti dengan eksekusi

`skills/status/scripts/permissions.mjs:24` melempar `ENOENT` dan berhenti bila `.agents/pawang.json` tidak ada, padahal `status/SKILL.md:42` menyatakan berkas hilang berarti sehat dan memakai default. Saya jalankan di folder kosong:

```
path: '/tmp/.../.agents/pawang.json'
Node.js v26.13.0     ← proses mati
```

JSON tidak valid juga membuatnya berhenti, bukan memakai default. `/status` adalah skill yang justru dipakai saat ada yang tidak beres.

### T8. Klausa menggantung dan rujukan ke aturan yang tak pernah ada

`auth/SKILL.md:85` dan `tests/SKILL.md:23` sama-sama memuat kalimat *"Any limit on question count stated here still applies"* — padahal tidak ada batas yang dinyatakan di kedua berkas itu. Kemungkinan sisa dari versi yang punya batas, atau salinan dari skill lain. `deps/SKILL.md:54` menaruh "stop and wait" di Step 4, lalu Step 5–6 tetap berjalan sesudahnya.

### T9. `interview` tidak dirujuk padahal kit mewajibkannya

`kit/AGENTS.md` mewajibkan setiap pertanyaan ke user lewat skill `interview`. Beberapa prosedur menyuruh bertanya langsung: `debug:30,39,66`, `layout:59,60,77,88`, `incident:57`. Kalau kit dan skill berbeda soal ini, agent memilih salah satunya secara acak.

### T10. Bentuk yang berulang: tabel vs skrip

`layout` adalah contoh paling jelas: `SKILL.md:22` menyebut `v2`/`test2` dilarang (berkesan ERROR), sementara `check-layout.mjs:136-137` hanya memberi WARN, dan daftar kata terlarang di `:22` berbeda dari daftar di `:76` dan dari `layout-rules.json:13`. Tiga daftar, tiga tingkat ketegasan. `design:71` punya masalah sejenis dengan aturan kontras: diklaim error, ternyata warning.

---

## Per skill

| Skill | Verdict | F | S | K | Yang paling perlu dilihat |
| --- | --- | --- | --- | --- | --- |
| `adopt` | perlu perbaikan | 0 | 1 | 2 | Handoff ke `/context` bertabrakan dengan aturan baseline di `context:79` |
| `advise` | perlu perbaikan | 0 | 1 | 0 | Mengedit `AGENTS.md` langsung (T1) |
| `agents` | perlu perbaikan | 0 | 1 | 3 | Menulis `.pawang/decisions/` langsung (T1); fallback `npm` diam-diam |
| `agents-md` | perlu perbaikan | 0 | 0 | 2 | Dua URL 404 (T6); regex verifikasi path tidak menangkap path satu segmen |
| `assess` | perlu perbaikan | 0 | 0 | 4 | Skala keyakinan bukti tidak dipetakan ke skor keputusan |
| `audit` | perlu perbaikan | 0 | 0 | 4 | Sisa kalimat template ("angle brackets below") padahal blok perintah tak memuatnya; `CONTEXT.md` tak-tercommit tetap ter-hash |
| `auth` | perlu perbaikan | 0 | 1 | 3 | `bunx auth@latest` salah paket (T6); Step 3 memeriksa rute yang belum ada (T4) |
| `buildall` | perlu perbaikan | 0 | 1 | 2 | Menjanjikan tanpa jeda per langkah, tapi tidak mengesampingkan `stepReview: every` |
| `check` | perlu perbaikan | 0 | 2 | 1 | Menulis `**Status:**` ke `CONTEXT.md`, padahal status hidup di spec; `check` bukan pemilik spec |
| `ci` | perlu perbaikan | 0 | 0 | 4 | Menulis `Verify` ke `AGENTS.md` (T1); menambah skrip `prepare` tanpa aturan gabung |
| `ci-deploy` | perlu perbaikan | 0 | 0 | 3 | Laporan menuntut smoke test yang belum bisa dijalankan (T4) |
| `complete` | perlu perbaikan | 0 | 1 | 0 | `logicTests: "required"` — gate yang tidak pernah menyala (T3) |
| `context` | perlu perbaikan | 0 | 1 | 2 | Kandidat baseline melewatkan berkas `.pawang/` yang dikirim kit; "repo manifest" (T2) |
| `data` | perlu perbaikan | 0 | 0 | 3 | Scope `check`/`config` tidak punya langkah; `.env.example` vs `env.example` |
| `debug` | perlu perbaikan | 0 | 0 | 2 | Diagnosis hanya di chat, `/fix` mengharapkan "confirmed verdict"; bertanya tanpa `interview` (T9) |
| `deps` | perlu perbaikan | 0 | 1 | 3 | "Verify command" tanpa fallback (T4); "stop and wait" sebelum langkah yang masih jalan |
| `design` | perlu perbaikan | 0 | 0 | 4 | Klaim "one owner" bertentangan dengan kit:27 dan `adopt:23`; `git show HEAD:DESIGN.md` gagal bila belum pernah di-commit |
| `feature` | perlu perbaikan | 0 | 1 | 1 | "update activity to `ready`" (T2) |
| `fix` | perlu perbaikan | 0 | 0 | 1 | Anchor `#output-formatting` menunjuk heading yang tidak ada di `AGENTS.md` |
| `handoff` | perlu perbaikan | 0 | 1 | 2 | Menulis `AGENTS.md` langsung (T1); `_archive/` tanpa baris pemilik |
| `implement` | perlu perbaikan | 0 | 0 | 4 | "activity to `ready`" (T2); nilai gate `required` (T3) |
| `incident` | perlu perbaikan | 0 | 1 | 3 | Deskripsi bilang "not for planned features", tabel rute mengarahkan ke `/feature` |
| `layout` | perlu perbaikan | 0 | 0 | 3 | Tiga daftar kata terlarang dengan tiga ketegasan berbeda (T10) |
| `pawang-init` | perlu perbaikan | 0 | 0 | 2 | `/agents-md` disuruh menggabung `CONTEXT.md`/`DESIGN.md`, padahal itu milik `/adopt` |
| `plan` | perlu perbaikan | 0 | 1 | 1 | Tabel pemetaan seksi `CONTEXT.md` bertentangan dengan template dan `SKILL.md` |
| `reference` | perlu perbaikan | 0 | 2 | 1 | Mengedit `AGENTS.md` dan membuat folder tanpa pemilik (T1) |
| `release` | perlu perbaikan | 0 | 0 | 3 | Scope `check` dijanjikan read-only tapi Step 4 tetap bisa menulis |
| `rollback` | perlu perbaikan | 0 | 1 | 3 | Pengecualian "workflow paths" tidak lengkap: `.pawang/workflow.md`, `decisions/`, `incidents/`, `openapi.json` bisa ikut dibalik |
| `runbook` | perlu perbaikan | 0 | 1 | 3 | Kit menyatakan `runbook` menulis `.pawang/runs/`, prosedurnya menulis `runbooks/` |
| `status` | perlu perbaikan | 0 | 2 | 2 | Default audit dilaporkan salah (T3); `permissions.mjs` crash (T7) |
| `sync` | **kuat** | 0 | 0 | 4 | Hanya kecil: `.agents/README.md` tidak ada di daftar Reads; "default branch" tak terdefinisi |
| `tests` | **kuat** | 0 | 0 | 3 | Klausa menggantung (T8); `bun.lockb` sudah usang |

F/S/K = fatal / serius / kecil.

---

## Tiga belas temuan `serius`, urut dampak

1. `complete:94` + `implement:82,84` — gate `logicTests/uiEvidence: "required"` tidak dikenal skema, jadi tidak pernah menyala. **Ini yang paling merugikan: syarat yang dijanjikan sebagai penghalang tidak menghalangi apa pun.**
2. `status/scripts/permissions.mjs:24` — crash saat `pawang.json` hilang atau rusak, padahal `/status` justru dipakai saat ada yang tidak beres.
3. `status:46-47` — melaporkan default audit `manual`, padahal `when-sensitive`.
4. `auth/reference/providers.md:32` — `bunx auth@latest` bukan paket Better Auth; perintahnya gagal.
5. `reference:83` — mengedit `AGENTS.md` dan membuat `.pawang/specs/documents/` tanpa pemilik (T1).
6. `handoff:45,46` — menulis `AGENTS.md` langsung (T1).
7. `advise:89` — mengedit `AGENTS.md` langsung (T1).
8. `agents:57` — menulis `.pawang/decisions/` langsung (T1).
9. `feature:220` / `implement:158` — "activity to `ready`" tidak ada di kit (T2).
10. `deps:31,54` — mewajibkan `Verify` yang belum ada, tanpa fallback (T4).
11. `check/reference/verify.md:107,119` — menulis status spec ke `CONTEXT.md`, dan `check` bukan pemilik spec.
12. `buildall:56` — menjanjikan tanpa jeda, tidak mengesampingkan `stepReview: every`.
13. `plan/reference/from-prototype-files.md:64` — tabel pemetaan seksi `CONTEXT.md` bertentangan dengan template yang ia sendiri tunjuk.

---

## Yang tidak bisa diverifikasi dari repo ini

- Skill eksternal `interview` dan `plans-prototype` (milik `pawangai/pawang-skills`). Banyak prosedur bergantung pada `interview`, dan kontraknya tidak bisa diperiksa di sini.
- Perilaku harness: apakah `disable-model-invocation` benar-benar menghalangi pemanggilan model, apakah subagent bisa dimulai, apakah izin OpenCode ditegakkan.
- Klaim pihak ketiga: versi Wrangler dan tindakan GitHub, kuota Cloudflare Previews, nomor issue OpenCode, `@google/design.md`.

## Yang tidak diklaim

Review ini menilai **apakah tiap prosedur bisa diikuti dan konsisten dengan kit**, bukan apakah urutan alur kerjanya tepat. Pertanyaan seperti "apakah `/feature` seharusnya sebelum `/design`" atau "apakah tujuh gate itu terlalu banyak" tidak dijawab di sini dan tidak bisa dijawab dengan membaca satu berkas per skill.

---

## Status perbaikan (ditambahkan setelah penilaian)

Semua 98 temuan dikerjakan pada putaran yang sama. 44 berkas berubah.

Sebagian temuan diselesaikan dengan mengubah **kit**, bukan skill, karena aturan yang dilanggar ada di sana:

| Temuan | Cara diselesaikan |
| --- | --- |
| `ci` menulis `Verify` ke `AGENTS.md` | Kit sekarang menyatakan `ci` memiliki baris `Verify` di `## Commands` (pola yang sama dengan `layout` yang memiliki `## Repository layout`), dan `ci` masuk kolom penulis |
| `reference` membuat `.pawang/specs/documents/` tanpa pemilik | Baris pemilik baru di tabel kit: folder itu milik `reference` |
| `advise`, `agents`, `handoff` menulis `AGENTS.md` / `.pawang/decisions/` | Skill diubah: menyerahkan ke `/agents-md` dan `/handoff`. Aturan kepemilikan tidak dilonggarkan |
| `runbook` dan `.pawang/runs/` | Prosedur diubah agar menulis ke `.pawang/runs/` untuk tujuan pengukuran; tidak perlu baris baru karena sudah ada |

Tiga temuan saya nilai berbeda dari reviewer:

1. **`handoff` menulis `.pawang/decisions/` bukan pelanggaran.** `kit/AGENTS.md:34` sudah mencantumkan `handoff` sebagai pemilik folder itu. Yang benar-benar dilanggar hanya penulisan `AGENTS.md`, dan itu yang saya perbaiki.
2. **`sync` dan `tests` tetap `KUAT`.** Temuannya kecil dan semuanya sudah diperbaiki; verdict-nya tidak perlu berubah menjadi "perlu perbaikan" hanya karena ada empat nit.
3. **`design:71`** — reviewer menyebut kontras "diklaim error", dan itu benar untuk teks skill-nya, bukan untuk linter. Saya perbaiki teksnya agar menyebut WARN, bukan mengubah aturan linter.

Yang **tidak** saya ubah walaupun disebut reviewer, karena butuh keputusan produk dan bukan perbaikan:

- Menghapus scope yang tidak dipakai (`release config`, `data config`, `ci-deploy <host>` generik). Saya perbaiki agar scope itu punya langkah yang jelas, bukan menghapusnya — menghapus fitur bukan tugas review.
- Angka kuota Cloudflare Previews di `release/reference/providers.md`: saya tambahkan penanda "unverified", tidak saya ganti, karena tidak bisa memverifikasi docs Cloudflare dari sini.
- Versi tindakan GitHub di `ci-deploy` (mis. `actions/checkout@v6`). Sama: tidak bisa diverifikasi tanpa jaringan.

Verifikasi akhir: `build-plugin --check`, `validate` (32 skill, 35 command), `check-version`, `npm test` 43/43, dan ZIP rilis reproducible.

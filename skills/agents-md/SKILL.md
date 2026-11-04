---
name: agents-md
description: Menulis, merapikan, atau memecah AGENTS.md menjadi indeks pendek yang menautkan ke file standar di root dan `.pawang/`, serta membuat AGENTS.md per folder monorepo. Gunakan saat user minta membuat AGENTS.md, AGENTS.md terlalu panjang atau tautannya rusak, atau ingin menekan biaya token konteks. Jangan untuk membuat atau mereview skill (itu pawang-skill-creator).
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# AGENTS.md

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Tujuan: agent baru bisa langsung bekerja tanpa memindai seluruh repo, dan hanya membaca detail yang dibutuhkan tugasnya.

AGENTS.md dibaca di SETIAP sesi, jadi setiap baris membayar token berulang kali. AGENTS.md adalah INDEKS + aturan inti, bukan ensiklopedia. Detail dipindah ke file standar di root (`CONTEXT.md`, `DESIGN.md`, `.pawang/conventions/`) atau `.pawang/` dan dibaca sesuai kebutuhan.

## Prinsip

1. Target 40-100 baris. Kalau melewati 150 baris, pindahkan bagian ke `.pawang/`.
2. Tulis hanya yang TIDAK bisa disimpulkan agent dari membaca kode: perintah, konvensi tak tertulis, keputusan beserta alasannya, jebakan, larangan.
3. Jangan salin README, daftar semua file, atau penjelasan umum framework.
4. Gunakan kalimat perintah yang spesifik dan bisa diperiksa. "Pakai zod untuk validasi di `*.schema.ts`" bagus. "Tulis kode bersih" tidak berguna.
5. Setiap perintah yang ditulis harus diverifikasi benar-benar ada (cek `package.json`, Makefile, dsb.).
6. Satu pengecualian dari aturan 2: section **Prinsip kerja** (4 baris, perilaku umum agent) selalu masuk walau generik, karena menargetkan kegagalan yang sering teramati pada agent (asumsi, over-engineering, diff melebar, klaim tanpa tes), bukan nasihat umum. Ini hipotesis, bukan jaminan: baris yang tidak mengubah perilaku agent (paling rawan baris 2) dihapus setelah diuji dengan dan tanpa baris itu. Jangan menambah baris kelima atau memperluasnya jadi daftar aturan perilaku. Prosedur ujinya ada di bagian **Menguji baris perilaku**.
7. Bagian bawaan Pawang tidak dihapus atau diubah isinya: aturan atribusi di baris awal, tabel **Project files** (peta file standar beserta pemilik dan pemicu baca), **Proportional engineering**, **Communication**, **Output formatting**, **Code changes**, **Branching and commits** dan **Commits**, **Writing**, serta heading `## Commands` dan `## Repository layout` (`/ci`, `/tests`, `/adopt`, dan `/layout` menulis ke heading itu dengan nama persis tersebut). Skill lain merujuk `AGENTS.md#communication` dan `AGENTS.md#commits`. File baru yang dibutuhkan proyek (misalnya `GAME-DESIGN.md`) didaftarkan sebagai baris baru di tabel Project files, bukan di peta kedua.
8. Saat memadatkan AGENTS.md atau file docs: pangkas pengulangan dan kata pengantar, tetapi pertahankan semua aturan dan larangan beserta syaratnya, arti kalimat, serta nama perintah, path, nilai, dan teks dalam backtick persis. Bila ragu, pertahankan; tinjau diff sebelum dipakai.

## Target agent (tentukan di awal)

AGENTS.md adalah format lintas agent. Isinya harus bisa dieksekusi oleh agent yang membacanya, kalau tidak, barisnya hanya membuang token.

1. Deteksi target dari repo: `opencode.json` atau `.opencode/` (OpenCode), `.claude/` (Claude Code), `.cursor/` (Cursor). Folder `.agents/` bukan sinyal di proyek ini, karena paket Pawang sendiri yang memasangnya. Tanpa sinyal lain, targetnya OpenCode saja. Kalau tidak jelas, tanya user (masuk jatah pertanyaan di Proses langkah 2).
   **Mode universal** dipakai bila lebih dari satu agent terdeteksi atau user minta "universal": AGENTS.md jadi satu-satunya sumber kebenaran, ditulis dengan istilah peran (poin 3), dan file khusus per agent hanya penunjuk tipis, tidak pernah salinan isi. Konfigurasi penegakan (permission, hook, plugin) tetap di berkas masing-masing agent, bukan di AGENTS.md.
2. **Target tunggal dengan subagent atau skill (OpenCode):** Cara kerja boleh menyebut nama subagent dan skill yang benar-benar terpasang. Cek dulu keberadaannya (subagent ada di `.opencode/agents/` setelah `/agents`); jangan menyebut nama yang tidak ada.
3. **Banyak agent, atau agent tanpa subagent:** tulis Cara kerja dengan istilah PERAN (cari lokasi, implementasi, verifikasi, tinjau), tanpa nama subagent atau skill. Tambahkan frasa bahwa agent tanpa subagent mengerjakan urutan yang sama sendiri, satu peran per langkah.
4. Kalau repo juga dipakai Claude Code, yang membaca `CLAUDE.md` dan bukan AGENTS.md, buat `CLAUDE.md` berisi satu baris `@AGENTS.md` supaya tidak ada dua sumber kebenaran. Impor ini aman karena AGENTS.md memang dimuat setiap sesi. Jangan menyalin isi AGENTS.md ke `CLAUDE.md` atau aturan Cursor.
5. Penegakan deterministik (Proses langkah 5) mengikuti agent target: OpenCode lewat `permission` di `opencode.json` atau plugin; Claude Code lewat permissions atau hooks di settings. Cek dokumentasi agent target untuk sintaks terbarunya.

## Pola indeks

### Tetap di AGENTS.md
- Ringkasan, section **Cara kerja** (alur subagent dan aturan commit, 5 baris, tepat setelah Ringkasan; jangan dipindah ke .pawang/), section **Prinsip kerja** (4 baris, tepat setelah Cara kerja; jangan dipindah ke .pawang/), stack, perintah dasar.
- **Repository layout**: tabel lokasi file dan aturan penamaan (maksimal sekitar 15 baris), ditulis lewat `/layout`, bukan dari tebakan. Dibaca setiap kali agent membuat file, jadi tidak dipindah. Folder tingkat atas yang tertulis di sana dianggap sah oleh skrip audit `/layout`, jadi tulis path-nya dalam backtick.
- **Batas**: larangan (**Jangan**) dan hal yang perlu persetujuan dulu (**Tanya dulu**), satu baris per item. Tidak boleh hanya berupa tautan, karena agent bisa saja tidak membukanya. Contoh Jangan: "Jangan edit file di `migrations/` yang sudah ada." Contoh Tanya dulu: "Tanya dulu sebelum menambah dependency baru."
- Peta dokumen (indeks tautan).

### Pindah ke .pawang/
Konvensi rinci per area, keputusan arsitektur, spesifikasi modul, catatan handoff.

### Format tautan: wajib ada pemicu "kapan dibaca"
Tautan hanya berupa judul tidak membantu agent memutuskan. Tulis kapan harus dibuka:

```markdown
## Baca bila relevan
- `.pawang/conventions/database.md`: baca SEBELUM mengubah skema, migrasi, atau query.
- `.pawang/conventions/api.md`: baca saat menambah atau mengubah endpoint.
- `.pawang/conventions/testing.md`: baca SEBELUM menulis tes atau menyatakan tugas selesai.
- `.pawang/decisions/`: baca saat tugas menyentuh arsitektur. Hanya yang berstatus Accepted yang berlaku.
- `.pawang/specs/<modul>.md`: baca saat mengerjakan modul tersebut.
- `.pawang/handoff/<topik>.md`: baca saat melanjutkan pekerjaan sebelumnya.
```

Tabel **Project files** adalah peta file standar di root dan tetap di bagian itu. Jangan dibuat dua peta. Bagian "Baca bila relevan" hanya untuk file tambahan di `.pawang/`.

### Struktur folder yang disarankan
```
AGENTS.md
.pawang/
  conventions/    # aturan per area (database, api, ui, testing)
  decisions/      # satu keputusan per file: 0001-harga-dalam-sen.md
  specs/          # spesifikasi per modul
  handoff/        # catatan sementara (ditulis /handoff)
```

### Aturan memecah
- Pecah per AREA TUGAS (database, api, ui), bukan per topik kecil. Terlalu banyak file kecil membuat agent membuka banyak file satu per satu.
- Ukuran ideal satu file docs: 50-150 baris. File di atas 100 baris diawali daftar isi (satu baris per heading utama) di bagian paling atas, karena agent sering hanya membaca sekitar 100 baris pertama untuk memutuskan apakah file itu berguna; dengan daftar isi agent bisa membaca semuanya atau langsung lompat ke bagian yang dibutuhkan.
- Maksimal dua lompatan: AGENTS.md -> file docs. Tautkan setiap file docs langsung dari AGENTS.md, jangan sampai ada file yang hanya bisa dicapai lewat file docs lain, karena file di ujung rantai cenderung hanya dibaca sebagian. `.pawang/README.md` sebagai indeks kedua hanya dipakai bila tautannya tidak muat di AGENTS.md, dan jangan lebih dalam dari itu.
- Jangan pakai sintaks impor otomatis (`@path`) untuk file yang seharusnya dibaca sesuai kebutuhan, karena ikut dimuat setiap sesi. Pakai path biasa dalam backtick. Pengecualian: `CLAUDE.md` berisi `@AGENTS.md` (lihat Target agent).

### Template keputusan (ADR singkat)
```markdown
# 0001: Harga disimpan dalam sen
Status: Accepted   (atau: Superseded by 0007)
Tanggal: 2026-10-16

## Keputusan
<satu kalimat>

## Alasan
<2-3 kalimat>

## Konsekuensi
<yang harus diikuti kode lain>
```
Status wajib ada. Tanpa itu agent tidak tahu keputusan mana yang masih berlaku.

## Proses

1. **Tentukan target agent** (lihat Target agent), lalu **kenali proyek.** Pakai AGENTS.md yang ada dan `CONTEXT.md`. Kalau `CONTEXT.md` masih template dan kode sudah ada, jalankan `/adopt` dulu. Kalau proyek masih kosong, tulis AGENTS.md yang sangat pendek (ringkasan, Cara kerja, Prinsip kerja, stack, perintah) dan jangan mengarang struktur yang belum ada.
2. **Tanya hanya yang kurang**, maksimal 3 pertanyaan sekaligus (target agent bila tidak jelas, keputusan desain, larangan, hal yang perlu persetujuan dulu). Jangan menebak keputusan arsitektur. Setiap pertanyaan ke user lewat skill `interview`: pertanyaan bernomor, masing-masing dengan rekomendasi jawaban, ditanyakan per ronde. Batas jumlah pertanyaan di skill ini tetap berlaku, dan jawaban interview tidak menggantikan gerbang persetujuan yang terpisah.
3. **Susun.** Kalau AGENTS.md sudah berisi, pertahankan struktur dan bahasanya dan hanya rapikan atau pecah. Template di bawah hanya untuk file baru. Hapus bagian yang kosong.
4. **Pecah.** Bagian yang panjang atau spesifik area dipindah ke `.pawang/`, ditautkan dengan pemicu "kapan dibaca".
5. **Tandai aturan yang tidak boleh bergantung pada kepatuhan agent**: larangan menyentuh file atau folder tertentu, dan aturan berurutan atau berbasis event ("setelah selesai, jalankan tes"). Teks hanya probabilistik, jadi rekomendasikan penegakan deterministik sesuai agent target. Untuk OpenCode (cek https://opencode.ai/.pawang/permissions dan https://opencode.ai/.pawang/plugins bila ragu, karena API bisa berubah):
   - **`permission` di `opencode.json`** untuk larangan statis: `deny` edit pada `migrations/**`, `ask` pada `git commit`. `<skill-dir>/../advise/scripts/harden-permissions.mjs` sudah menangani file rahasia.
   - **Plugin hook di `.opencode/plugins/`** untuk aturan yang butuh logika atau event: `tool.execute.before` (tolak atau ubah pemanggilan tool dengan `throw`), `tool.execute.after`, `session.idle` (misalnya jalankan tes saat agent menyatakan selesai), `file.edited`.
   Barisnya tetap di AGENTS.md sebagai penjelasan. Skill ini hanya merekomendasikan dan menyebutnya saat serah-terima; mengubah `opencode.json` atau menulis plugin butuh persetujuan user dan dikerjakan terpisah.
6. **Persetujuan.** Tampilkan ringkasan perubahan (yang ditulis, yang dipindah, yang dihapus) sebelum menimpa AGENTS.md yang sudah berisi. Jangan menghapus baris tanpa menyebutnya.
7. **Verifikasi:**
   - `node <skill-dir>/../advise/scripts/docs-health.mjs "<path-proyek>"`: ukuran, tautan rusak atau tanpa pemicu, dokumen yatim.
   - Semua perintah valid.
   - Semua path dalam backtick menunjuk ke file atau folder yang ada. Glob dan placeholder (`*`, `<modul>`) diabaikan; folder yang memang direncanakan dicatat sebagai pengecualian:
     `grep -oE '`[A-Za-z0-9_.-]+/[^` ]*`' AGENTS.md | tr -d '`' | grep -vE '[*<>]' | xargs -I{} sh -c 'test -e "{}" || echo "HILANG: {}"'`
   - Tidak ada duplikasi antara AGENTS.md, README, dan .pawang/.
   - Setiap file di `.pawang/` di atas 100 baris punya daftar isi di bagian atas, dan setiap file docs ditautkan langsung dari AGENTS.md (atau dari `.pawang/README.md` bila indeks kedua dipakai).
   - Aturan atribusi, tabel Project files, Proportional engineering, Communication, Commits, `## Commands`, dan `## Repository layout` masih ada, dan setiap file di tabel Project files benar-benar ada.
   - Section **Prinsip kerja** ada, 4 baris (kurang hanya bila sebuah baris dihapus lewat uji dan dicatat di `.pawang/decisions/`), dan tidak bertentangan dengan konvensi proyek yang sudah diputuskan user.
   - **Cara kerja** (maksimal 5 baris) hanya menyebut nama subagent atau skill yang ada di agent target; untuk banyak agent, pakai istilah peran.
   - **Batas** memuat Jangan dan Tanya dulu, satu baris per item.
   Kalau ada pemeriksaan yang gagal, perbaiki lalu jalankan ulang seluruh daftar ini dari awal sampai lolos, maksimal 2 putaran. Setelah itu serahkan dengan temuan yang tersisa disebutkan, jangan dinyatakan lolos. Kalau Node atau skrip `docs-health.mjs` tidak tersedia, lewati baris itu, periksa ukuran, tautan rusak, dan dokumen yatim secara manual, dan sebut hal itu saat serah-terima.
8. **Serahkan** dengan satu kalimat tentang apa yang ditulis dan apa yang dipindah, plus aturan mana yang sebaiknya ditegakkan lewat `permission` atau plugin hook. Sarankan `/advise` untuk audit drift setelah perubahan arsitektur, pemindahan folder, atau penggantian database atau library utama.

## Menguji baris perilaku

Cara kerja dan Prinsip kerja adalah hipotesis tentang perilaku agent. Uji dengan cara yang sama:

1. Pilih 2-3 tugas nyata dari proyek (satu bug, satu fitur kecil, satu tugas yang menggoda untuk melebar).
2. Jalankan agent dengan AGENTS.md lengkap, lalu tanpa satu baris yang diuji (satu baris per putaran).
3. Baris yang hasilnya tidak berbeda (tidak ada perbedaan alur, ukuran diff, atau kualitas verifikasi) dihapus. Baris yang mengubah perilaku dipertahankan. Jalankan putaran ini pada setiap model yang dipakai proyek, termasuk yang terkecil: baris yang sia-sia di model besar sering masih dibutuhkan model kecil, jadi baris baru dihapus bila hasilnya sama di semua model itu.
4. Kalau baris disesuaikan atau dihapus karena konflik dengan proyek, catat sebagai keputusan di `.pawang/decisions/`.

Baris paling rawan sia-sia: baris kedua Prinsip kerja (sederhana) dan baris kedua Cara kerja (jangan dispatch untuk perubahan kecil), karena model modern sering sudah berperilaku begitu. Jalankan uji ini saat skill pertama kali dipakai di proyek baru, dan ulangi kalau ganti model atau agent. Uji ini menjalankan agent beberapa kali, jadi tawarkan dulu ke user sebelum menjalankannya.

## Dari profil ke AGENTS.md

Profil dari `/adopt` atau `CONTEXT.md` adalah bahan mentah. Hanya yang memengaruhi perilaku agent yang masuk:
- Perintah: salin persis dari script yang ada (`package.json`), jangan menciptakan perintah.
- Alat yang terdeteksi (tes, E2E, MCP, skill): satu baris tentang cara memakainya atau kapan menjalankannya, bukan daftar inventaris.
- Ketidakcocokan yang sudah diputuskan user: masuk ke keputusan di `.pawang/decisions/`.
- **Prinsip kerja**: salin 4 baris dari template apa adanya, tidak perlu bahan dari profil. Sesuaikan hanya bila profil menunjukkan konflik (misalnya proyek sengaja memakai pola abstraksi tertentu, atau kebijakan tes berbeda); catat penyesuaiannya sebagai keputusan di `.pawang/decisions/`.
- Jangan menulis nilai env atau rahasia. Nama variabel boleh, itu pun hanya kalau agent perlu tahu.
- Kalau ada `.pawang/specs/documents/` (dari `/reference`): satu baris di peta dokumen per jenis dokumen ("baca sebelum mengubah fitur <jenis>"), plus satu baris Jangan di Batas: "Jangan mengubah teks atau tata letak dokumen tanpa memperbarui spesifikasinya dan menjalankan verifikasi `/reference`."
- Kalau file alur kerja Pawang di-ignore git (mode lokal, lihat `/adopt`), AGENTS.md harus aman untuk publik: tanpa penjelasan alur kerja, jalur adapter tersembunyi, atau daftar skill.

## Template AGENTS.md (file baru)

```markdown
# AGENTS.md

Jangan menambahkan atribusi AI pada commit atau PR. Pertahankan atribusi manusia yang asli.

## Ringkasan
<1-2 kalimat: aplikasi apa, untuk siapa, tahap apa>

## Project files
<tabel file standar: AGENTS.md, CONTEXT.md, DESIGN.md (bila ada UI), .pawang/conventions/, dan baris `.pawang/specs/` (satu spec per pekerjaan, tidak diubah setelah done); kolom isi, ditulis oleh, dibaca saat. Salin dari AGENTS.md paket; hanya daftarkan file yang ada>

## Cara kerja
- Tugas non-trivial: `explorer` (cari lokasi dan dampak) -> `implementer` (satu tugas per brief, daftar file eksplisit) -> `verifier` (test/E2E/check-layout) -> `reviewer` (diff vs AGENTS.md dan decisions) -> `/handoff`. Rinciannya di skill `agents`.
- Jangan dispatch untuk perubahan kecil satu file, tetapi perubahan itu tetap harus lolos tes dan tidak dinyatakan "sudah bagus" hanya dari penilaian penulisnya sendiri. Jangan jalankan dua `implementer` pada file yang sama.
- Verifikasi laporan subagent (jalankan ulang `git diff --stat`) sebelum menyatakan selesai.
- FAIL dari `verifier` atau BLOCKER dari `reviewer`: kembali ke `implementer` dengan temuan itu, maksimal 2 putaran, lalu berhenti, tulis `/handoff` (yang selesai dan yang menghambat), dan tanya user. Lanjutkan di sesi baru; jangan ganti model di sesi yang sudah buntu.
- Agent tidak commit tanpa persetujuan user. Sarankan pesan commit; commit dibuat lewat `/complete` setelah disetujui, atau otomatis hanya saat user menjalankan `/buildall`.

## Prinsip kerja
- Ragu soal format, cakupan, atau field sensitif: tanya dulu sebelum membangun. Konvensi yang sudah ada di codebase: ikuti, tidak perlu ditanyakan.
- Pilih solusi paling sederhana yang memenuhi kebutuhan. Abstraksi dan konfigurasi baru menunggu kebutuhan nyata.
- Setiap baris diff punya alasan dari tugas. Rapikan hanya import/variabel yang kamu tambahkan sendiri; temuan lain dilaporkan ke user, tidak diubah.
- Tetapkan kriteria sukses di awal. Untuk bug: tulis tes yang gagal (red) dulu, perbaiki, lalu jalankan tes baru dan tes yang sudah ada. Selesai berarti lulus.

## Proportional engineering
<salin dari paket apa adanya>

## Stack
<bahasa, framework, DB, library kunci>

## Commands
- Dev: `...`
- Typecheck: `...`
- Test: `...` (hapus bila belum ada)
- Lint: `...`

## Repository layout
<ditulis lewat /layout>

## Batas
Jangan:
- <larangan satu baris>

Tanya dulu:
- <tindakan yang butuh persetujuan user, satu baris>

## Baca bila relevan
- `.pawang/...`: baca saat ...
```

Untuk banyak agent atau agent tanpa subagent, ganti nama subagent dan skill di bagian Cara kerja dengan peran (cari lokasi, implementasi, verifikasi, tinjau), sesuai Target agent.

## Monorepo

Dipakai bila repo punya `apps/`, `packages/`, atau workspace, dan user minta AGENTS.md per folder. AGENTS.md bersarang TIDAK dibuat untuk semua folder, hanya yang punya sesuatu yang khas; file yang hanya mengulang root menambah beban perawatan dan bisa bertentangan dengan root setelah beberapa bulan.

### Proses

1. Jalankan `node <skill-dir>/scripts/monorepo-scan.mjs "<path-proyek>" --draft`. Skrip hanya membaca dan menilai tiap folder: `BUAT`, `TANYA`, `ADA`, `LEWATI`, masing-masing dengan buktinya.
2. Tampilkan ringkasannya ke user: folder BUAT beserta bukti, folder TANYA (default dilewati), folder LEWATI beserta alasan. Tunggu persetujuan sebelum menulis (Proses langkah 6).
3. Untuk tiap folder BUAT, mulai dari draf skrip. Cek setiap perintah benar-benar ada di `package.json` folder itu. Baris `TODO: konfirmasi` tetap TODO sampai user menjawab; jangan mengarang alasan atau kegagalan.
4. Di AGENTS.md root, tambahkan satu baris per file bersarang di peta dokumen, dengan pemicu: "`apps/api/AGENTS.md`: baca saat mengubah `apps/api`". Folder tingkat atas baru (mis. `infra/`) didaftarkan di `## Repository layout` lewat `/layout`, supaya tidak ditandai tidak sah.
5. Verifikasi dengan `docs-health.mjs` (memindai AGENTS.md di semua kedalaman).

### Kriteria: kapan folder dapat AGENTS.md sendiri

Cukup satu bukti kuat:

1. **Perintah operasional sendiri** (dev, deploy, migrate, `db:*`, seed, openapi). `build`, `lint`, `typecheck`, `test` generik tidak dihitung karena sudah jalan lewat root.
2. **Stack khusus** yang tidak ada di root (wrangler, drizzle-kit, Expo, Terraform, dan sejenisnya).
3. **Path terlarang**: `migrations/`, `drizzle/`, `generated/`, `*.tfstate`, `openapi.json` hasil generate.
4. **Kegagalan berulang khusus folder**: hanya dari konfirmasi user. Riwayat git (commit `fix:`/`revert:`) cuma kandidat, jadi bukti lemah.

Bukti lemah saja (`exports` di `package.json`, dependensi umum seperti React, riwayat git) berstatus `TANYA`. Tanpa bukti apa pun, folder dilewati: `lib` berisi fungsi murni biasa tidak butuh file sendiri.

### Isi: katalog bagian, bukan template per tipe folder

Judul `# AGENTS.md: <path>`, target 15-50 baris, bahasa mengikuti root. Pakai hanya bagian yang punya isi nyata, urutannya:

- `## Stack`: satu baris.
- `## Commands (jalankan dari folder ini)`: salin persis dari skrip folder itu; alat tanpa skrip ditulis `TODO: konfirmasi perintah`, jangan diciptakan.
- `## Batas`: **Jangan** dan **Tanya dulu**, satu baris per item.
- `## Konvensi`: hanya yang berbeda dari root dan tidak ditegakkan linter.
- `## Jebakan`: aturan dari kegagalan nyata, dengan komentar `Failure/Why/Outcome` (Outcome `TODO - confirm` bila belum dikonfirmasi).
- `## Baca bila relevan`: hanya bila ada dokumen khusus folder itu, dengan pemicu "baca saat ...".

### Pewarisan root ke folder

- Root memegang aturan atribusi, Cara kerja, Prinsip kerja, Proportional engineering, Communication, Commits, Writing, dan tabel Project files. File bersarang tidak mengulang bagian itu; `docs-health` menandai pengulangannya.
- File bersarang menambah, tidak menimpa. Bila terpaksa menimpa aturan root, tulis satu baris `Menimpa root: <aturan>. Alasan: <alasan>` dan catat keputusannya di `.pawang/decisions/`.
- Perintah ditulis relatif terhadap folder itu.
- Larangan yang tidak boleh bergantung pada kepatuhan agent (mis. `migrations/**`, `*.tfstate`) tetap direkomendasikan ke `permission` atau plugin hook (Proses langkah 5), bukan hanya teks.
- Cara agent memuat AGENTS.md bersarang berbeda antar agent (sebagian memuat saat bekerja di folder itu, sebagian memakai yang terdekat). Cek dokumentasi agent target dan jangan menjanjikan perilakunya.
- Batas ukuran bersarang di `docs-health`: WARN di atas 60 baris, ERROR di atas 100.

## Kesalahan umum

- AGENTS.md tumbuh jadi dokumen panjang yang jarang diperbarui.
- Tautan tanpa pemicu "kapan dibaca".
- Larangan penting hanya ada di .pawang/ dan tidak di AGENTS.md.
- Keputusan lama tidak ditandai Superseded.
- Memecah terlalu halus sampai agent harus membuka banyak file.
- Membuat AGENTS.md bersarang untuk semua folder, atau mengulang aturan root di dalamnya (jalankan `monorepo-scan.mjs` dulu; folder tanpa bukti kuat dilewati).
- Perintah atau tautan yang sudah tidak valid.
- Mencampur status pekerjaan sementara ke AGENTS.md (tempatnya `/handoff`, atau berkas spec di `.pawang/specs/` untuk pekerjaan yang sedang dibangun).
- Prinsip kerja membengkak jadi daftar aturan perilaku panjang, atau diubah jadi larangan berbunyi "jangan ..." (tulis sebagai target yang ingin dicapai).
- Prinsip kerja dihapus karena dianggap generik, atau diulang di .pawang/ dan app (sumber kebenarannya hanya di AGENTS.md root).
- Mengganti nama heading `## Commands` atau `## Repository layout`, sehingga `/ci`, `/tests`, dan `/layout` tidak menemukannya.
- Menyebut subagent atau skill yang tidak terpasang di agent target.
- File docs di atas 100 baris tanpa daftar isi, atau file docs yang hanya bisa dicapai lewat file docs lain.
- Menyalin isi AGENTS.md ke file khusus per agent (`CLAUDE.md`, aturan Cursor, dsb.) sehingga ada dua sumber kebenaran yang bisa berbeda. Pakai penunjuk, bukan salinan.

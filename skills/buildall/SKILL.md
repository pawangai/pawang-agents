---
name: buildall
description: Membangun banyak fitur dari daftar Features di CONTEXT.md berturut-turut tanpa jeda persetujuan per fitur, setiap fitur lewat siklus feature, implement, check, complete secara lokal. Hanya dipakai saat user menjalankan /buildall secara eksplisit.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# buildall - bangun fitur berurutan dari CONTEXT.md

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Jalur normal berhenti untuk persetujuan di setiap fitur. Skill ini untuk saat `CONTEXT.md` sudah disetujui user dan sisanya tinggal dibangun. Setiap fitur tetap melewati siklus yang sama, dengan spec, branch, verifikasi, dan commit sendiri dengan ringkasan spec dan trailer `Feature:`. Yang hilang hanya jeda persetujuan antar tahap.

    CONTEXT.md (sudah disetujui)  ->  [buildall]  ->  per fitur: spec -> implement -> gate -> complete  ->  fitur berikutnya

## Yang diizinkan oleh menjalankan /buildall

Menjalankan `/buildall` adalah persetujuan eksplisit untuk, dan hanya untuk:

- menyetujui spec tiap fitur atas nama user (daftar fiturnya sudah disetujui di `CONTEXT.md`)
- membuat branch per fitur dengan prefix dari `.agents/pawang.json`
- commit checkpoint, satu commit kerja per fitur, squash merge lokal ke branch default, dan menghapus branch fitur yang sudah ter-merge
- menjalankan perintah lokal yang sudah ada di `Commands` pada `AGENTS.md`

Tidak diizinkan, apa pun isi `CONTEXT.md`: push, pull request, deploy, publish, mengirim sesuatu, mengubah layanan jarak jauh, membuat akun atau resource cloud, menjalankan migrasi jarak jauh, menghapus data, menghapus file di luar yang dibuat fitur itu, mengabaikan temuan atau cek yang gagal, dan keputusan produk yang tidak tertulis di rencana.

## Input

- `/buildall`: semua butir belum tercentang, berurutan.
- `/buildall 3`, `/buildall 3-6`: hanya nomor itu.
- `/buildall plan`: hanya tampilkan urutan, jumlah, dan hal yang kemungkinan memblokir. Tidak menulis apa pun.
- `/buildall max 5`: berhenti setelah 5 fitur selesai.

## Sebelum mulai (satu kali)

Baca `.agents/pawang.json` (file tidak ada berarti default; file tidak valid berarti berhenti dan minta user memperbaikinya). Pakai `buildAll.maxFeatures`, `buildAll.maxRepairAttempts` (default tanpa batas dan 2), `buildAll.maxMinutes` (default 120, anggaran waktu dinding untuk seluruh run), dan `buildAll.finalIntegrationAudit` (default `false`). Catat waktu mulai saat run dimulai; sebelum memulai tiap fitur, periksa apakah sisa waktu masih cukup. Bila tidak, berhenti sebelum menyentuh fitur itu.

Berhenti dan laporkan, tanpa mengubah apa pun, bila salah satu ini tidak terpenuhi:

1. Bagian `## Features` di `CONTEXT.md` berisi butir bernomor dan ber-checkbox, dan bagian 1-8 sudah terisi (bukan template). Kalau belum, arahkan ke `/context`.
2. `git.landing` bernilai `local-merge`. Nilai `pull-request` butuh push, yang tidak diizinkan di sini.
3. Working tree bersih dan HEAD berada di branch default. Pekerjaan lain yang belum selesai jangan dicampur.
4. Tidak ada spec aktif di `.pawang/specs/` (tidak ada file yang `**Status:**`-nya bukan `done`; lihat `.agents/README.md`, bagian "Specs"). Kalau ada spec aktif, lanjutkan itu dulu lewat `/implement` atau `/complete`, atau minta user memutuskan. Cek juga penyelesaian yang terputus lewat bagian `Resuming` di `<skill-dir>/../complete/SKILL.md`.
5. Ada perintah Verify, atau paling tidak typecheck dan build di `Commands`. Tanpa itu tidak ada bukti per fitur; sarankan `/tests` atau `/ci`.
6. Bagian 4 (Stack) di `CONTEXT.md` menyebut stack dan layanan yang akan dipakai. Dependensi atau layanan di luar yang disebut di sana dianggap keputusan yang belum diambil.

Tampilkan satu baris rencana (jumlah fitur, rentang, batas) lalu mulai. Tidak perlu menunggu jawaban, karena menjalankan perintah ini sudah merupakan persetujuannya.

## Satu putaran per fitur

Ikuti skill yang sudah ada, jangan menggandakan isinya. Baca skill terkait hanya saat tahap itu dimulai.

1. **Pilih** butir belum tercentang pertama dalam rentang. Cek apakah ia bergantung pada butir yang belum selesai; bila ya, urutan di `CONTEXT.md` yang salah, jadi berhenti dan laporkan.
2. **Spec**: ikuti `<skill-dir>/../feature/SKILL.md` sampai file spec fitur itu ada di `.pawang/specs/`. Anggap spec disetujui. Bila spec butuh keputusan produk yang tidak ada di rencana, itu kondisi berhenti, jangan menebak.
3. **Implement**: ikuti `<skill-dir>/../implement/SKILL.md`: branch fitur, langkah satu per satu, tes sempit di setiap langkah. Tidak ada jeda review per langkah.
4. **Gate** sesuai `qualityGates.regular` di config. Gate berstatus `manual` dilewati. Gate yang otomatis dijalankan lewat skill masing-masing (`check`, `audit`). Fitur dengan UI membaca `DESIGN.md`; bila butuh token baru, itu kondisi berhenti dan user menjalankan `/design`.
5. **Perbaiki**: kegagalan Verify atau temuan P0/P1 diperbaiki lewat `implement` paling banyak `maxRepairAttempts` kali per fitur. Setelah itu berhenti.
6. **Complete**: ikuti `<skill-dir>/../complete/SKILL.md`: gate akhir, centang di `CONTEXT.md`, satu commit kerja (ringkasan spec dan trailer `Feature:`), squash merge lokal, hapus branch fitur. Menjalankan `/buildall` sudah merupakan persetujuan untuk merge lokal, jadi pertanyaan pendaratan dilewati. Semua pemeriksaan bukti di skill itu tetap berlaku.
7. Konfirmasi centang butir di `CONTEXT.md` dan spec fitur itu berstatus `done` (tidak ada lagi spec aktif), lalu lanjut ke butir berikutnya. Jangan membawa isi fitur sebelumnya; baca ulang hanya yang dibutuhkan fitur berikutnya.

## Kondisi berhenti

Berhenti di fitur itu, tinggalkan kondisi yang bisa dilanjutkan, dan laporkan:

- keputusan produk atau teknis yang tidak ada di rencana, atau spec yang ambigu atau kontradiktif
- butuh dependensi atau layanan di luar bagian Stack `CONTEXT.md`
- butuh rahasia, variabel lingkungan, akun, atau resource jarak jauh yang belum ada
- Verify gagal setelah `maxRepairAttempts`, atau temuan P0/P1 masih `open` atau `fixed`
- konflik merge, working tree kotor di luar fitur, atau bukti penyelesaian yang tidak konsisten
- fitur butuh token atau aturan visual yang belum ada di `DESIGN.md`
- batas `maxFeatures`, `max N`, atau `maxMinutes` tercapai

Hal yang bukan alasan berhenti: pertanyaan yang jawabannya sudah ada di `CONTEXT.md`, `DESIGN.md`, `.pawang/conventions/`, atau codebase. Jawab sendiri dan lanjut.

## Melanjutkan

Progres hidup di file dan git, bukan di chat: centang di `CONTEXT.md`, file spec aktif di `.pawang/specs/` dengan langkah tercentang, branch, dan `git log`. Menjalankan `/buildall` lagi melanjutkan dari titik itu. Fitur yang sedang aktif diselesaikan dulu lewat skill `implement` dan `complete`, baru lanjut ke butir berikutnya.

## Akhir

Bila `buildAll.finalIntegrationAudit` bernilai `true` dan semua butir dalam rentang selesai, jalankan satu `audit` seluruh proyek dan laporkan temuannya tanpa memperbaiki sendiri.

Laporan akhir singkat: tabel fitur (selesai, berhenti, belum), commit yang dibuat, temuan terbuka, dan satu langkah berikutnya (misalnya `/release` atau memperbaiki penyebab berhenti). Tidak ada push atau deploy; bila perlu, itu langkah user.

## Aturan

- Satu fitur aktif pada satu waktu, serial. Jangan menjalankan dua fitur paralel di checkout yang sama.
- `/buildall` mengabaikan `git.commit` dan `git.merge` karena menjalankannya sudah menjadi persetujuan. Ini tidak pernah push, apa pun nilai `git.push`. Branch fitur dihapus setelah merge kecuali `git.branchCleanup` bernilai `keep`.
- Jangan melonggarkan cek yang gagal supaya lanjut. Berhenti lebih murah daripada membangun di atas fondasi rusak.
- Jangan mengubah `CONTEXT.md` selain mencentang butir yang selesai; spec hanya ditulis ke file `.pawang/specs/` fitur yang sedang dibangun. Butir baru atau pemecahan butir adalah keputusan user. Jangan mengubah `DESIGN.md`.
- Jangan menambahkan atribusi AI ke commit.

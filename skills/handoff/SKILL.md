---
name: handoff
description: Membuat catatan handoff di akhir sesi (saat fitur selesai, user mau menutup sesi, atau minta ringkasan) dan melanjutkan pekerjaan dari catatan itu di sesi baru. Menyimpan ringkasan ke .pawang/handoff/<topik>.md dengan menimpa file topik yang sama, dan menyertakan prompt hemat siap copy-paste. Gunakan juga saat user bilang "lanjutkan" atau "lanjut dari sesi sebelumnya".
disable-model-invocation: true
---

# Handoff

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Tujuan: sesi baru bisa melanjutkan pekerjaan dengan konteks sekecil mungkin. Riwayat percakapan panjang tidak perlu dibawa.

Handoff itu sementara. Aturan permanen tempatnya AGENTS.md atau `.pawang/` (jaga AGENTS.md tetap ringkas, tautkan detail ke `.pawang/`).

## A. Di akhir sesi: membuat handoff

1. Tentukan nama topik (kebab-case), misalnya `modul-supplier`. Satu file per topik.
2. Kumpulkan fakta dari repo, bukan dari ingatan: jalankan `git status`, `git diff --stat`, `git log -3 --oneline`, dan hasil test terakhir kalau ada.
3. Tulis ke `.pawang/handoff/<topik>.md`. Kalau file itu sudah ada, TIMPA. Jangan membuat file baru bernomor, dan jangan menimpa topik lain.
4. Format, maksimal sekitar 300-500 kata, tanpa dump kode:

```markdown
# Handoff: <topik>
Diperbarui: <tanggal-jam> | Branch/commit: <nama / hash>

## Tujuan
<1-2 kalimat>

## Sudah selesai
- <hal + file utama>

## Kondisi sekarang
<apa yang jalan, apa yang rusak, hasil test terakhir. Tandai dengan jelas mana yang SUDAH diverifikasi dan mana yang BELUM>

## Langkah berikutnya
1. <konkret, dengan file target>

## Keputusan baru
- <keputusan + alasan>

## Masalah terbuka
- <hal yang belum jelas>
```

5. Promosikan keputusan permanen. Untuk setiap item di "Keputusan baru" yang berlaku seterusnya, buat/tambahkan ke `.pawang/decisions/NNNN-judul.md` (Status: Accepted) — folder itu milik `handoff`. Larangan keras yang harus masuk `AGENTS.md` diserahkan ke `/agents-md`, bukan ditulis sendiri. Jangan biarkan keputusan permanen hanya ada di handoff, karena file ini akan ditimpa.
6. Pastikan `AGENTS.md` punya baris peta dokumen untuk `.pawang/handoff/<topik>.md`. Kalau belum ada, jalankan `/agents-md` dan minta baris itu ditambahkan; `AGENTS.md` bukan milik skill ini.
7. Di pesan penutup ke user, berikan prompt hemat dalam blok kode yang bisa langsung disalin:

```
Baca AGENTS.md dan .pawang/handoff/<topik>.md.
Verifikasi dulu kondisi repo dengan `git status` dan `git diff --stat`.
Lanjutkan langkah 1: <deskripsi>.
Hanya sentuh file: <daftar>.
Jangan memindai seluruh repo.
```

8. Tulis juga satu kalimat: "Cek bagian Kondisi sekarang dan Langkah berikutnya sebelum menutup sesi." Ringkasan buatan AI bisa keliru, jadi user perlu skim.

## B. Di awal sesi lanjutan: membaca handoff

1. Baca AGENTS.md lalu `.pawang/handoff/<topik>.md`.
2. Bandingkan dengan kondisi sebenarnya (`git status`, `git diff --stat`, `git log`). Kalau commit/branch berbeda dari header atau ada perubahan yang tidak tercatat, katakan itu ke user sebelum bekerja. Jangan mempercayai catatan yang bertentangan dengan repo.
3. Kerjakan hanya "Langkah berikutnya" yang diminta user. Baca file lain hanya kalau diperlukan.

## C. Setelah topik selesai total

Hapus file handoff-nya, atau pindahkan ke `.pawang/handoff/_archive/` — subfolder di dalam folder yang skill ini miliki, jadi tidak butuh baris pemilik baru. Pastikan keputusan permanen sudah dipromosikan (langkah A.5).

## Kesalahan umum

- Ringkasan menjadi panjang dan berisi potongan kode.
- Menulis status dari ingatan tanpa memeriksa repo.
- Keputusan permanen hilang karena handoff ditimpa.
- Satu file handoff global untuk semua topik.
- Handoff usang dipercaya tanpa verifikasi.

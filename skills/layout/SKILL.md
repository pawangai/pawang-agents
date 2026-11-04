---
name: layout
description: Menentukan, mengaudit, dan merapikan letak folder dan penamaan file (mis. script-judul.js jadi scripts/judul.js, packages/database, shared/ui), serta menulis section Repository layout di AGENTS.md. Gunakan saat merapikan struktur atau membuat aturan penempatan file.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# Layout

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Tujuan: setiap jenis file punya satu tempat dan satu aturan nama, sehingga repo tetap rapi walau banyak agent dan sesi yang menulis kode.

Aturan teks saja mudah dilanggar. Karena itu ada tiga lapis: **aturan** (section `## Repository layout` di AGENTS.md, dibaca setiap sesi), **audit** (`scripts/check-layout.mjs`, deterministik), dan **perapian** (memindahkan file yang sudah berantakan, dengan persetujuan).

## Prinsip

1. **Letakkan menurut peran.** Satu jenis file, satu tempat.
2. **Folder adalah namespace.** Nama file tidak mengulang nama folder: `scripts/seed-users.mjs`, bukan `script-seed-users.mjs`.
3. **kebab-case** untuk file dan folder (`seed-users.mjs`). Pengecualian yang sah: komponen React/Vue/Svelte boleh PascalCase, hook boleh `useXxx`, file khusus alat (`README.md`, `AGENTS.md`, `Dockerfile`, `wrangler.jsonc`) mengikuti alatnya, dan file rute framework (`__root.tsx`, `$id.tsx`, `+page.svelte`). Kalau repo sudah punya gaya dominan yang konsisten, ikuti itu dan catat di AGENTS.md.
4. **Nama menjelaskan isi.** Skrip memakai pola kata-kerja-objek (`seed-users`, `migrate-db`). Dilarang nama sementara atau duplikat: `final`, `copy`, `backup`, `old`, `new`, `temp`, `draft`, `v2`, `test2`, dan nama generik `utils`, `helpers`, `misc`, `common`. `check-layout` melaporkan nama-nama ini sebagai WARN, bukan ERROR; `--strict` yang menjadikannya gagal. Daftar lengkapnya ada di `references/layout-rules.json` (`forbidden_words`) — ubah di sana, bukan di dua tempat.
5. **Root bersih.** Root hanya berisi konfigurasi, dokumen standar (`AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `README.md`), dan folder tingkat atas yang terdaftar di `## Repository layout`. `check-layout` juga menerima folder umum yang lazim (`docs`, `public`, `assets`, `migrations`, `drizzle`, `supabase`, `prisma`, `src`, `scripts`, `tests`, `e2e`) lewat `root_allowed_dirs.common` di `references/layout-rules.json`; daftarkan yang benar-benar dipakai proyek ke section itu, atau hapus dari `common`. Dokumen standar di root tidak dipindah ke folder; `.pawang/rules.md` dan `.pawang/conventions/` memang berada di `.pawang/`. Tidak ada file kode di root.
6. **Jangan spekulatif.** Folder baru dibuat saat file pertamanya ada. Jangan memecah jadi package sebelum ada konsumen kedua.
7. **`shared` bukan tempat sampah.** Isinya harus bertema (`ui/`, `design-system/`, `lib/`). Kode yang hanya dipakai satu app tetap di app itu. Naik ke `shared` saat dipakai dua app.

## Preset

Pilih satu, konfirmasi ke user kalau ambigu, lalu patuhi.

**Aplikasi tunggal** (satu deployable, atau prototype):
```
src/            kode aplikasi (routes, components, lib, db)
scripts/        skrip satu tujuan: seed, migrasi data, utilitas dev
tests/          unit dan integration
e2e/            test E2E
.pawang/           spesifikasi, keputusan, konvensi, handoff
```

**Monorepo** (dua deployable atau lebih, atau kode bersama):
```
apps/<nama>/                satu deployable; wrangler.jsonc ada di sini
packages/
  database/                 skema, migrasi, klien DB, seed
  contracts/                skema dan tipe kontrak antar app (tanpa logika)
  shared/
    ui/                     komponen UI bersama
    design-system/          token, tema, primitif
    lib/                    utilitas murni per tema (lib/dates, lib/money)
scripts/                    skrip level repo, satu tujuan per file
tests/  e2e/  .pawang/
```

Arah dependensi (tegakkan dengan alat kalau ada): `apps` boleh memakai `packages`; `packages` tidak mengimpor dari `apps`; `shared/ui` boleh memakai `shared/design-system`; `contracts` tidak bergantung pada paket lain; `database` tidak bergantung pada UI. Alat yang cocok: Fallow (kalau terpasang; README-nya menyebut deteksi pelanggaran batas arsitektur), dependency-cruiser, atau `eslint-plugin-boundaries`. Jangan menjanjikan konfigurasi spesifik sebelum memeriksa dokumentasi alatnya.

## Mode

### 1. Define: menulis aturan
1. Ambil profil dari AGENTS.md dan `CONTEXT.md` (monorepo atau bukan, jumlah deployable, stack). Kalau belum ada, tanya user lewat skill `interview`.
2. Pilih preset. Tanyakan hanya kalau ambigu (satu pertanyaan).
3. Tulis section berikut ke AGENTS.md. Hanya folder yang sudah ada atau segera dibuat. Maksimal sekitar 15 baris:

```markdown
## Repository layout
Preset: <aplikasi tunggal | monorepo>.

| Lokasi | Isi | Aturan |
|---|---|---|
| `apps/<nama>/` | satu deployable | `wrangler.jsonc` di sini |
| `packages/database/` | skema, migrasi, klien DB, seed | hanya di sini |
| `packages/contracts/` | skema dan tipe kontrak antar app | tanpa logika |
| `packages/shared/ui/` | komponen UI bersama | memakai design-system |
| `packages/shared/design-system/` | token, tema, primitif | |
| `scripts/` | skrip satu tujuan | `scripts/<kata-kerja-objek>.mjs` |

Penamaan: kebab-case. Folder adalah namespace (jangan ulangi nama folder di nama file). Kata terlarang: lihat `forbidden_words` di `references/layout-rules.json`; `check-layout` memberi WARN dan `--strict` menggagalkannya.
Sebelum membuat file baru: tentukan lokasinya dari tabel ini. Kalau tidak ada yang cocok, tanya user lewat skill `interview`. Jangan membuat folder baru di root.
```

Folder tingkat atas yang tertulis dalam backtick di section ini otomatis dianggap sah oleh skrip audit.

### 2. Audit: memeriksa
```
node <skill-dir>/scripts/check-layout.mjs "<path-proyek>"
```
Skrip hanya membaca. Ia melaporkan: file kode di root, awalan yang mengulang nama folder (`script-judul.js` di `scripts/`), nama sementara/duplikat, gaya nama, nama generik, folder root yang tidak terdaftar (dengan saran tujuan, mis. `database` ke `packages/database`), paket tanpa `package.json`, dan kode langsung di `packages/shared`. Opsi: `--preset=single|monorepo`, `--all`, `--strict` (exit code 1 bila ada ERROR, untuk CI). Aturannya ada di `references/layout-rules.json`; ubah di sana, bukan di script.

Laporan adalah daftar temuan dan saran, bukan perintah. Sebagian temuan WARN bisa saja disengaja; tanyakan kalau ragu.

### 3. Tidy: memindahkan
Jangan memindahkan apa pun tanpa persetujuan user.

1. Jalankan audit, lalu susun rencana: tabel `dari -> ke`. Cari juga referensinya: `package.json` (scripts), `tsconfig` (`paths`, `include`), `wrangler` (`main`, `assets`), konfigurasi Vite/Vitest/Playwright, workflow CI, tautan di `.pawang/`, dan impor.
2. Tunjukkan rencana ke user. Kerjakan per kelompok kecil (misalnya semua skrip dulu, lalu database, lalu shared), bukan sekaligus.
3. Pindahkan dengan `git mv` supaya riwayat terjaga. Perbarui semua referensi dalam kelompok yang sama.
4. Verifikasi setelah tiap kelompok: typecheck, test unit, build, dan E2E bila terdampak (perintahnya dari bagian Commands di AGENTS.md). Kalau gagal, kembalikan kelompok itu dan laporkan; jangan lanjut.
5. Jangan mencampur perapian dengan perubahan fitur. Jangan menyentuh folder hasil generate atau vendor. Jangan menghapus file; kalau sebuah file tampak salinan, tanyakan.
6. Jangan commit (juga kalau izin `git commit` menolaknya). Sarankan satu commit per kelompok; user yang menjalankannya.
7. Setelah selesai, jalankan audit lagi dan pastikan section `## Repository layout` sudah sesuai kenyataan.

## Menegakkan terus-menerus
- Section di AGENTS.md adalah aturan untuk agent.
- Tambahkan `node <skill-dir>/scripts/check-layout.mjs . --strict` ke CI atau hook pra-commit kalau user mau pengaman keras.
- Aturan nama file juga bisa ditegakkan linter (misalnya `unicorn/filename-case` untuk ESLint). Periksa dokumentasi alatnya sebelum menulis konfigurasi.

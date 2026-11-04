# Review repo `pawang-agents` (v0.1.29)

Ditulis 2026-11-04. Ditinjau dari commit `8d07382` plus satu perubahan kerja yang belum di-commit (`.gitignore`).

> **Snapshot, bukan status sekarang.** Dokumen ini mencatat keadaan sebelum perbaikan, dan sengaja tidak saya perbarui supaya jejaknya tetap terbaca. Sebagian besar temuannya sudah ditutup di commit `436ec75`; lihat `CHANGELOG.md` bagian `Unreleased`. Satu label di sini terbukti terlalu tinggi: `agents/verifier.md` saya sebut Blocker, padahal perbaikannya sepele dan barisnya duduk di daftar yang berkasnya sendiri sebut "aturan kerja, bukan penegakan".

**Bukan Goldfish review.** Harness ini tidak punya tool subagent, dan `egm-review` mewajibkan setiap reviewer berjalan di konteks baru. Ini review konteks-tunggal: satu pembaca, satu set prasangka. Perlakukan sebagai penyaring awal, bukan audit.

## Status mesin

Yang saya jalankan sendiri:

| Perintah | Hasil |
| --- | --- |
| `node scripts/validate.mjs` | `OK: 32 skill, 33 command OpenCode` |
| `node scripts/check-version.mjs` | `OK: v0.1.29` |
| `npm test` (Node 26.13.0) | 31 tes, 31 lulus |
| `npm pack --dry-run` | 156 berkas, 251.8 kB |

Semua hijau. Itu penting, dan juga batas dari review ini: 31 tes mengukur **konsistensi internal** repo, bukan apakah hasilnya benar di harness sungguhan. Repo sendiri mengakui itu (`docs/harnesses.md:17`, `CHANGELOG.md:26`). Jadi bagian di bawah menyerang hal yang tidak bisa ditangkap tes yang ada.

---

## 🔴 Blocker

### 1. `agents/verifier.md` memuat path yang tidak bisa diresolusi, dan path itu salah

Berkas hasil build, baris 22:

```
- Diizinkan: `git status*`, ..., `node <skill-dir>/../<skill>/scripts/check-layout.mjs*`,
  `node <skill-dir>/../<skill>/scripts/compare-text.mjs*`, `node <skill-dir>/../<skill>/scripts/docs-health.mjs*`.
```

Tiga masalah sekaligus:

- `<skill-dir>` tidak pernah didefinisikan di berkas agent mana pun. `grep -c "Paths:" agents/*.md` menghasilkan 0 untuk keempat agent. Repo punya aturan bahwa setiap teks yang memakai `<skill-dir>` wajib menjelaskannya (`docs/harnesses.md:39`), tapi `validate.mjs` hanya menegakkan aturan itu untuk `skills/`, tidak untuk `agents/`.
- `<skill>` adalah placeholder literal, bukan nama. Subagent tidak bisa menebak bahwa `check-layout.mjs` ada di `layout`, `compare-text.mjs` di `reference`, `docs-health.mjs` di `advise`. Ketiganya skill yang berbeda.
- Penyebabnya `scripts/build-plugin.mjs:45`: `p.replace('node .agents/skills/*/scripts/', 'node <skill-dir>/../<skill>/scripts/')`. Tanda `*` dari glob OpenCode diubah menjadi placeholder yang tidak punya arti di sisi penerima.

Tes `'adapter agent: path skrip tidak memakai .agents/skills'` lulus justru karena penggantian ini terjadi. Tes mengunci kerusakan, bukan mencegahnya.

Perbaikan: petakan pola ke path nyata, atau hapus tiga pola itu dari allowlist turunan dan cukup tulis nama skillnya. Tambahkan pemeriksaan `validate.mjs`: berkas di `agents/` yang memakai `<skill-dir>` wajib punya catatan Paths, sama seperti skill.

### 2. `parseAgent` gagal-terbuka untuk izin edit

`scripts/build-plugin.mjs:42`:

```js
if (a.edit !== 'deny') tools.push('Edit', 'Write');
```

Kunci `edit:` yang hilang menghasilkan `undefined`, dan `undefined !== 'deny'` bernilai benar. Artinya agent mana pun yang lupa menulis `edit:` otomatis mendapat `Edit, Write` di Claude Code. Sekarang ini tidak terlihat karena hanya `build.md` (dilewati) dan `implementer.md` (memang boleh edit) yang tidak punya kunci itu. Satu agent baru dengan `edit: ask`, atau yang lupa menulis izin, akan mendapat akses tulis tanpa ada yang gagal.

Perbaikan: `if (a.edit === 'allow')` dan gagalkan build bila kunci `edit` tidak ada. Kunci eksplisit lebih baik daripada default yang kebetulan benar.

### 3. Invarian inti repo hanya diverifikasi untuk satu dari empat harness

`validate.mjs:29-31` mewajibkan `disable-model-invocation: true` di 30 dari 32 skill. Itu keputusan desain yang masuk akal: skill Pawang adalah prosedur bertahap, bukan sesuatu yang model panggil sendiri.

Tapi efeknya hanya diklaim untuk Pi (`docs/harnesses.md:19`, `README.md:65`). Tidak ada tes, tidak ada catatan verifikasi untuk Claude Code dan Codex — sementara `docs/harnesses.md:17` menyatakan pemuatan plugin di keduanya "belum diuji". Kalau harness mengabaikan kunci itu, 30 skill berubah menjadi bisa dipanggil model, dengan teks yang sama, dan tidak ada satu pun pemeriksaan yang memberi tahu. Kegagalannya senyap dan berlawanan arah dengan maksud repo.

Perbaikan: satu baris di `docs/harnesses.md` per harness yang menyatakan apakah kunci itu dihormati, dan penanda "belum diverifikasi" bila memang belum. Jangan biarkan invarian yang ditegakkan ketat di dalam repo punya efek yang tidak diketahui di luar repo.

---

## 🟡 Major

### 4. `package.json` mendaftarkan 4 dari 5 berkas turunan

`build-plugin.mjs` menghasilkan lima artefak: `agents/*.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, dan `.agents/plugins/marketplace.json`. Daftar `files` di `package.json` memuat empat yang pertama, tidak yang terakhir. Terverifikasi: `npm pack --dry-run` tidak menampilkan `.agents/plugins/marketplace.json`.

Hari ini tidak ada yang `npm publish`, jadi ini laten. Tapi `name`, `bin`, dan `files` sudah disiapkan untuk publikasi npm. Saat itu terjadi, katalog Codex hilang dari tarball tanpa peringatan.

### 5. Tidak ada `engines`, dan klaim versi Node saling bertabrakan

- `README.md:74`: installer butuh Node 18+.
- `README.md:150` dan `CONTRIBUTING.md:8`: tes butuh Node 22+.
- `package.json` tidak punya `engines` sama sekali.
- `npm test` memakai `node --test "tests/*.test.mjs"` dengan pola glob sebagai argumen. Node 21+ yang mengembangkannya; di Node 18 pola itu diperlakukan sebagai path literal.
- CI hanya menguji Node 22 (`tests.yml:10`).

Jadi klaim "Node 18+" untuk installer tidak pernah diuji, dan `npm test` yang didokumentasikan tidak bekerja di versi yang didokumentasikan untuk installer. Tambahkan `engines: { node: ">=22" }`, atau turunkan klaim README dan uji Node 18 di matriks.

### 6. `validate.mjs` tidak pernah membaca YAML

Semua frontmatter dibaca dengan regex: `^name:\s*(.+)$` dan `^description:\s*(.+)$` (`validate.mjs:23-24`).

Akibatnya, deskripsi yang ditulis sebagai blok lipat:

```yaml
description: >-
  Teks panjang
  dua baris
```

akan dilaporkan "description kosong" dan memblokir kontribusi yang sah. Sebaliknya, YAML tidak valid seperti `description: Pakai ini: untuk X` lolos regex dan baru gagal saat harness memuat skill — setelah CI hijau, di mesin pengguna.

Tidak ada tes yang menyatakan frontmatter benar-benar bisa diparse. Untuk 32 berkas yang ditulis tangan, ini celah nyata. Cukup tambahkan pemeriksaan kecil: tolak `: ` tanpa tanda kutip di nilai `description`, dan dukung bentuk blok.

### 7. Daftar larangan berkas rahasia hilang saat diterjemahkan ke Claude Code

Sumber OpenCode punya enam pola penolakan `.env*`/`.dev.vars*` per agent. `build-plugin.mjs:48` membuang pola-pola itu dari daftar `deny` (`!secret(r.pattern)`), dan tes `'adapter agent: batas shell turunan izin, tanpa pola rahasia'` justru **mengunci** pembuangan itu.

Di badan agent masih ada kalimat "Jangan membaca ... file rahasia", jadi aturannya tidak hilang sepenuhnya. Tapi:

- `tools: Read, Grep, Glob` mengizinkan pembacaan berkas apa pun. Tidak ada lapisan yang menegakkan.
- `docs/harnesses.md:54` memperingatkan bahwa pembatasan **shell** menjadi aturan kerja, bukan penegakan. Tidak ada kalimat setara untuk pembatasan **baca berkas**.
- Untuk pola shell, larangan `.env` memang redundan karena basisnya `"*": deny`. Untuk `implementer` dan `verifier` basisnya `"*": ask`, jadi di sana pembuangan itu mengubah arti: larangan tegas menjadi sekadar kebiasaan.

Perbaiki dokumentasinya minimal. Sebaiknya: jangan buang pola rahasia; tulis ulang sebagai kalimat larangan di badan agent, bukan dibuang diam-diam.

### 8. Installer tidak pernah menghapus berkas usang, dan tidak mencatat versi

`install.mjs:43-46` menyalin per berkas. Dengan `--force`, berkas baru menimpa berkas lama, tetapi berkas yang **dihapus** dari versi baru tetap tertinggal di proyek pengguna. Kalau sebuah skill menghapus `reference/lama.md` dan berhenti merujuknya, salinan lama tetap ada di `.agents/skills/<nama>/`, dan pengguna tidak punya cara tahu itu bukan bagian dari versi yang terpasang.

Ditambah: tidak ada berkas status atau versi di tujuan. Tidak ada `--upgrade`, tidak ada cara menjawab "versi Pawang apa yang ada di proyek ini" tanpa membaca isi berkas. Untuk paket yang mendorong pembaruan lewat marketplace dan rilis bertag, ketiadaan ini membuat jalur installer menjadi jalan buntu.

### 9. Prosa persona ada di tiga tempat, hanya satu yang dijaga

| Lokasi | Peran |
| --- | --- |
| `skills/pawang-init/assets/opencode/.opencode/agents/*.md` | sumber OpenCode, dipakai build |
| `skills/agents/assets/agents/*.md` | templat berplaceholder `{{READ}}`, `{{EDIT}}`, dipakai `install-agents.mjs` |
| `agents/*.md` | hasil build untuk Claude Code dan Codex |

Saya bandingkan isi badan keempat persona: identik hari ini. Yang tidak ada adalah tes yang menjaganya. `tests/build-plugin.test.mjs` hanya memeriksa hasil build terhadap sumber OpenCode; tidak ada yang memeriksa templat `skills/agents/assets/` terhadap sumber yang sama. Edit satu baris di satu tempat, dan versi yang dipasang lewat `install-agents.mjs` akan berbeda dari subagent plugin tanpa ada yang gagal.

Kalau templatnya memang perlu berbeda (karena placeholder), tambahkan tes: setelah placeholder diisi nilai tetap, badan harus sama dengan sumber OpenCode.

---

## 🟢 Nit dan jebakan

10. **`.gitignore` punya baris `*_report.md` yang belum di-commit, dan tidak ada yang menghasilkannya.** `grep -rn "_report.md" skills/` kosong. Baris itu sisa arsip sumber. Efek nyatanya: `.gitignore:5` menelan `critic_report.md`, `zoom_out_report.md`, `audit_report.md` (`git check-ignore -v` mengonfirmasi) — persis nama berkas keluaran `egm-review` dan alat review lain. Laporan review yang ditulis di dalam repo ini hilang dari `git status` tanpa peringatan.
11. **`dist/` tidak di-ignore, dan resep rilis memakai `git add -A`** (`README.md:160`). Jalankan `node scripts/pack.mjs` sekali sebelum commit rilis, dan dua ZIP masuk ke commit.
12. **`scripts/install.mjs` adalah `bin` tapi bermode 644 di git.** Lewat npm tidak masalah (npm menyetel bit-nya); `./scripts/install.mjs` langsung gagal.
13. **Alat build bergantung pada kode skill yang dikirim ke pengguna.** `build-plugin.mjs`, `validate.mjs`, `pack.mjs`, dan `install.mjs` semuanya mengimpor `walk` dari `skills/pawang-init/scripts/init.mjs`. Mengubah skrip skill bisa mematahkan build repo. Fungsi 9 baris itu lebih baik tinggal di `scripts/lib.mjs`.
14. **`check-version.mjs` tidak dipanggil `validate.mjs`.** Loop lokal yang didokumentasikan (`AGENTS.md`, `CONTRIBUTING.md`: build, validate, test) melewatkan satu pemeriksaan yang dijalankan CI (`tests.yml:12`).
15. **Angka dan teks ganda tanpa penjaga.** "31 skill plus pawang-init" muncul di `README.md:3`, `package.json:5`, `CHANGELOG.md:11`. `DESCRIPTION` diduplikasi di `build-plugin.mjs:21`. Tidak ada tes yang gagal ketika skill ditambah. Sebuah tes yang membandingkan jumlah folder di `skills/` dengan angka di README akan murah dan menutup satu kelas drift.
16. **`release.yml:29` menghapus draft lama lewat `gh api --paginate` lalu `gh release create --verify-tag`.** Tidak ada langkah yang memverifikasi ZIP hasilnya bisa dimuat. Tes reproducible hanya berjalan lokal, tidak di CI rilis.

---

## Yang bertahan dari uji

Tiga hal ini saya coba cari celahnya dan tidak menemukannya:

- **Satu sumber kebenaran yang ditegakkan mesin.** `build-plugin.mjs --check` dipanggil dari `validate.mjs`, dan `tests/build-plugin.test.mjs` membandingkan byte hasil build dengan isi repo. Mengedit berkas turunan dengan tangan akan gagal. Ini yang membuat repo ini bisa dipercaya sebagai sumber kanonik, dan itu bukan hal sepele.
- **Versi punya satu sumber, ditegakkan dua kali.** `package.json` satu-satunya sumber; `build-plugin.mjs` menurunkannya ke semua manifest; `check-version.mjs` membandingkan lima tempat plus format tag dan kecocokan tag. Rantai ini utuh.
- **Installer menolak menimpa dan default ke dry-run.** `init.mjs:3`, `.gitignore` hanya ditambah baris yang kurang, berkas yang ada dilaporkan `exists` dan dilewati, ada tes untuk masing-masing. Untuk alat yang menulis ke repo orang lain, pilihan default ini tepat.

Yang tidak saya nilai sama sekali: apakah isi 32 prosedur skill itu benar sebagai alur kerja. Itu butuh reviewer per skill, bukan review repo.

---

## Urutan perbaikan yang saya sarankan

1. Perbaiki `show()` dan `agents/verifier.md` (temuan 1). Ini satu-satunya temuan yang mengirim instruksi salah ke pengguna hari ini.
2. Ubah `parseAgent` menjadi gagal-tertutup (temuan 2). Dua baris.
3. Putuskan apa yang harus terjadi pada `disable-model-invocation` di Claude Code dan Codex, lalu tulis keputusannya (temuan 3).
4. Tambahkan `engines` (temuan 5), `.agents/plugins/marketplace.json` ke `files` (temuan 4), dan `dist/` ke `.gitignore` (temuan 11). Tiga baris, tiga kelas bug.
5. Pindahkan `walk` ke `scripts/lib.mjs` (temuan 13), panggil `check-version.mjs` dari `validate.mjs` (temuan 14).
6. Tes: paritas templat persona (temuan 9), jumlah skill vs dokumentasi (temuan 15), frontmatter bisa diparse (temuan 6).
7. Putuskan nasib baris `*_report.md` (temuan 10). Kalau dibiarkan, sadari bahwa itu menelan laporan review siapa pun yang bekerja di repo ini.

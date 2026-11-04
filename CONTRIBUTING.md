# Berkontribusi

1. Ubah sumber di `skills/` (atau `scripts/`), bukan berkas turunan (`agents/`, manifest, katalog marketplace). Rujuk berkas skill lewat `<skill-dir>`, bukan `.agents/skills/<skill>/`.
2. Jalankan:
   ```sh
   node scripts/build-plugin.mjs
   node scripts/validate.mjs
   npm test          # Node 22+
   ```
3. Commit perubahan sumber dan berkas turunan dalam satu commit. Dengan mengirim kontribusi, Anda setuju kontribusinya berlisensi MIT.
4. Buka pull request dan isi templatnya. Jelaskan apa yang berubah dan kenapa; untuk perubahan perilaku skill, sebut skill dan harness yang terdampak.

## Bahasa

Satu berkas ditulis dalam satu bahasa. Bahasa boleh Indonesia atau Inggris, tetapi jangan mencampur keduanya di tengah kalimat atau paragraf.

- Prosa `SKILL.md` mengikuti bahasa berkasnya. Korpus sekarang campuran antar-berkas; itu dibiarkan, tidak diseragamkan sekaligus.
- `description` di frontmatter ditulis dalam satu bahasa, dengan satu pengecualian: satu kalimat penuh berbahasa Inggris di akhir boleh ditambahkan supaya model cocok pada permintaan berbahasa Inggris. Kalimat itu harus utuh, bukan fragmen atau istilah sisipan.
- Komentar skrip dan pesan galat ditulis dalam bahasa Indonesia, karena dibaca pengguna.

Aturan ini tidak ditegakkan mesin. `validate.mjs` hanya memastikan `description` ada dan tidak lebih dari 1024 karakter.

Rilis (pemelihara): ubah `version` di `package.json`, tambahkan bagian `## [X.Y.Z] - tanggal` di `CHANGELOG.md`, jalankan `node scripts/build-plugin.mjs`, commit, lalu beri tag `vX.Y.Z` dan dorong tag itu. Workflow langsung menerbitkan release berisi ZIP runtime, `SHA256SUMS.txt`, dan deskripsi dari CHANGELOG.

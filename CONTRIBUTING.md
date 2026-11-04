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

Rilis (pemelihara): ubah `version` di `package.json`, tambahkan bagian `## [X.Y.Z] - tanggal` di `CHANGELOG.md`, jalankan `node scripts/build-plugin.mjs`, commit, lalu beri tag `vX.Y.Z` dan dorong tag itu. Workflow langsung menerbitkan release berisi ZIP runtime, `SHA256SUMS.txt`, dan deskripsi dari CHANGELOG.

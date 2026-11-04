# Panduan agent untuk repo pawang-agents

Repo ini mengemas workflow Pawang sebagai skill dan plugin. Baca `docs/harnesses.md` sebelum mengubah struktur.

## Aturan

- Sumber kanonik adalah `skills/`, dipakai apa adanya oleh semua harness. Jangan menulis `.agents/skills/<skill>/...` di teks skill; pakai `<skill-dir>` (lihat `docs/harnesses.md`). Jangan mengedit `agents/`, `.claude-plugin/`, `.codex-plugin/`, atau `.agents/plugins/` dengan tangan; semuanya dihasilkan oleh `node scripts/build-plugin.mjs`.
- Setelah mengubah `skills/` atau `scripts/`, jalankan `node scripts/build-plugin.mjs`, `node scripts/validate.mjs`, dan `npm test` (Node 22+). Commit hasil build bersama perubahannya.
- Versi hanya diubah di `package.json`; lalu bangun ulang manifest.
- `interview` dan `pawang-skill-creator` milik repo `pawangai/pawang-skills`. Jangan tambahkan ke `skills/`; `validate.mjs` menolaknya.
- Jangan membuka pull request, commit, atau membuat tag tanpa persetujuan eksplisit manusia.
- Lisensi MIT. Jangan menambahkan kode atau aset dengan lisensi yang tidak kompatibel.
- Jangan menulis nilai rahasia ke berkas mana pun.

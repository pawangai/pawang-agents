---
name: agents
description: Memasang subagent explorer, implementer, verifier, dan reviewer di OpenCode dan menjelaskan siklus kerja fitur yang memakainya. Gunakan saat mengerjakan fitur non-trivial atau diminta memasang subagent.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# Agents

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Skill lain adalah prosedur (cara). Skill ini mendefinisikan pelaku (siapa mengerjakan, dengan izin apa) dan urutan siklusnya. Agent utama bertindak sebagai orkestrator: ia memutuskan, memberi brief, dan memeriksa hasil.

## Pasang subagent (sekali per proyek, atas persetujuan)
```
node <skill-dir>/scripts/install-agents.mjs "<path-proyek>"           # dry-run: tampilkan rencana
node <skill-dir>/scripts/install-agents.mjs "<path-proyek>" --apply   # setelah user setuju
```
Menulis `.opencode/agents/{explorer,implementer,verifier,reviewer}.md`. Agent yang sudah didefinisikan di file md atau di bagian `agent` pada `opencode.json` dilewati. Izin `implementer` (typecheck, lint, test) dan `verifier` (ditambah build, E2E, `check-layout`, `compare-text`, `probe`, `pdftotext`, `pdftoppm`, `compare`) diisi dari `package.json` dan lockfile, jadi manajer paket mengikuti proyek. Blok penolakan rahasia dan git berasal dari satu sumber di skrip supaya tetap sinkron antar agent. Minta user commit hasilnya. Format file subagent OpenCode (frontmatter `description`, `mode: subagent`, `permission`; body = prompt; aturan izin: yang cocok TERAKHIR menang) sudah dicek ke dokumentasi resmi, tetapi periksa ulang bila OpenCode berubah.

Peran:

| Agent | Tugas | Izin |
|---|---|---|
| `explorer` | riset kode, hasil ringkas dengan `path:baris` | hanya baca, bash hanya git baca |
| `implementer` | satu tugas sesuai brief | edit, bash minta konfirmasi |
| `verifier` | test, lint, E2E, check-layout, compare-text | tanpa edit, bash hanya perintah proyek |
| `reviewer` | diff vs AGENTS.md, keputusan Accepted, spesifikasi | hanya baca |

Semua menolak `.env*` dan `.dev.vars*` (read, edit, dan bash), `implementer` dan `verifier` juga menolak `git commit/push/--force/reset --hard`, dan tidak ada yang boleh memanggil subagent lain.

### Agent utama harus boleh memanggil subagent
Kalau `opencode.json` membatasi `task` pada agent `build` (pola `"*": deny` lalu allow per nama), keempat nama harus ada di daftar allow. Skrip memperingatkan bila ada yang kurang.

### Commit
Subagent tidak pernah commit (izin `git commit*` ditolak di `implementer` dan `verifier`). Commit hanya dilakukan agent utama sesuai aturan commit Pawang (`AGENTS.md#commits`), dengan persetujuan user.

## Router: tugas ke pelaku
| Tugas | Cara |
|---|---|
| Kecil (satu-dua file, jelas) | kerjakan langsung, tanpa agent; jalankan pemeriksaan sendiri |
| Belum tahu letak kode atau dampaknya | `explorer` (boleh beberapa paralel untuk area berbeda) |
| Fitur non-trivial | siklus lengkap di bawah |
| Fitur dokumen (invoice, kwitansi) | `/reference` untuk spesifikasi; verifikasi dengan `compare-text` |
| Merapikan struktur | `/layout` (agent utama, bukan paralel) |
| Butuh skill atau alat baru | `/advise` |

## Siklus fitur
Di proyek Pawang, siklus ini berjalan di dalam `/feature` (plan), `/implement` (implement), `/check` (verify), `/audit` (review), dan `/complete` (tutup). Skill ini hanya menyediakan pelaku dan izinnya; gate dan spesifikasi tetap milik command Pawang.

1. **Plan** (agent utama, ringkas): tujuan, kriteria selesai yang bisa diperiksa, file yang akan disentuh, dan untuk prototype alur tulis yang harus lolos E2E. Tanya user bila ambigu atau menyentuh lebih dari sekitar tiga file.
2. **Explore** (opsional): hanya bila ada area yang belum dipahami.
3. **Implement**: `implementer`. Paralel hanya bila himpunan file benar-benar terpisah; kalau tidak, berurutan.
4. **Verify**: `verifier` menjalankan typecheck, test, `check-layout --strict`, E2E untuk alur tulis, `compare-text` untuk dokumen. FAIL kembali ke implementer dengan keluaran verifier sebagai brief. Maksimal 2 putaran, lalu tanya user. Verifier jangan pernah memperbaiki.
5. **Review**: `reviewer`, hanya untuk perubahan non-trivial atau yang menyentuh database, auth, keputusan, atau dokumen. BLOCKER harus dibereskan dulu; SARAN dilaporkan ke user.
6. **Handoff dan tutup**: perubahan belum selesai atau akan dilanjutkan: jalankan `/handoff`. Keputusan baru: tulis ke `.pawang/decisions/`. Laporkan ke user: apa yang jadi, bukti verifikasi, temuan tersisa.

## Brief ke subagent
Subagent hanya tahu isi brief. Tulis: tujuan (satu kalimat), file dan docs terkait, yang sudah dikesampingkan atau diketahui, batasan (jangan sentuh apa), format hasil. Contoh singkat:

```
Tujuan: tambah filter tanggal di daftar invoice.
Baca: src/routes/invoices.tsx, .pawang/specs/invoices.md.
Sudah diketahui: komponen DateRange ada di packages/shared/ui.
Batas: jangan ubah skema DB. Hanya file di atas.
Hasil: daftar file diubah + perintah yang kamu jalankan.
```

## Aturan
- Hasil subagent adalah klaim. Orkestrator membaca keluaran verifier sendiri sebelum menyatakan selesai; jangan menulis "sudah lulus" tanpa bukti.
- Dispatch hanya bila menghemat konteks atau waktu (lihat "Proportional engineering" di AGENTS.md). Tugas kecil jangan.
- Izin native OpenCode (terverifikasi di dokumentasi dan `opencode debug agent`): izin global di `opencode.json` digabung ke tiap agent, aturan agent ditambahkan sesudahnya, dan aturan terakhir yang cocok menang. Rahasia untuk `read`/`edit` ditaruh di izin global; untuk `bash` deny rahasia dan git harus di AKHIR blok bash tiap agent, karena `"*": ask` milik agent menimpa deny global. Plugin `.opencode/plugins/permissions.js` hanya lapisan tambahan: ada laporan hook plugin tidak menjangkau subagent (issue #5894), jadi jangan diandalkan sendirian. Uji sekali setelah pemasangan: `@explorer` membaca `.dev.vars` dan `@implementer` menjalankan `cat .env`; keduanya harus ditolak.
- Biaya konteks: deskripsi subagent masuk ke daftar Task tool tiap sesi (4 baris pendek). Hapus agent yang tidak dipakai.
- Subagent baru atau perubahan izin lewat persetujuan user; user yang commit.

## MCP di opencode.json (hapus yang tidak dipakai)
Urutan kunci sama di tiga tempat: `mcp`, `tools`, dan `agent.<nama>.tools`. Untuk membuang satu MCP, hapus kunci yang sama di ketiganya (`<nama>` di `mcp`, `<nama>_*` di `tools` dan di tiap agent).

| Kelompok | Nama MCP | Akses |
|---|---|---|
| Repo | `github`, `git` | build |
| Dokumentasi library | `context7` | build, explorer, implementer |
| Uji browser | `playwright` | verifier |
| Supabase | `supabase` (read-only, ganti `project_ref`), `supabasedocs` | supabase: build; supabasedocs: build, explorer, implementer |
| Neon | `neon` (read-only), `neondocs` | neon: build; neondocs: build, explorer, implementer |
| Cloudflare | `cloudflare` (API, OAuth), `cfdocs` | cloudflare: build; cfdocs: build, explorer, implementer |

Nama sengaja tanpa garis bawah (`neondocs`, `supabasedocs`, `cfdocs`) supaya awalan tool-nya tidak tumpang tindih dengan `neon_*`, `supabase_*`, `cloudflare_*`.

## Batas
Skill ini tidak memaksa agent utama menjalankan siklus; ia mengikuti instruksi. Penegakan keras ada di izin tiap agent dan di CI (`check-layout --strict`, test).

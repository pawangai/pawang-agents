# Sinyal celah dan rekomendasi

Dipakai di langkah 2 `/advise`. Hanya rekomendasikan bila **ada bukti** (profil proyek (AGENTS.md dan `CONTEXT.md`), keluaran `docs-health.mjs`, handoff, atau kesalahan berulang di sesi). Kata kunci pencarian dibuat generik (nama teknologi saja), tanpa nama klien, pasien, atau perusahaan.

## A. Kesehatan docs dan AGENTS.md (dari `docs-health.mjs`)
| Sinyal | Rekomendasi | Bentuk |
|---|---|---|
| AGENTS.md > 100 baris | pecah jadi indeks + `.pawang/` | edit AGENTS.md |
| Tautan rusak, tautan tanpa pemicu, dokumen yatim | perbaiki peta dokumen | edit AGENTS.md |
| Keputusan tanpa `Status:` | tambahkan status | edit docs |
| Handoff > 14 hari | verifikasi, arsipkan, promosikan keputusan | `/handoff` |
| Skill terlihat agent > 10, atau deskripsi skill yang terlihat > 400 karakter | pangkas dan persingkat | hapus atau edit |
| Dua skill dengan deskripsi tumpang tindih | gabungkan atau perjelas pemicu | edit skill |

## B. Proses dan tooling (dari profil proyek (AGENTS.md dan `CONTEXT.md`))
| Sinyal | Rekomendasi | Bentuk |
|---|---|---|
| Tidak ada test, atau script `test` tanpa file test | siapkan test unit | tooling, bukan skill |
| Tidak ada CI | workflow dasar: lint, typecheck, test | tooling |
| Mode prototype tanpa E2E | E2E untuk alur tulis data | tooling + skill E2E bila ada |
| Fallow ada di dependensi tetapi tidak di CI atau script | gerbang `npx fallow audit` | tooling (sesuai dokumentasi Fallow) |
| File rahasia ada tetapi izin `opencode.json` belum melarang | `node <skill-dir>/scripts/harden-permissions.mjs <path>` | script (persetujuan user) |
| Ketidakcocokan stack-deploy (mis. SQLite native di Workers) | putuskan stack dengan user | keputusan, catat di `.pawang/decisions/` |
| Fitur dokumen (invoice, kwitansi) tanpa spesifikasi | `/reference` | skill yang sudah ada |
| Struktur folder berantakan | `/layout` | skill yang sudah ada |

## C. Pengetahuan teknologi (kandidat skill eksternal, lewat find-skills)
Cari hanya bila teknologinya benar-benar dipakai (ada di dependensi atau konfigurasi) dan agent terbukti kesulitan, atau proyek akan banyak memakainya.

| Sinyal di proyek | Kata kunci pencarian |
|---|---|
| `wrangler`, `wrangler.jsonc` | cloudflare workers, wrangler |
| `@tanstack/*` | tanstack router, tanstack query |
| `drizzle-orm`, D1 | drizzle orm, d1 database |
| `@playwright/test` | playwright e2e |
| `supabase` | supabase postgres |
| `vite`, `react` + UI banyak | frontend design, react performance |
| `tailwindcss`, `components.json` | tailwind, shadcn |
| `hono` | hono |
| Fallow, Biome, ESLint | (biasanya cukup dokumentasi alatnya; cek dulu skill bawaan paketnya) |

Catatan: sebagian paket sudah membawa skill sendiri (mis. Fallow menyebut skill bawaan di `node_modules/fallow/skills/fallow`). Periksa itu sebelum mencari di tempat lain.

## D. Alur berulang di proyek ini (kandidat skill buatan sendiri, lewat pawang-skill-creator)
Sinyal: prosedur yang sama dilakukan tiga kali atau lebih, atau muncul berulang di handoff atau "Masalah terbuka".
Contoh: "tambah modul CRUD baru lengkap dengan migrasi, API, UI, E2E", "tambah jenis dokumen baru", "rilis ke Workers dan verifikasi", "tambah entri seed".
Bukan kandidat skill: fakta statis (skema, konvensi, keputusan) -> `.pawang/`; aturan yang selalu berlaku -> satu baris di AGENTS.md; pemeriksaan yang bisa deterministik -> skrip atau CI.

## Format rekomendasi untuk user
| # | Temuan | Bukti | Rekomendasi | Bentuk | Biaya konteks | Usaha |
|---|---|---|---|---|---|---|
Maksimal 5-7 baris, urut dari dampak terbesar dan usaha terkecil. Kolom "Biaya konteks" diisi: tidak ada (.pawang/skrip/CI), kecil (satu baris AGENTS.md), atau ≈N token per sesi (skill baru yang terlihat agent, dari panjang deskripsinya; tidak ada bila disembunyikan `permission.skill` dan dijalankan lewat command).

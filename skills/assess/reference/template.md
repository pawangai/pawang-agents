# Template .pawang/assessments/<slug>.md

Satu file. Judul bagian dalam bahasa Inggris seperti di bawah, isi dalam bahasa user. Hapus petunjuk dalam `<...>` saat menulis.

```markdown
# Assessment: <judul singkat>

- **Slug:** <slug>
- **Tanggal:** <YYYY-MM-DD>
- **Sumber:** <URL yang sudah dibersihkan | teks yang ditempel | path repo>
- **Jenis:** kemampuan baru | perbaikan | penghematan | kepatuhan | eksplorasi
- **Verdict:** go | needs-clarification | kill

## Idea

**Asli:** "<kutipan, rahasia disamarkan>"
**Disajikan ulang:** <1-2 kalimat netral>
**Diusulkan oleh / pemicu:** <atau TBD:>

## Evidence

Keyakinan keseluruhan: tinggi | sedang | rendah

- **Pengguna dan permintaan:** <temuan> - [sumber | ASSUMPTION] (keyakinan)
- **Prior art:** <temuan> - [sumber | ASSUMPTION]
- **Konteks:** <temuan> - [sumber | ASSUMPTION]
- **Data dan batasan:** <temuan> - [sumber | ASSUMPTION]

### Evidence Against

- <alasan terkuat ide ini mungkin tidak layak> - [sumber | ASSUMPTION]

## Problem

**Pernyataan masalah:** <1-2 kalimat, ruang masalah>
**Pengguna / pemangku kepentingan:** <peran - kepentingan>
**Tujuan:** <hasil>
**Non-tujuan:** <di luar cakupan>
**Ukuran sukses:** <sinyal terukur> (titik awal: <nilai | tidak diketahui>)
**Biaya bila tidak dilakukan:** <atau tidak diketahui>

## Options

### A - <nama>
- **Sketsa:** <apa yang dialami pengguna>
- **Appetite:** kecil | sedang | besar
- **Trade-off:** <untung vs korban, risiko>
- **Lubang kelinci:** <risiko membengkak>

### B - <nama>
...

**Rekomendasi:** <opsi dan alasan terkait tujuan, atau tidak lanjut>
**Di luar cakupan (opsi terpilih):** <daftar>
**Asumsi yang harus divalidasi:** <daftar>

## Decision

| Kriteria | Nilai | Alasan |
| --- | --- | --- |
| Validitas masalah | kuat / cukup / lemah / tidak diketahui | ... |
| Kekuatan bukti | ... | ... |
| Nilai vs biaya bila tidak dilakukan | ... | ... |
| Kelayakan / appetite | ... | ... |
| Kecocokan strategis | ... | ... |
| Postur risiko | ... | ... |

**Alasan verdict:** <satu paragraf pendek merujuk tabel>

**Bila needs-clarification:** pertanyaan penghambat: <TBD: ...>; ulangi tahap: bukti | masalah | konsep

## Handoff ke /plan

<hanya bila go>
- **Masalah:** <satu kalimat>
- **Pendekatan:** <opsi terpilih>
- **Dalam / luar cakupan:** <ringkas>
- **Ukuran sukses:** <ringkas>
- **Pertanyaan terbuka yang dibawa:** <daftar>
```

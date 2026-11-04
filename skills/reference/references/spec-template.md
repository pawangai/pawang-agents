# Spesifikasi dokumen: <jenis>

Status: draft | dikonfirmasi user (<tanggal>)
Sumber referensi: <nama file, format, jumlah sampel> (file mentah tidak ada di repo)
Pemilik dokumen: <organisasi user>; wewenang memakai: ya
Tingkat kesamaan yang disepakati:
- L1 Konten: 100% identik (teks statis, urutan, label, angka contoh, format angka dan tanggal)
- L2 Struktur: identik (urutan blok, kolom tabel, posisi header/footer/tanda tangan, pemotongan halaman)
- L3 Visual: <toleransi dan catatan, mis. "font pengganti X karena font asli tidak tersedia">

Klasifikasi teks: [T] template tetap, [P] profil organisasi (config), [D] data transaksi, [C] hasil hitung.

## 1. Halaman
- Ukuran dan orientasi: <A4 portrait / lain> (sumber: terukur | perkiraan)
- Margin atas/kanan/bawah/kiri: <mm>
- Jumlah halaman pada sampel: <n>
- Multi-halaman: header/footer berulang? nomor halaman (format persis)? tabel boleh terpotong? blok yang tidak boleh terpotong (total, tanda tangan)?

## 2. Tipografi dan warna
| Elemen | Font | Ukuran | Gaya | Warna | Sumber |
|---|---|---|---|---|---|
| Judul | | | | | terukur / perkiraan |
| Isi | | | | | |
| Tabel (header, isi) | | | | | |
| Catatan kaki | | | | | |

Font pengganti bila font asli tidak tersedia: <nama + alasan>

## 3. Blok dari atas ke bawah
Untuk tiap blok: nama, posisi (urutan, kolom, perataan), isi (item bertanda [T]/[P]/[D]/[C]), aturan tampil (kondisional).

### 3.1 Header
- logo: [P] posisi, ukuran
- nama usaha, alamat, kontak: [P]
### 3.2 Judul dan nomor dokumen
### 3.3 Data penerima / pelanggan / pasien / PIC
### 3.4 Tabel rincian
### 3.5 Ringkasan nilai (subtotal, diskon, biaya tambahan, pajak, total, terbilang)
### 3.6 Informasi pembayaran (bank, rekening, atas nama)
### 3.7 Syarat dan ketentuan / pasal
### 3.8 Tanda tangan dan pengesahan
### 3.9 Footer

## 4. Teks statis [T] (verbatim)
Salin persis, termasuk tanda baca, huruf besar-kecil, nomor, dan bullet. Satu baris per kalimat atau butir.

| ID | Blok | Teks persis |
|---|---|---|
| T1 | 3.2 | |
| T2 | 3.7 | Pasal 1. ... |

Teks yang dibaca dari gambar: tandai (OCR) dan catat konfirmasi user di sini: <ya/belum>.

## 5. Field
| Kunci | Jenis | Tipe dan format | Contoh sintetis | Sumber data | Wajib | Aturan tampil |
|---|---|---|---|---|---|---|
| invoiceNumber | D | teks, pola <...> | | urutan sistem | ya | selalu |
| customerName | D | | | | | |
| companyName | P | | | pengaturan | | |
| bankAccount | P | | | pengaturan | | |
| discount | D | persen/nominal | | | tidak | tampil hanya bila > 0 |

## 6. Aturan hitung [C]
Tulis hanya yang terlihat di sampel. Jangan mengarang aturan pajak atau pembulatan.
- Subtotal = <rumus>
- Diskon = <rumus; dasar pengenaan>
- Biaya tambahan (subcharge) = <rumus>
- Pajak = <tarif; dasar pengenaan; sesuai sampel>
- Total = <rumus>
- Pembulatan: <aturan dari sampel>
- Terbilang: <bahasa, huruf besar awal, akhiran>

Contoh hitung dari referensi (dipakai sebagai uji, nilai sintetis):
| Komponen | Nilai |
|---|---|

## 7. Format
- Mata uang: <simbol, spasi, pemisah ribuan, pemisah desimal>
- Tanggal: <pola persis, bahasa bulan>
- Angka: <desimal, perataan di kolom>
- Nomor dokumen: <pola, sumber nomor urut, reset per bulan/tahun?>
- Bahasa dan zona waktu: <...>

## 8. Tabel rincian
Kolom (urutan, judul persis), lebar relatif, perataan per kolom, border, header berulang antar halaman, baris minimum/maksimum per halaman, perilaku teks panjang (wrap/potong), baris kosong.

## 9. Aset dan elemen khusus
- Logo: file, posisi, ukuran, pemilik. Letakkan di `.pawang/specs/documents/<jenis>/`.
- Tanda tangan: posisi, label, nama dan jabatan [P/D]. Gambar tanda tangan hanya bila disediakan penanda tangan yang sah.
- Cap/materai: hanya milik organisasi sendiri. Catat posisi saja.
- QR/barcode: isi dan tujuan verifikasi (harus mengarah ke verifikasi sungguhan).
- Watermark: <ada/tidak>

## 10. Kasus uji dari referensi
Data sintetis lengkap (JSON) yang mereproduksi referensi teranonimkan, plus keluaran yang diharapkan:
- `reference.anon.txt` (teks referensi teranonimkan) dan `reference.anon.png` (bila ada)
- hasil hitung yang diharapkan
Kasus tambahan: diskon 0, tanpa biaya tambahan, satu layanan, banyak layanan (pindah halaman), nama sangat panjang.

## 11. Keputusan implementasi
Target keluaran (PDF / HTML cetak / DOCX): <...>
Renderer: <...> (sudah dicek cocok dengan runtime deploy: ya/belum)
Lokasi template dan komponen: <...>

## 12. Pertanyaan terbuka
- <...>

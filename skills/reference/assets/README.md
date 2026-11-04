# Folder assets: tempat menaruh dokumen referensi

Taruh dokumen contoh di sini (PNG, JPEG, PDF, DOCX, HTML). Boleh dikelompokkan per jenis:

```
assets/
  invoice/        invoice-1.pdf, invoice-2.pdf
  kwitansi/       kwitansi.png
  sertifikat/     sertifikat.docx
  kontrak/        kontrak.pdf
```

Lalu minta agent: "baca dokumen referensi di assets dan buat spesifikasinya".

## Aturan

- **Isi folder ini tidak masuk git.** File `.gitignore` di sini mengabaikan semuanya kecuali README ini. Dokumen asli biasanya berisi data pribadi (nama pasien, NIK, alamat, rekening), jadi jangan di-commit.
- **Lebih dari satu sampel per jenis itu jauh lebih baik.** Dua atau tiga sampel membantu agent membedakan teks template (tetap) dari data (berubah).
- **Anonimkan kalau bisa.** Tutup nama, NIK, dan nomor pribadi sebelum menaruh file di sini. Tata letak dan teks template tidak terpengaruh.
- **Pakai file asli, bukan foto layar,** kalau ada. PDF dan DOCX memberi teks dan font yang akurat. Gambar hanya memberi perkiraan.
- **Hanya dokumen milik organisasimu** atau yang kamu berwenang memakainya.
- `_work/` dibuat otomatis oleh skrip untuk hasil ekstraksi dan render halaman. Isinya juga tidak masuk git dan boleh dihapus kapan saja.

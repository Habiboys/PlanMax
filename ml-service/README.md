# Smart Project Planner - ML Service

Layanan Machine Learning untuk mendeteksi blockers dalam tugas dan komentar proyek.

## Deskripsi

Layanan ini menggunakan NLP (Natural Language Processing) sederhana untuk menganalisis teks tugas dan komentar, mencari pola yang menunjukkan adanya hambatan (blockers) yang dapat memengaruhi progres proyek. Sistem ini diimplementasikan menggunakan FastAPI untuk menyediakan API yang dapat diakses oleh aplikasi web utama.

## Fitur Utama

1. **Deteksi Blocker**: Mengidentifikasi potensi hambatan dari teks deskripsi tugas dan komentar
2. **Analisis Komentar**: Menganalisis kronologi komentar untuk memahami perkembangan hambatan
3. **Deteksi Resolusi**: Mengidentifikasi indikasi bahwa hambatan telah diselesaikan
4. **Rekomendasi**: Memberikan saran tindakan berdasarkan tingkat kepercayaan deteksi

## Instalasi & Penggunaan

### Prasyarat

- Python 3.8+
- pip (Python package manager)

### Instalasi

1. Clone repositori ini
2. Buat virtual environment Python (disarankan):
   ```bash
   python -m venv venv
   source venv/bin/activate  # Untuk Linux/Mac
   # atau
   venv\Scripts\activate  # Untuk Windows
   ```
3. Instal dependensi:
   ```bash
   pip install -r requirements.txt
   ```

### Menjalankan Layanan

#### Menggunakan script start.sh:

```bash
chmod +x start.sh
./start.sh
```

#### Secara manual:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Endpoint API

- **GET /**: Info layanan
- **GET /health**: Pemeriksaan kesehatan layanan
- **GET /keywords**: Mendapatkan daftar kata kunci yang digunakan untuk deteksi
- **POST /detect-blockers**: Mendeteksi blocker dari teks
- **POST /analyze-comments**: Menganalisis komentar untuk menemukan blocker
- **POST /analyze-task**: Menganalisis task dan komentar untuk menemukan blocker

### Contoh Penggunaan

#### Mendeteksi Blocker dari Teks

```bash
curl -X POST "http://localhost:8000/detect-blockers" \
  -H "Content-Type: application/json" \
  -d '{"text": "Saya terhambat dalam menyelesaikan task ini karena menunggu respon dari tim backend.", "threshold": 0.2}'
```

#### Menganalisis Task dengan Komentar

```bash
curl -X POST "http://localhost:8000/analyze-task" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1,
    "name": "Implementasi UI Dashboard",
    "description": "Membuat komponen UI untuk dashboard berdasarkan desain Figma",
    "comments": [
      {"content": "Mulai implementasi komponen", "createdAt": "2023-06-01T10:00:00"},
      {"content": "Terhambat oleh dependensi library yang belum tersedia", "createdAt": "2023-06-02T11:00:00"},
      {"content": "Masih menunggu backend untuk menyediakan API", "createdAt": "2023-06-03T14:00:00"}
    ],
    "threshold": 0.2
  }'
```

## Dokumentasi API

Setelah menjalankan layanan, Anda dapat mengakses dokumentasi Swagger API di:

```
http://localhost:8000/docs
```

## Cara Kerja

Sistem deteksi blocker menggunakan pendekatan berbasis kosakata (lexicon-based) yang diperkaya dengan pembobotan TF-IDF dan analisis kalimat. Langkah-langkah utama dalam deteksi adalah:

1. **Preprocessing Teks**: Membersihkan dan menormalisasi teks
2. **Vectorisasi**: Mengubah teks menjadi representasi vektor menggunakan TF-IDF
3. **Deteksi Pola**: Menghitung kesamaan dengan kumpulan kata kunci blocker
4. **Analisis Konteks**: Memeriksa negasi, resolusi, dan urutan kronologis komentar
5. **Evaluasi Kepercayaan**: Menentukan tingkat kepercayaan prediksi
6. **Generasi Rekomendasi**: Menghasilkan saran tindakan berdasarkan hasil analisis

## Pengembangan Lanjutan

Beberapa ide untuk pengembangan di masa depan:

- Implementasi model machine learning yang lebih canggih seperti BERT atau GPT untuk meningkatkan akurasi
- Dukungan untuk analisis sentimen untuk mendeteksi frustrasi atau urgensi
- Integrasi dengan sistem notifikasi untuk peringatan dini
- Fitur pembelajaran berkelanjutan untuk meningkatkan akurasi seiring waktu
- Dukungan untuk bahasa tambahan

## Kontribusi

Jika Anda ingin berkontribusi pada proyek ini, silakan:

1. Fork repositori
2. Buat branch fitur (`git checkout -b feature/amazing-feature`)
3. Commit perubahan Anda (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## Lisensi

Didistribusikan di bawah Lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut. 
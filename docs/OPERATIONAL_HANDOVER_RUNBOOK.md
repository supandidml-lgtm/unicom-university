# Unicom University — Operational Handover & Runbook (Phase 19)

Dokumen serah terima operasional (*Operational Handover*) dan panduan penanganan insiden (*Runbook*) untuk Tim DevOps, SRE, dan Administrator Sistem Unicom.

---

## 1. Layanan & Tanggung Jawab Komponen

| Komponen | Port / Endpoint | Tanggung Jawab Operasional | Tindakan Jika Terjadi Kegagalan |
| :--- | :--- | :--- | :--- |
| **Backend API (`@unicom/api`)** | `4000` / `/api/v1` | Mengelola autentikasi, RBAC, anti-skip heartbeat, auto-grading ujian, audit trail, notifikasi. | Periksa log (`docker logs unicom-api`). Restart kontainer jika memory leak. Skala replika ke N+1. |
| **Frontend Web (`@unicom/web`)** | `3000` / `/` | Antarmuka pengguna (Dashboard, Video player, PDF reader, Exam modal, Admin console). | Periksa Next.js node runtime log. Pastikan koneksi ke API endpoint `/api/v1` tidak terblokir firewall. |
| **Worker (`@unicom/worker`)** | Background Daemon | Background job processing, AI grounded question generator, semantic text chunking. | Periksa queue depth di Redis. Restart worker process. |
| **PostgreSQL 16** | `5432` | Relational database (User, Program, Material, Exam, Progress, Audit logs). | Periksa ruang disk (`df -h`). Verifikasi status koneksi (`pg_isready`). |
| **Redis 7** | `6379` | Cache, distributed locking, BullMQ job queue. | Periksa penggunaan memori Redis (`redis-cli info memory`). Flush expired keys jika perlu. |

---

## 2. Standard Operating Procedures (SOP) Penanganan Insiden

### Insiden 1: Peringatan Anti-Skip False Positive pada Video
- **Gejala**: Trainee melaporkan video selesai ditonton namun status belum menjadi `COMPLETED`.
- **Diagnosa**: Periksa tabel `DBMaterialProgress` untuk melihat rekaman `watchedSegments`.
- **Resolusi**: Jika cakupan segmen unik mencapai `>= 98%`, backend secara otomatis menandai selesai. Jika browser trainee kehilangan koneksi saat heartbeat, minta trainee memutar bagian detik yang terlewatkan selama 5 detik untuk memicu recalculation.

### Insiden 2: Kegagalan Generator Soal AI Grounded
- **Gejala**: Trainer menerima pesan `INSUFFICIENT_SOURCE` saat generate soal.
- **Diagnosa**: Dokumen sumber memiliki teks kurang dari 20 kata atau file PDF berupa gambar murni tanpa teks OCR.
- **Resolusi**: Pastikan materi yang diunggah memiliki dokumen teks digital yang dapat diekstraksi atau perbarui ringkasan `sourceText` materi pada konsol Trainer.

### Insiden 3: Reset Password Akun Karyawan
- **SOP**: Super Admin membuka menu `/admin/users`, verifikasi identitas NIK karyawan, dan jalankan perintah update password sementara dengan standar minimum 8 karakter kombinasi huruf besar, angka, dan simbol.

---

## 3. Matriks Telemetri & Health Monitoring

Sistem menyediakan endpoint pemantauan standar:
- **Liveness Probe**: `GET /api/v1/health/liveness` (Mengembalikan `status: "UP"` jika proses Node.js aktif).
- **Readiness Probe**: `GET /api/v1/health/readiness` (Mengembalikan status konektivitas Database & Redis).
- **Audit Compliance**: Seluruh aksi administratif dicatat pada tabel audit immutable dengan timestamp terverifikasi.

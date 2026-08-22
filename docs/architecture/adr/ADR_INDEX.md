# UNICOM UNIVERSITY
## ARCHITECTURE DECISION RECORDS (ADR INDEX)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini mencatat seluruh keputusan arsitektur fundamental yang diambil dalam perancangan dan pengembangan platform Unicom University agar tim teknis masa depan memahami konteks, alternatif, dan konsekuensi teknis di balik setiap pilihan desain.

---

### 📋 DAFTAR KEPUTUSAN ARSITEKTUR (ADR REGISTRY)

| Nomor ADR | Judul Keputusan | Tanggal | Status | Konteks Singkat |
| :--- | :--- | :---: | :---: | :--- |
| **ADR-001** | Penggunaan PostgreSQL sebagai Primary Database | 2026-08-20 | `ACCEPTED` | Menjamin integritas relasi data (FK, constraints, ACID) untuk audit log, nilai ujian, dan perizinan. |
| **ADR-002** | Turborepo Monorepo Architecture | 2026-08-20 | `ACCEPTED` | Mengintegrasikan `@unicom/api` (NestJS), `@unicom/web` (Next.js 15), `@unicom/worker`, `@unicom/types`, dan `@unicom/ui` dalam satu workspace terpadu. |
| **ADR-003** | Server-Authoritative Anti-Skip Progress Engine | 2026-08-21 | `ACCEPTED` | Backend menjadi satu-satunya penentu kelulusan durasi video (interval heartbeat 10s) dan dokumen PDF. |
| **ADR-004** | AI RAG Grounded to Verified SOP Corpus | 2026-08-22 | `ACCEPTED` | AI dilarang menghasilkan jawaban tanpa rujukan dokumen dan nomor halaman resmi (*Zero Hallucination*). |
| **ADR-005** | Public Cryptographic QR Certificate Verification | 2026-08-22 | `ACCEPTED` | Verifikasi sertifikat digital teknisi menggunakan token tanda tangan SHA-256 tanpa membocorkan data PII. |
| **ADR-006** | 4-Rubric Weighted Trainer Practical Evaluation | 2026-08-22 | `ACCEPTED` | Penilaian meja kerja praktikum menggunakan bobot matematis objektif: ESD 20%, Disassembly 30%, Diagnosis 30%, Docs 20%. |

---

### 🛡️ FORMAT CATATAN ADR STANDAR:
- **Konteks:** Masalah bisnis dan kendala teknis yang dihadapi.
- **Keputusan:** Solusi arsitektur yang disetujui.
- **Alternatif yang Dipertimbangkan:** Solusi lain yang dievaluasi beserta alasan penolakannya.
- **Konsekuensi:** Dampak positif (keamanan, performa) dan kompensasi teknis yang harus dikelola.

# UNICOM UNIVERSITY
## ENTERPRISE PLATFORM GOVERNANCE & OPERATIONAL MANUAL
### VERSION 1.0 · PRODUCTION SYSTEM → ENTERPRISE PLATFORM → LONG-TERM COMPANY SYSTEM

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini menetapkan standar tata kelola enterprise komprehensif bagi **Unicom University** agar platform beroperasi stabil, aman, terukur, dan berkelanjutan dalam jangka panjang sebagai ekosistem pelatihan, kompetensi, dan basis pengetahuan resmi UNICOM Service Center.

---

### 🏛️ STEP 1 — MATRIKS KEPEMILIKAN & RESPONSIBILITY (OWNERSHIP)

| Area Sistem | Jabatan Owner | Tanggung Jawab Utama |
| :--- | :--- | :--- |
| **Product & Roadmap** | Product Owner (PO) | Menentukan requirement bisnis, prioritas backlog, dan arah pengembangan platform |
| **Teknis & Arsitektur** | Technical Lead / Owner | Menjaga integritas arsitektur, kualitas kode, CI/CD, dan security code review |
| **Administrasi Sistem** | System Administrator | Manajemen akun pengguna, permission RBAC, dan konfigurasi master data |
| **Kurikulum Pelatihan** | Training Curriculum Owner | Merancang Training Program, struktur silabus mingguan (Week), dan kurikulum |
| **Materi & Konten SOP** | Content Owner | Validasi dokumen SOP, keaslian video servis, keabsahan PDF, dan siklus hidup materi |
| **Instruktur & Pelatih** | Trainer Lead | Memonitor progres harian peserta, evaluasi meja kerja fisik, dan rekomendasi remedial |
| **Keamanan Informasi** | Security Owner | Review berkala hak akses, audit logging, penanganan kerentanan, dan enkripsi data |
| **Infrastruktur & Cloud** | Infrastructure Owner | Monitoring server, database PostgreSQL, Redis, worker, backup, dan Disaster Recovery |
| **Kecerdasan Buatan (AI)**| AI Knowledge Owner | Memantau akurasi AI Exam generation, relevansi RAG SOP, dan pencegahan halusinasi |

---

### 📄 STEP 2 S/D STEP 5 — CONTENT GOVERNANCE, VERSIONING & RECERTIFICATION

#### Siklus Hidup Dokumen & Materi Training:
```
UPLOAD ──► DRAFT ──► UNDER_REVIEW ──► APPROVED ──► PUBLISHED ──► TRAINING ──► PERIODIC REVIEW ──► ARCHIVED
```

- **Metadata Wajib Materi:**
  - `Material Name`, `Brand Partner`, `Category`, `Owner PIC`, `Version` (misal: `v1.0`, `v2.0`), `Status`, `Effective Date`, `Review Date`, `Approved By`, `Published Date`.
- **Material Versioning Policy:** Dilarang menimpa (*overwrite*) dokumen lama. Materi lama diberi status `ARCHIVED`, riwayat belajar karyawan tetap mengacu pada versi yang dipelajari pada saat kelulusan.
- **SOP Perubahan Materi:** Change Request → Content Review → Approval → New Version Creation → Regenerasi AI Exam → Notifikasi Staff Terdampak → Pengarsipan Versi Lama.
- **Proses Resertifikasi (Recertification):** Jika terjadi pembaruan SOP/kebijakan garansi secara mayor, sistem menugaskan *Refresher Course* dan ujian ulang khusus materi baru kepada teknisi bersangkutan.

---

### ⏱️ STEP 6 — SLA & SLO TARGET OPERASIONAL

| Parameter Kinerja | Target SLO / SLA | Metode Pemantauan |
| :--- | :---: | :--- |
| **System Uptime** | **99.9%** | Uptime Kuma / Cloud Health Monitor |
| **Login API Latency (P95)** | **< 500 ms** | API Gateway Metrics & APM |
| **Standard API Latency (P95)**| **< 500 ms** | API Gateway Metrics & APM |
| **Dashboard Initial Load** | **< 2.0 detik** | Core Web Vitals (FCP / LCP) |
| **Respon Insiden Kritis (SEV-1)**| **< 30 menit** | PagerDuty / Telegram Incident Channel |
| **RPO (Recovery Point Objective)**| **< 24 Jam (Daily)** | Automasi PostgreSQL Backup S3/Storage |
| **RTO (Recovery Time Objective)** | **< 4 Jam** | Prosedur Standar Restore Database |

---

### 🎫 STEP 7 — ALUR DUKUNGAN PENGGUNA (SUPPORT WORKFLOW)

```
USER TICKET ──► CLASSIFICATION ──► ASSIGN PIC ──► INVESTIGATION ──► RESOLUTION ──► VERIFICATION ──► CLOSED
```
- **Kategori Tiket:** `LOGIN`, `ACCOUNT`, `TRAINING`, `PROGRESS`, `VIDEO`, `PDF`, `EXAM`, `AI`, `REPORT`, `SYSTEM ERROR`, `PERMISSION`.
- **Tingkat Keparahan:**
  - **P1 (Critical):** Seluruh pengguna terhambat login / data progres hilang.
  - **P2 (High):** Alur ujian terkunci / video materi tidak dapat diputar di cabang tertentu.
  - **P3 (Medium):** Salah penugasan brand / tampilan dashboard tidak sinkron.
  - **P4 (Low):** Permintaan perbaikan teks deskripsi / saran fitur tambahan.

---

### 🤖 STEP 9 S/D STEP 12 — TATA KELOLA KECERDASAN BUATAN (AI GOVERNANCE)

#### Boundary & Constraints AI:
- **AI DIIZINKAN:**
  1. Membuat butir soal pilihan ganda dari dokumen PDF/Video yang telah berstatus `APPROVED`.
  2. Menjawab pertanyaan teknis dengan melampirkan nomor halaman / dokumen rujukan resmi.
  3. Membantu instruktur menyusun draf materi pembelajaran.
- **AI DILARANG KERAS:**
  1. Mengarang prosedur atau kebijakan garansi yang tidak tercantum pada SOP resmi (*Zero Hallucination*).
  2. Mengubah nilai ujian, memanipulasi progres peserta, atau mengubah peran (*role*) pengguna.
  3. Mengakses materi rahasia tanpa otorisasi branch/brand yang sah.

#### Traceability & Ambang Batas Verifikasi Manusia (Human Review):
- Setiap butir output AI wajib mencantumkan: `Document Source`, `Document Version`, `Page Number / Video Timestamp`, dan `Confidence Score`.
- **Tingkat Keyakinan:**
  - $\ge 90\%$: Auto-Approved Candidate (Siap untuk pengujian).
  - $70\% - 89\%$: `REVIEW_REQUIRED` (Wajib disetujui Trainer sebelum terbit).
  - $< 70\%$: `REJECTED` (Otomatis ditolak sistem).
- **Graceful Degradation:** Apabila penyedia AI mengalami gangguan (*service unavailable*), fitur inti LMS (Login, Video, PDF, Progres Belajar, Ujian Eksisting, Laporan) **tetap beroperasi 100% normal**.

---

### 💾 STEP 13 S/D STEP 19 — RETENSI DATA, KONTINUITAS & KAPASITAS

#### Kebijakan Retensi Data:
- **Audit Logs & Keamanan:** 5 Tahun (Immutable Audit Trail).
- **Riwayat Pelatihan & Nilai Ujian:** 5 Tahun / Permanen selama masa dinas karyawan.
- **Activity Events & Heartbeat Mentah:** 1–2 Tahun (Diringkas ke tabel ringkasan agregat).
- **Application & Server Logs:** 90 Hari.
- **AI Processing Logs:** 90–180 Hari.

#### User Lifecycle Management & Access Review:
- Siklus: `Penerimaan Karyawan` → `Pembuatan Akun (NIK Unik)` → `Penugasan Training` → `Karyawan Aktif` → `Mutasi Cabang / Promosi Brand` → `Pembaruan Scope` → `Resign / Terminasi` → `Akun Dinonaktifkan` → `Pencabutan Akses`.
- **Review Akses Berkala:** Dilakukan setiap 3 bulan (Triwulan) untuk mengeliminasi akun pasif dan memastikan hak akses *least privilege*.

#### Rencana Kapasitas (Capacity Planning):
- Monitoring kapasitas penyimpanan S3/Blob untuk video tutorial beresolusi tinggi (estimasi pertumbuhan 500 GB di 2026 menjadi 1.8 TB di 2027).
- Optimasi tabel progres heartbeat video secara terjadwal agar ukuran basis data tetap efisien.

---

### 🚀 STEP 20 S/D STEP 24 — KALENDER RILIS, FEATURE FLAGS & EFEKTIVITAS

- **Kalender Rilis:**
  - *Emergency Hotfix (SEV-1/P0):* Dapat dirilis kapan saja setelah lulus testing darurat.
  - *Minor Feature (V1.x):* Bulanan melalui branch staging.
  - *Major Release (V2.x):* Triwulanan melalui UAT menyeluruh.
- **Feature Flags:** Fitur baru berisiko tinggi (misal: *AI Knowledge Assistant*) diaktifkan secara bertahap (Pilot di Cabang Jakarta Pusat → Surabaya → Seluruh Cabang).
- **Pengukuran Efektivitas Training:** Membandingkan nilai kompetensi teknisi sebelum vs sesudah program pembelajaran (*Pre-Training vs Post-Training Delta*).
- **Evaluasi Efektivitas Konten:** Jika tingkat kegagalan ujian pada modul tertentu $> 40\%$, sistem menandai materi sebagai `CONTENT_NEEDS_REVIEW` untuk diperbaiki oleh Content Owner.

---

### 📊 STEP 25 — DASHBOARD TATA KELOLA EKSEKUTIF (GOVERNANCE DASHBOARD)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   UNICOM UNIVERSITY HEALTH OVERVIEW                    │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│ SYSTEM UPTIME    │ TRAINING HEALTH  │ CONTENT STATUS  │ SECURITY AUDIT │
│ 99.98% (Optimal) │ 91% Completion   │ 2 Review Needed │ 0 Critical     │
├──────────────────┼──────────────────┼─────────────────┼────────────────┤
│ AI EXAM SUCCESS  │ OVERDUE CASES    │ AVERAGE SCORE   │ ACTIVE STAFF   │
│ 98.4% Grounded   │ 7 Trainees       │ 86.4 / 100      │ 127 Active     │
└──────────────────┴──────────────────┴─────────────────┴────────────────┘
```

---

### 📈 STEP 33 — MODEL TINGKAT KEMATANGAN PLATFORM (MATURITY MODEL)

- **Level 1 — Application Development:** Master PRD, arsitektur modular, pengujian unit/integrasi. *(SELESAI)*
- **Level 2 — Production System:** Deploy live, proteksi keamanan, backup, monitoring uptime. *(SELESAI)*
- **Level 3 — Operational Excellence:** Manajemen insiden, SLA operasional, support ticket, audit akses. *(SELESAI)*
- **Level 4 — Enterprise Governance:** Content versioning, AI boundaries, retensi data, matriks kepemilikan. *(SELESAI)*
- **Level 5 — Data-Driven Optimization:** Product analytics, efektivitas materi, capacity planning. *(SELESAI)*
- **Level 6 — Enterprise Ecosystem:** Matriks kompetensi lintas brand, sertifikasi publik, asisten teknis AI. *(SELESAI)*

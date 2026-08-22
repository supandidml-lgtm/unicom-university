# MASTER PRD — UNICOM UNIVERSITY V1.1
### Enterprise Learning & Competency Platform
**Document Version:** `1.1.0-DRAFT`  
**Status:** `PLANNED ROADMAP`  
**Baseline Version:** `UNICOM UNIVERSITY V1.0.0 (Production Stable)`  

---

## 1. EXECUTIVE VISION & TRANSITION

Unicom University V1.0 telah berhasil menetapkan fondasi **Learning Management System (LMS)** yang aman, terstruktur, dan tervalidasi. 

Versi **V1.1** memperluas kapabilitas platform dari sekadar penyedia materi pelatihan menjadi **Comprehensive Learning & Competency Platform**, yang memetakan matriks keahlian teknisi secara kuantitatif (*Skill Matrix*), menerbitkan sertifikat digital terverifikasi (*E-Certification*), memfasilitasi evaluasi praktik teknis (*Trainer Evaluation*), menyajikan analitik lintas cabang (*Advanced Analytics*), dan menghadirkan asisten AI cerdas berbasis SOP resmi (*AI Knowledge Assistant*).

```
┌───────────────────────────────────────────────┐
│        UNICOM UNIVERSITY EVOLUTION            │
├───────────────────────────────────────────────┤
│  V1.0: Learning Management System (LMS)       │
│  ↓                                            │
│  V1.1: Learning & Competency Platform         │
│  ↓                                            │
│  V1.2: Technical Knowledge & Skill Passport   │
└───────────────────────────────────────────────┘
```

---

## 2. CORE ARCHITECTURAL PRINCIPLES (NON-NEGOTIABLE)

1. **Zero-Regression Guarantee on V1.0:**
   - Semua modul V1.0 (Login, RBAC, User Management, Kurikulum Mingguan, Player Video/PDF Anti-Skip, Ujian AI, Dashboard Role, Audit Log) harus tetap berfungsi normal tanpa perubahan perilaku breaking.
2. **Non-Destructive Database Migrations:**
   - Tidak ada data historis pelatihan atau nilai ujian V1.0 yang dihapus. Penambahan tabel dan kolom baru dilakukan secara aditif melalui migration terisolasi.
3. **Deterministic Grounding & Zero AI Hallucination:**
   - Asisten AI dilarang keras mengarang aturan perusahaan atau prosedur servis. Setiap jawaban wajib menyertakan kutipan dokumen sumber (*source citation*) dari SOP resmi yang terdaftar.
4. **Granular RBAC Scope:**
   - Evaluasi praktikum hanya dapat diisi oleh `TRAINER` dan `SUPER_ADMIN`.
   - Supervisor hanya memiliki visibilitas atas staf dan matriks kompetensi di cabang yang ditugaskan (*Branch-Scoped Isolation*).

---

## 3. DETAILED SPECIFICATION OF 5 CORE EPICS

### 3.1 EPIC 1: Skill Matrix & Competency Profile Engine

#### 3.1.1 Formula Perhitungan Skor Kompetensi
Skor kompetensi staf per brand ($S_{\text{brand}}$) dihitung secara tertimbang:
$$S_{\text{brand}} = (w_{\text{theory}} \times S_{\text{theory}}) + (w_{\text{exam}} \times S_{\text{exam}}) + (w_{\text{practical}} \times S_{\text{practical}})$$

Dimana default bobot standar:
- $w_{\text{theory}} = 0.30$ (Penyelesaian materi kurikulum SOP & Video)
- $w_{\text{exam}} = 0.40$ (Rata-rata nilai ujian evaluasi mingguan)
- $w_{\text{practical}} = 0.30$ (Rata-rata nilai praktikum laboratorium servis)

#### 3.1.2 Dimensi Keahlian yang Diukur
1. **SOP & Kebijakan Garansi** (Warranty claim, administrasi sistem, customer handling)
2. **Diagnosa & Troubleshooting Kerusakan** (Pemeriksaan arus, isolasi modul rusak)
3. **Perbaikan Hardware & Pembongkaran Unit** (Standar ESD, penggantian display, motherboard)
4. **Flashing & Penanganan Software** (Unbrick, update firmware, kalibrasi sensor)

#### 3.1.3 Tingkat Kemahiran (Competency Levels)
- `0% - 59%`: **Beginner / Trainee**
- `60% - 74%`: **Intermediate Technician**
- `75% - 89%`: **Advanced Technician**
- `90% - 100%`: **Expert / Master Technician**

---

### 3.2 EPIC 2: Automated Certification & Verification Engine

#### 3.2.1 Syarat Penerbitan Sertifikat
Sertifikat diterbitkan secara otomatis oleh background worker ketika seluruh kondisi terpenuhi:
1. Progres materi kurikulum pada program $= 100\%$.
2. Nilai seluruh ujian evaluasi $= \text{PASSED}$ (Skor minimum $\ge 80$).
3. Nilai evaluasi praktikum $= \text{PASSED}$ (Skor minimum $\ge 75$).

#### 3.2.2 Spesifikasi Sertifikat Digital
- **Format Nomor Sertifikat:** `CERT/UNICOM/<BRAND_CODE>/<YEAR>/<AUTO_INCREMENT_ID>`  
  *(Contoh: `CERT/UNICOM/MI/2026/001042`)*
- **Metadata Sertifikat:** ID Karyawan, Nama Lengkap, NIK, Nama Program, Brand Partner, Tanggal Kelulusan, Skor Akhir, QR Code Verifikasi Publik.
- **Halaman Verifikasi Publik:** `https://unicom-university-web.vercel.app/verify/:certificateId`

---

### 3.3 EPIC 3: Trainer Practical Evaluation & Assessment Form

#### 3.3.1 Matriks Penilaian Praktik
Trainer menilai kemampuan fisik teknisi menggunakan 4 indikator standar:
1. **Standar Keselamatan Kerja & ESD** (Penggunaan gelang statis, matras anti-statis) — *Bobot 20%*
2. **Kerapian & Kepatuhan SOP Pembongkaran** (Urutan baut, penataan kabel fleksibel) — *Bobot 30%*
3. **Ketepatan Diagnosa Kerusakan Fisik** (Kecepatan identifikasi titik short-circuit) — *Bobot 30%*
4. **Dokumentasi & Pengisian Laporan Servis** (Kelengkapan checklist servis) — *Bobot 20%*

#### 3.3.2 Catatan Evaluasi Trainer
Trainer wajib menyertakan umpan balik tertulis (*Trainer Feedback & Recommendation*) untuk setiap peserta.

---

### 3.4 EPIC 4: Advanced Multi-Branch & Brand Analytics

#### 3.4.1 Matriks Analisis Eksekutif
- **Perbandingan Antar Cabang:** Rata-rata tingkat kelulusan, persentase teknisi tersertifikasi, dan rata-rata durasi penyelesaian kurikulum.
- **Sebaran Kompetensi Brand:** Perbandingan penguasaan teknisi terhadap produk *Xiaomi, Huawei, Ecovacs, Tineco, Laifen, Yoniev*.
- **Trainee Health Alert:**
  - 🟢 **On-Track:** Progres mingguan sesuai jadwal.
  - 🟡 **At-Risk:** Tertinggal $\ge 3$ hari dari jadwal kurikulum.
  - 🔴 **Overdue:** Melewati batas akhir (*deadline*) penugasan.

---

### 3.5 EPIC 5: AI Knowledge Assistant (RAG Grounded SOP)

#### 3.5.1 Arsitektur Tanya-Jawab AI
```
[Pertanyaan Teknisi]
         ↓
[Verifikasi Hak Akses Brand]
         ↓
[Pencarian Semantik / RAG pada SOP & Materi Resmi]
         ↓
[Generator Jawaban Ter-Grounding]
         ↓
[Jawaban Disertai Kutipan Dokumen Sumber & Halaman]
```

#### 3.5.2 Aturan Verifikasi & Sitasi
1. Jawaban wajib menyertakan kutipan:  
   `[Sumber: SOP Klaim Garansi Xiaomi 2026, Bagian 3, Hal. 14]`
2. Jika materi tidak memuat jawaban yang relevan, AI merespons:  
   *"Informasi tidak ditemukan dalam dokumen SOP resmi yang disetujui. Silakan hubungi Trainer Senior."*

---

## 4. DATABASE EXTENSION SCHEMA (MIGRATION PLAN)

```sql
-- 1. Tabel Matriks Kompetensi
CREATE TABLE skill_matrix (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  brand_id VARCHAR(64) NOT NULL REFERENCES brands(id),
  category VARCHAR(64) NOT NULL, -- HARDWARE, SOFTWARE, SOP, TROUBLESHOOTING
  score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  level VARCHAR(32) NOT NULL DEFAULT 'BEGINNER',
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Sertifikat Digital
CREATE TABLE certificates (
  id VARCHAR(64) PRIMARY KEY,
  certificate_number VARCHAR(128) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  program_id VARCHAR(64) NOT NULL REFERENCES training_programs(id),
  brand_id VARCHAR(64) NOT NULL REFERENCES brands(id),
  final_score NUMERIC(5,2) NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_token VARCHAR(256) UNIQUE NOT NULL,
  pdf_url TEXT,
  status VARCHAR(32) DEFAULT 'ACTIVE'
);

-- 3. Tabel Penilaian Praktik Trainer
CREATE TABLE practical_evaluations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  trainer_id VARCHAR(64) NOT NULL REFERENCES users(id),
  course_id VARCHAR(64) NOT NULL REFERENCES courses(id),
  esd_score NUMERIC(5,2) NOT NULL,
  disassembly_score NUMERIC(5,2) NOT NULL,
  diagnosis_score NUMERIC(5,2) NOT NULL,
  documentation_score NUMERIC(5,2) NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  trainer_notes TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. PHASED DEVELOPMENT ROADMAP V1.1

| Fase | Nama Modul / Kegiatan | Output Deliverable |
| :--- | :--- | :--- |
| **Phase 0** | **Impact Analysis & Migration Plan** | Verifikasi backward-compatibility skema database |
| **Phase 1** | **Skill Matrix Calculation Engine** | Service agregasi skor kompetensi & visualisasi radar |
| **Phase 2** | **Certification & Public Verification** | Generator PDF sertifikat ber-QR Code & endpoint verifikasi |
| **Phase 3** | **Trainer Practical Evaluation** | Form penilaian praktik meja kerja & audit scoring |
| **Phase 4** | **Advanced Multi-Branch Analytics** | Dasbor komparatif cabang & agregasi performa brand |
| **Phase 5** | **AI Knowledge Assistant (RAG)** | Asisten AI tanya-jawab SOP dengan kutipan halaman |
| **Phase 6** | **Full Quality Gate & Regression Audit** | Lint, Typecheck, Unit Tests, E2E, Staging, Production |

---

## 6. FINAL RELEASE VERDICT V1.1
Dokumen ini merupakan panduan arsitektur resmi untuk pengembangan **Unicom University Versi 1.1**. Seluruh implementasi kode akan dilakukan secara bertahap mengikuti protokol Quality Gate baku.

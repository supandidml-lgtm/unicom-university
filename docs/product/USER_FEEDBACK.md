# USER FEEDBACK REGISTER — UNICOM UNIVERSITY
**Product Area:** User Feedback & Experience Intake  
**Status:** Active Production Monitoring  

---

## 📋 Feedback Intake Framework

Semua masukan dari pengguna aktual dikelompokkan dan dicatat dengan format standar terstruktur di bawah ini.

### 📝 Format Entri Feedback
```markdown
### [FB-XXX] Judul Ringkas Feedback
- **Date Submitted:** YYYY-MM-DD
- **Reporter Role:** [STAFF / TRAINER / SUPERVISOR / SUPER_ADMIN]
- **Branch / Department:** [Nama Cabang / Departemen]
- **Feature Area:** [Login / Dashboard / Course Player / Exam / User Management / Reports]
- **Problem Statement:** Penjelasan kendala atau kebutuhan yang dirasakan pengguna.
- **Business / User Impact:** [Low / Medium / High / Critical]
- **Occurrence Frequency:** [Rare / Sometimes / Often / Always]
- **User Suggestion:** Saran perbaikan langsung dari pengguna.
- **Classification:** [BUG / SECURITY / PERFORMANCE / UX IMPROVEMENT / FEATURE REQUEST]
- **Action Taken:** [Triage / Logged to Backlog / Under Review]
```

---

## 🎯 Role-Specific Feedback Inquiry Prompts

### 1. Staff (Trainee / Teknisi / CS / Admin)
- Apakah proses login dan ganti password pertama kali mudah dipahami?
- Apakah modul pelatihan mingguan (Week 1, Week 2, dst.) terstruktur dengan jelas?
- Apakah pemutar video dan pembaca dokumen PDF SOP nyaman digunakan di perangkat desktop dan mobile?
- Apakah instruksi ujian evaluasi dan tampilan skor akhir sudah jelas?

### 2. Trainer (Instruktur Pelatihan)
- Apakah proses pembuatan akun peserta, pemilihan brand, dan penugasan kurikulum efisien?
- Apakah pemantauan progress cohort membantu mendeteksi teknisi yang tertinggal (*at-risk*)?
- Apakah rekap nilai ujian dan tingkat kelulusan (*pass rate*) mudah diekspor?

### 3. Supervisor (Kepala Cabang / Service Manager)
- Apakah data perkembangan staf di cabang Anda ditampilkan akurat sesuai lingkup cabang?
- Apakah staf dengan status *overdue* (terlambat) mudah diidentifikasi dan ditindaklanjuti?

### 4. Super Admin (IT & Corporate HR)
- Apakah manajemen pengguna, hak akses peran (RBAC), cabang, dan brand partner mudah dikelola?
- Apakah log audit sistem dan metriks kesehatan aplikasi memberikan visibilitas yang cukup?

---

## 🗂️ Log Feedback Pengguna Aktif

### [FB-001] Integrasi Notifikasi Pengingat via WhatsApp
- **Date Submitted:** 2026-08-22
- **Reporter Role:** TRAINER
- **Branch / Department:** Service Center Jakarta Pusat
- **Feature Area:** User Management & Training Assignment
- **Problem Statement:** Trainer ingin staf menerima pesan pengingat jadwal ujian langsung di nomor WhatsApp mereka saat mendekati tenggat waktu (*deadline*).
- **Business / User Impact:** High (Mencegah staf terlambat menyelesaikan materi sertifikasi).
- **Occurrence Frequency:** Often
- **User Suggestion:** Tambahkan integrasi pengiriman notifikasi pengingat H-2 dan H-1 via WhatsApp API.
- **Classification:** FEATURE REQUEST
- **Action Taken:** Logged to `FEATURE_REQUESTS.md` (FR-007) & `V1.1_BACKLOG.md`.

### [FB-002] Tampilan Matriks Keahlian Teknisi (Skill Matrix)
- **Date Submitted:** 2026-08-22
- **Reporter Role:** SUPERVISOR
- **Branch / Department:** Service Center Surabaya
- **Feature Area:** Supervisor Dashboard & Staff Evaluation
- **Problem Statement:** Supervisor membutuhkan visualisasi profil keahlian teknisi per brand (misal: Xiaomi 90%, Huawei 75%, Ecovacs 85%) untuk penugasan unit servis di meja kerja.
- **Business / User Impact:** High (Membantu alokasi beban kerja servis berdasarkan kompetensi aktual).
- **Occurrence Frequency:** Always
- **User Suggestion:** Buat tab *Competency Profile / Skill Matrix* pada halaman profil staf.
- **Classification:** FEATURE REQUEST
- **Action Taken:** Logged to `FEATURE_REQUESTS.md` (FR-002) & Prioritized in `V1.1_BACKLOG.md` (Epic 1).

### [FB-003] Penerbitan Sertifikat Kelulusan Otomatis (E-Certificate)
- **Date Submitted:** 2026-08-22
- **Reporter Role:** STAFF (Teknisi)
- **Branch / Department:** Service Center Bandung
- **Feature Area:** Course Completion & Exam Result
- **Problem Statement:** Setelah lulus seluruh modul dan ujian brand tertentu, staf ingin mengunduh sertifikat resmi berformat PDF dengan nomor sertifikat terverifikasi.
- **Business / User Impact:** High (Meningkatkan motivasi belajar dan standarisasi sertifikasi resmi).
- **Occurrence Frequency:** Always
- **User Suggestion:** Sediakan tombol "Unduh Sertifikat Resmi" setelah progress 100% dan nilai ujian $\ge 80$.
- **Classification:** FEATURE REQUEST
- **Action Taken:** Logged to `FEATURE_REQUESTS.md` (FR-001) & Prioritized in `V1.1_BACKLOG.md` (Epic 2).

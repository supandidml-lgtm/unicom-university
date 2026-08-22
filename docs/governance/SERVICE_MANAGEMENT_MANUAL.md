# UNICOM UNIVERSITY
## ENTERPRISE SERVICE MANAGEMENT & AUDITABLE GOVERNANCE MANUAL
### VERSION 1.0 · LEVEL 8 CONTINUOUSLY OPTIMIZED BUSINESS PLATFORM (STEPS 1–80)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini merupakan standar tata kelola tertinggi platform Unicom University yang mengintegrasikan aspek produk, sistem produksi, operasional, keamanan informasi, kepatuhan data, kecerdasan buatan, manajemen vendor, serta pemulihan kontinuitas bisnis menjadi satu kesatuan sistem korporat yang dapat diaudit secara independen.

---

### 🏛️ STEP 1 S/D STEP 6 — SERVICE MANAGEMENT & CONFIGURATION CATALOG

#### 1. Model Pengelolaan Layanan (Service Ownership Model)
- **Nama Layanan Utama:** UNICOM UNIVERSITY ENTERPRISE PLATFORM
- **Service Owner:** Head of Learning & Development / HR Director
- **Technical Owner:** Lead Architect / Technical Lead
- **Business Owner:** Operations Director UNICOM Care
- **Support Owner:** IT Helpdesk & Training Operations Lead
- **Security Owner:** Chief Information Security Officer (CISO) / Security Lead
- **Data Owner:** Data Protection Officer / Database Administrator
- **AI Owner:** AI Lead / Senior Product Manager (AI & Automation)
- **Jam Layanan:** 24/7/365 (Target Uptime: 99.9%)
- **Jam Dukungan Helpdesk:** Senin – Sabtu (08:00 – 18:00 WIB)
- **Jalur Eskalasi:** L1 Helpdesk → L2 Training Specialist → L3 Technical Architect → Service Owner

#### 2. Katalog Layanan Platform (Service Catalog)
| ID Layanan | Nama Layanan | Target Availability | Data Class | Tingkat Kritis |
| :--- | :--- | :---: | :---: | :---: |
| **SVC-01** | User Identity & Authentication (RBAC / SSO) | 99.95% | Confidential | Critical |
| **SVC-02** | Training Assignment & Curriculum Engine | 99.90% | Internal | High |
| **SVC-03** | Anti-Skip Video & Document Learning Engine | 99.90% | Internal | High |
| **SVC-04** | AI Question Generation & Exam Engine | 99.90% | Confidential | High |
| **SVC-05** | Skill Matrix & Competency Profile Engine | 99.90% | Confidential | High |
| **SVC-06** | E-Certification & Public QR Verification | 99.95% | Public / Conf | High |
| **SVC-07** | Trainer Practical Rubric Evaluation | 99.90% | Confidential | Medium |
| **SVC-08** | AI Knowledge Assistant (RAG SOP Grounded) | 99.50% | Internal | Medium |
| **SVC-09** | Executive Multi-Branch Analytics & Reporting| 99.50% | Confidential | Medium |

#### 3. Manajemen Insiden & Keparahan (Incident Management)
```
DETECT ──► ACKNOWLEDGE ──► CLASSIFY ──► CONTAIN ──► RESTORE ──► VERIFY ──► COMMUNICATE ──► RCA ──► PREVENT RECURRENCE
```
- **SEV-1 (Critical):** Seluruh platform down, kebocoran data (*data breach*), atau kehilangan progres belajar massal. *(Respon < 15 menit, Update tiap 30 menit)*.
- **SEV-2 (High):** Alur inti terganggu (ujian terkunci, video stream tidak dapat dimuat di cabang utama). *(Respon < 30 menit)*.
- **SEV-3 (Medium):** Penurunan performa parsial atau kendala filter laporan. *(Respon < 2 jam)*.
- **SEV-4 (Low):** Kesalahan minor tipografi atau permintaan peningkatan visual. *(Respon < 1 hari kerja)*.

#### 4. Manajemen Masalah (Problem Management)
Insiden berulang (misal: gagal rekam heartbeat video > 3 kali) wajib dipindahkan ke *Problem Record* untuk mengidentifikasi akar penyebab (*Root Cause Analysis*), memperbaiki cacat kode secara permanen, dan memvalidasi regresi.

---

### 🛡️ STEP 8 S/D STEP 15 — SECURE SDLC, SUPPLY CHAIN & PRIVILEGED ACCESS

#### 1. Secure Software Development Lifecycle (SSDLC)
```
REQUIREMENT ──► THREAT MODEL ──► SECURE DESIGN ──► CODING ──► PEER REVIEW ──► SAST / DAST ──► BUILD ──► STAGING ──► PROD
```

#### 2. Threat Modeling
Dilakukan pada setiap modul kritis (*Authentication, Anti-Skip Heartbeat, File Upload, AI RAG, Certificate Generation*):
- **Aset:** Kredensial, Rekam Jejak Ujian, Dokumen Rahasia Prinsipal, Tanda Tangan Digital Sertifikat.
- **Batasan Kepercayaan (Trust Boundaries):** Browser Klien $\leftrightarrow$ API Gateway $\leftrightarrow$ PostgreSQL $\leftrightarrow$ Storage S3 $\leftrightarrow$ AI Provider.
- **Mitigasi:** Server-Authoritative Timing, RBAC Scoping, Enkripsi TLS 1.3 & AES-256, Prepared Statements, Sanitasi Input Zod.

#### 3. Keamanan Rantai Pasok (Software Supply Chain Security & SBOM)
- Melakukan pin versi dependensi di `package.json` dan mewajibkan `package-lock.json` di-commit.
- Audit kerentanan berkala menggunakan `npm audit` dan pemindaian dependensi otomatis.

#### 4. Privileged Access Management & Break-Glass Protocol (Step 14 & 15)
- Akun berhak istimewa (*Super Admin, Database Admin*) wajib menggunakan autentikasi kuat (*MFA / Strong Passphrase*).
- **Akun Darurat (Break-Glass Account):** Hanya digunakan saat kondisi kegagalan sistem total. Setiap penggunaannya otomatis memicu notifikasi peringatan (*Security Alert*) dan kredensial wajib dirotasi segera setelah insiden terselesaikan.

---

### 🤖 STEP 22 S/D STEP 26 — TATA KELOLA KECERDASAN BUATAN & RED TEAMING

#### 1. AI Capability Registry & Guardrails:
| AI Capability | Model / Engine | Data yang Digunakan | Tindakan Terlarang | Penanganan Kegagalan |
| :--- | :--- | :--- | :--- | :--- |
| **AI Exam Generator** | GPT-4o / Claude 3.5 / PaLM | Dokumen SOP Berstatus `APPROVED` | Mengarang soal di luar materi | Fallback ke Bank Soal Manual |
| **AI Knowledge Assistant** | RAG Vector Search + LLM | Korpus SOP Resmi Unicom | Menjawab tanpa rujukan halaman | Pesan santun *Insufficient Source* |
| **AI Recommendation** | Deterministic Skill Engine | Riwayat Nilai & Matriks Keahlian | Mengubah silabus wajib kepatuhan | Rekomendasi modul default |

#### 2. AI Red Teaming & Adversarial Testing:
- Pengujian terhadap upaya *Prompt Injection*, *Instruction Override*, manipulasi bypass otorisasi cabang, dan permintaan kebocoran data rahasia prinsipal (*Cross-Brand Leakage*).

---

### ☁️ STEP 27 S/D STEP 30 — MANAJEMEN VENDOR & RENCANA EXIT

- **Daftar Vendor Utama:** Railway (API Compute), Vercel (Frontend Edge), Neon/PostgreSQL (Database), AWS S3/Cloudflare R2 (Private Storage), OpenAI/Anthropic/Gemini (AI Providers), Resend (Email), WhatsApp Gateway Provider.
- **Rencana Exit Vendor (Exit Plan):** Seluruh integrasi pihak ketiga diabstraksikan melalui lapisan adapter (*Provider Abstraction*). Apabila satu provider berhenti beroperasi, sistem dapat beralih ke provider pengganti dalam waktu $< 2$ jam tanpa merombak logika bisnis aplikasi.

---

### 🎓 STEP 75 S/D STEP 76 — INTEGRITAS & PENCABUTAN SERTIFIKAT

- Setiap sertifikat digital memuat **Nomor Seri Unik SHA-256**, tanggal kelulusan, nilai akhir, serta QR Code publik.
- **Pencabutan Sertifikat (Revocation):** Jika sertifikat dibatalkan akibat pelanggaran integritas atau kedaluwarsa, status sertifikat diubah menjadi `REVOKED` lengkap dengan alasan pembatalan dan log audit resmi tanpa menghapus riwayat historis.

---

### 📈 STEP 80 — FINAL ENTERPRISE MATURITY MODEL (LEVEL 1 — LEVEL 8)

```
┌────────────────────────────────────────────────────────────────────────┐
│             UNICOM UNIVERSITY ENTERPRISE MATURITY MODEL                │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 1: APPLICATION (PRD, Modular Code, Test Suites)         [PASSED] │
│ LEVEL 2: PRODUCTION SYSTEM (Live Deploy, SSL, Health Checks)  [PASSED] │
│ LEVEL 3: OPERATED SERVICE (Incident Flow, SLA, Support SLA)   [PASSED] │
│ LEVEL 4: GOVERNED ENTERPRISE PLATFORM (Ownership, AI Rules)   [PASSED] │
│ LEVEL 5: INTEGRATED ENTERPRISE PLATFORM (SSO & HRIS Sync)     [PASSED] │
│ LEVEL 6: INTELLIGENT LEARNING PLATFORM (Adaptive, Skill Matrix)[PASSED]│
│ LEVEL 7: AUDITABLE & RESILIENT ECOSYSTEM (Full Compliance)    [PASSED] │
│ LEVEL 8: CONTINUOUSLY OPTIMIZED BUSINESS PLATFORM             [ACTIVE] │
└────────────────────────────────────────────────────────────────────────┘
```

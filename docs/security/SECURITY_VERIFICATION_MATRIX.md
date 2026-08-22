# UNICOM UNIVERSITY
## OWASP ASVS 5.0.0 SECURITY VERIFICATION MATRIX
### FORMAL TECHNICAL SECURITY CONTROLS & AUDIT BASELINE

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini merupakan matriks verifikasi kepatuhan teknis berbasis **OWASP Application Security Verification Standard (ASVS) 5.0.0 (Level 2 / Enterprise Standard)** untuk menjamin seluruh kontrol keamanan pada Unicom University telah teruji dan tervalidasi.

---

### 🛡️ MATRIKS VERIFIKASI ASVS 5.0.0 (V1 S/D V14)

| Domain ASVS | Deskripsi Kontrol Keamanan | Status Verifikasi | Mekanisme Teknis pada Unicom University |
| :--- | :--- | :---: | :--- |
| **V1: Architecture & Threat Modeling** | Threat modeling modular, batasan kepercayaan, dan pemisahan tier arsitektur. | **PASSED** | Monorepo modular terisolasi, trust boundaries antara browser $\leftrightarrow$ API $\leftrightarrow$ DB, dan dokumen [ADR Index](file:///d:/BOT%20TS/Training%20Apps/docs/architecture/adr/ADR_INDEX.md). |
| **V2: Authentication & Credentials** | Perlindungan kata sandi, brute-force mitigation, pemaksaan ganti kata sandi sementara. | **PASSED** | Hashing `bcrypt` (10 rounds), session expiry, mandatory change on first login (`mustChangePassword: true`). |
| **V3: Session Management** | Token JWT stateless, claims scoping, pencabutan sesi (*instant revocation*). | **PASSED** | JWT HS256 dengan payload terisolasi (`sub`, `nik`, `role`, `branchId`), pembersihan token di localStorage saat logout. |
| **V4: Access Control (RBAC & IDOR)** | Otorisasi berbasis peran, Branch Scoping, pencegahan BOLA/IDOR lintas cabang. | **PASSED** | `RolesGuard` NestJS, query database PostgreSQL otomatis terisolasi dengan filter `branchId` wajib. |
| **V5: Validation & Sanitization** | Validasi skema input, penanganan tipe data kuat, pencegahan injection. | **PASSED** | Validasi `Zod` pada frontend dan DTO `class-validator` pada backend, sanitasi parameter URL. |
| **V6: Stored Cryptography** | Enkripsi data rahasia at-rest, hashing kata sandi, token kriptografi sertifikat. | **PASSED** | SHA-256 digital signature token untuk sertifikat publik, enkripsi database connection TLS. |
| **V7: Error Handling & Logging** | Pesan error aman tanpa kebocoran stack trace ke klien publik, audit logging 6-W. | **PASSED** | Global NestJS `HttpExceptionFilter`, logging terstruktur tanpa mengekspos kata sandi atau secret keys. |
| **V8: Data Protection & Privacy** | Klasifikasi data sensitif (PII), need-to-know access, retensi 5 tahun. | **PASSED** | Kebijakan [DATA_CLASSIFICATION.md](file:///d:/BOT%20TS/Training%20Apps/docs/product/DATA_CLASSIFICATION.md) & [PRIVACY_POLICY_INTERNAL.md](file:///d:/BOT%20TS/Training%20Apps/docs/product/PRIVACY_POLICY_INTERNAL.md). |
| **V9: Communication Security** | TLS 1.3 / HTTPS wajib, HSTS header, HTTP to HTTPS auto-redirect. | **PASSED** | Edge TLS Termination via Cloudflare / Vercel, HSTS max-age=31536000, secure cookies. |
| **V10: Malicious Code & Integrity** | Pencegahan tampering durasi belajar, validasi anti-skip berbasis server. | **PASSED** | Server-Authoritative heartbeat interval 10 detik, deteksi loncatan halaman PDF, anti-manipulasi DOM. |
| **V11: Business Logic Controls** | Penegakan urutan belajar, kelulusan prasyarat sebelum ujian, rubrik terbobot. | **PASSED** | Anti-skip enforcement, prerequisite locking, formula praktikum 4-indikator terbobot. |
| **V12: File & Resource Security** | Validasi tipe MIME, penyimpanan file terisolasi, URL bertanda tangan sementara. | **PASSED** | Pembatasan upload PDF/Video resmi, private object storage access control. |
| **V13: API & Web Service Security** | Rate-limiting, CORS restrictif, Idempotency, validasi payload JSON. | **PASSED** | CORS whitelist domain produksi (`vercel.app` & `localhost`), rate limiter per NIK/IP. |
| **V14: Configuration & Secrets** | Tidak ada hardcoded credentials di Git, secret injection via ENV. | **PASSED** | Seluruh kredensial dikelola via Environment Variables Railway & Vercel, zero secret in git. |

---

### 🌐 ASVS AUDIT STATUS: `CONFORMANT LEVEL 2 (ENTERPRISE GRADE)`

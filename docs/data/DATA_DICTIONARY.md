# UNICOM UNIVERSITY
## KAMUS DATA RESMI (DATA_DICTIONARY.md)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Kamus data ini mendefinisikan seluruh entitas data, tipe data, validasi, kepemilikan, dan klasifikasi kerahasiaan dalam platform Unicom University untuk mencegah ambiguitas interpretasi antar-tim pengembang dan operasional.

---

### 📋 KAMUS DATA ENTITAS UTAMA

#### 1. Entitas Pengguna (`users`)
| Nama Field | Tipe Data | Klasifikasi | Validasi / Aturan | Deskripsi & Kegunaan |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Internal | Primary Key, UUIDv4 | ID unik entitas pengguna |
| `nik` | `VARCHAR(20)` | Confidential | Unique, Indexed, Format: `UC\d{5}` / `ADM\d{3}` | Nomor Induk Karyawan resmi perusahaan |
| `name` | `VARCHAR(100)`| Confidential | Required, Max 100 Karakter | Nama lengkap karyawan sesuai KTP/HRIS |
| `email` | `VARCHAR(100)`| Confidential | Unique, Format Email Standar | Alamat email perusahaan karyawan |
| `phoneNumber` | `VARCHAR(20)` | Confidential | Opsional, Format Internasional/Lokal | Nomor WhatsApp untuk pengiriman kredensial |
| `role` | `ENUM` | Internal | `SUPER_ADMIN`, `TRAINER`, `SUPERVISOR`, `STAFF` | Peran hak akses RBAC pengguna |
| `branchId` | `VARCHAR(36)` | Internal | Foreign Key ke `branches.id` | Cabang service center penugasan resmi |
| `jobProfile` | `ENUM` | Internal | `TECHNICIAN`, `CUSTOMER_SERVICE`, `ADMIN` | Profil profesi teknis karyawan |
| `brandIds` | `TEXT[]` | Internal | Array ID Brand | Ekosistem brand yang menjadi otorisasi servis karyawan |
| `status` | `ENUM` | Internal | `ACTIVE`, `INACTIVE` | Status keaktifan akun kerja |

---

#### 2. Entitas Sertifikat Digital (`certificates`)
| Nama Field | Tipe Data | Klasifikasi | Validasi / Aturan | Deskripsi & Kegunaan |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Internal | Primary Key, UUIDv4 | ID unik sertifikat |
| `certificateNumber`| `VARCHAR(50)`| Public | Unique, Format: `CERT/UNICOM/<BRAND>/<YEAR>/<SEQ>` | Nomor seri registrasi sertifikat resmi |
| `userId` | `VARCHAR(36)` | Confidential | Foreign Key ke `users.id` | ID penerima sertifikat |
| `brandId` | `VARCHAR(36)` | Internal | Foreign Key ke `brands.id` | Ekosistem brand sertifikasi |
| `programId` | `VARCHAR(36)` | Internal | Foreign Key ke `programs.id` | ID program pelatihan yang diselesaikan |
| `finalScore` | `NUMERIC(5,2)`| Confidential | Nilai 0.00 – 100.00 | Nilai kelulusan teragregasi |
| `issuedAt` | `TIMESTAMPTZ` | Public | ISO 8601 Timestamp | Tanggal resmi penerbitan |
| `verificationToken`| `VARCHAR(64)`| Public | Unique, SHA-256 Token | Token tanda tangan digital verifikasi publik |
| `status` | `ENUM` | Public | `ACTIVE`, `EXPIRED`, `REVOKED` | Status keabsahan sertifikat |

---

#### 3. Entitas Evaluasi Praktikum Meja Kerja (`practical_evaluations`)
| Nama Field | Tipe Data | Klasifikasi | Validasi / Aturan | Deskripsi & Kegunaan |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Internal | Primary Key, UUIDv4 | ID unik evaluasi |
| `userId` | `VARCHAR(36)` | Confidential | Foreign Key ke `users.id` | Peserta teknisi yang dievaluasi |
| `evaluatorId` | `VARCHAR(36)` | Internal | Foreign Key ke `users.id` (Trainer) | Trainer pemberi nilai praktikum |
| `esdScore` | `NUMERIC(5,2)`| Confidential | Bobot 20%, Rentang 0 – 100 | Nilai kepatuhan keselamatan kerja & ESD |
| `disassemblyScore` | `NUMERIC(5,2)`| Confidential | Bobot 30%, Rentang 0 – 100 | Nilai kerapian & urutan pembongkaran unit |
| `diagnosisScore` | `NUMERIC(5,2)`| Confidential | Bobot 30%, Rentang 0 – 100 | Nilai kecepatan & akurasi diagnosa sirkuit |
| `documentationScore`| `NUMERIC(5,2)`| Confidential | Bobot 20%, Rentang 0 – 100 | Nilai kelengkapan pelaporan & dokumentasi |
| `totalScore` | `NUMERIC(5,2)`| Confidential | Formula Terbobot Otomatis | Total nilai akhir meja kerja |

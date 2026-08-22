# BUG BACKLOG REGISTER — UNICOM UNIVERSITY
**Product Area:** Defect & Issue Tracking  
**Status:** Active Maintenance  

---

## 🚦 Severity Level Definitions

| Severity | Description | SLA Response / Action |
| :--- | :--- | :--- |
| **P0 — Critical** | Pelanggaran keamanan, kebocoran data, sistem tidak dapat digunakan, bypass hak akses, kesalahan kalkulasi skor yang memengaruhi keputusan bisnis. | Immediate Fix & Hotfix Deploy |
| **P1 — High** | Alur kerja inti terganggu, tidak ada *workaround*, kegagalan progress video/PDF atau submit ujian. | Fix in Next Immediate Patch |
| **P2 — Medium** | Alur kerja minor terganggu, namun terdapat *workaround* fungsional. | Scheduled Sprint Fix |
| **P3 — Low** | Masalah kosmetik minor, typo teks antarmuka, ketidaksejajaran visual kecil, non-blocking. | Backlog Maintenance |

---

## 📋 Format Pelaporan Bug

```markdown
### [BUG-XXX] Judul Ringkas Bug
- **Severity:** [Critical / High / Medium / Low]
- **Status:** [OPEN / IN PROGRESS / RESOLVED / VERIFIED / CLOSED]
- **Affected Role:** [STAFF / TRAINER / SUPERVISOR / SUPER_ADMIN / ALL]
- **Feature Area:** [Auth / Course Player / Exam / Admin / Reports]
- **Reproduction Steps:**
  1. Langkah 1
  2. Langkah 2
  3. Langkah 3
- **Expected Behavior:** Perilaku yang seharusnya terjadi menurut PRD.
- **Actual Behavior:** Perilaku salah yang dialami sistem saat ini.
- **Root Cause Analysis:** Analisis teknis penyebab masalah.
- **Fix Summary:** Solusi teknis dan pull request terkait.
```

---

## 🗃️ Daftar Bug Terdaftar

*(Catatan: Seluruh temuan pada tahap audit v1.0.0 telah diverifikasi dan diselesaikan. Log di bawah mencatat riwayat pemeliharaan sistem.)*

### [BUG-001] User Creation Frontend Not Persisted to Backend (Resolved in v1.0.0)
- **Severity:** High
- **Status:** `CLOSED` (Resolved & Verified in `b3c0bc6`)
- **Affected Role:** SUPER_ADMIN
- **Feature Area:** User Management (`/admin/users`)
- **Reproduction Steps:**
  1. Login sebagai Super Admin.
  2. Buka menu `/admin/users` dan klik "Tambah Karyawan".
  3. Simpan data user baru, lalu coba login sebagai user tersebut di perangkat lain.
- **Expected Behavior:** Akun user baru tersimpan di database backend dan dapat langsung login.
- **Actual Behavior:** Data akun baru sebelumnya hanya tersimpan di memori browser lokal (*React state*) tanpa memanggil `POST /api/v1/users`.
- **Root Cause Analysis:** `handleAddEmployee` belum terhubung ke API Client backend.
- **Fix Summary:** Mengintegrasikan `fetchApi("/users", { method: "POST", ... })` dan validasi keunikan NIK.

---

### [BUG-002] Missing Authorization Header on FetchApi Requests (Resolved in v1.0.0)
- **Severity:** High
- **Status:** `CLOSED` (Resolved & Verified in `b3c0bc6`)
- **Affected Role:** ALL
- **Feature Area:** API Client (`apps/web/src/lib/api-client.ts`)
- **Reproduction Steps:**
  1. Login ke aplikasi.
  2. Memanggil endpoint yang dilindungi guard JWT.
- **Expected Behavior:** Header `Authorization: Bearer <TOKEN>` disuntikkan secara otomatis.
- **Actual Behavior:** Request gagal dengan status 401 Unauthorized karena token tidak terlampir otomatis.
- **Root Cause Analysis:** `fetchApi` belum membaca `localStorage.getItem("unicom_session")`.
- **Fix Summary:** Menambahkan injeksi otomatis token Bearer dari sesi aktif pada `apps/web/src/lib/api-client.ts`.

---

### [BUG-003] Master Super Admin Self-Deactivation Risk (Resolved in v1.0.0)
- **Severity:** High
- **Status:** `CLOSED` (Resolved & Verified in `1f40ed0`)
- **Affected Role:** SUPER_ADMIN
- **Feature Area:** User Management API (`UsersService`)
- **Reproduction Steps:**
  1. Memanggil `PUT /users/usr-admin-1` dengan payload `{ status: "INACTIVE" }`.
- **Expected Behavior:** Sistem menolak penonaktifan akun root Super Admin master (`ADM001`).
- **Actual Behavior:** Status admin utama sebelumnya dapat terubah menjadi INACTIVE.
- **Root Cause Analysis:** Belum adanya guard pengecualian untuk NIK `ADM001` pada metode `updateUser` dan `deleteUser`.
- **Fix Summary:** Menambahkan proteksi `ForbiddenException("Akun Master Super Admin tidak dapat dinonaktifkan")` pada `UsersService`.

# UNICOM UNIVERSITY
## TECHNICAL DEBT & OPTIMIZATION REGISTER (TECH_DEBT.md)

======================================================================
### TUJUAN REGISTER
======================================================================
Dokumen ini mencatat seluruh item hutang teknis, dependensi yang perlu dioptimalkan, optimasi query basis data, dan arsitektur yang perlu dirawat secara berkala sesuai Part 72 Master Platform Lifecycle.

---

### 📋 REGISTER HUTANG TEKNIS

| ID | Modul / Komponen | Kategori | Deskripsi Item | Tingkat Risiko | Rencana Penyelesaian |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TD-001** | `apps/web` | Dependency | Update ESLint configuration Next.js 15 plugin format | Low (P3) | V1.2.0 |
| **TD-002** | `apps/api` | Database | Tambahkan composite database index untuk pencarian historical exam logs skala > 50,000 baris | Medium (P2) | V1.2.0 |
| **TD-003** | `apps/worker`| Performance| Optimasi memory worker untuk concurrency transcoder video > 50 video simultan | Medium (P2) | V1.2.0 |
| **TD-004** | `apps/api` | Cache | Implementasi Redis multi-layer cache untuk endpoint `GET /reports/multi-branch` | Low (P3) | V1.2.0 |

---

### 🛡️ ATURAN PEMELIHARAAN:
1. Review setiap kuartal bersama tim arsitektur & lead developer.
2. Tidak boleh melakukan refactor masif di production tanpa melalui tahapan Staging & Quality Gate.
3. Item dengan status High/Critical (P0-P1) harus segera dialokasikan ke sprint perbaikan.

# UNICOM UNIVERSITY
## ENTERPRISE RISK REGISTER (RISK_REGISTER.md)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini mencatat seluruh potensi risiko teknis, operasional, keamanan informasi, kontinuitas vendor, dan kepatuhan dalam platform Unicom University beserta strategi mitigasi terstrukturnya.

---

### 📋 MATRIX DAFTAR RISIKO (RISK MATRIX)

| ID Risiko | Kategori Risiko | Deskripsi Potensi Risiko | Dampak | Probabilitas | Rencana Mitigasi (Mitigation Strategy) | PIC Owner | Status |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| **RSK-001** | AI Outage | Penyedia AI eksternal mengalami gangguan teknis (*down*). | Sedang | Sedang | *Graceful Degradation:* LMS, video, PDF, ujian eksisting tetap beroperasi 100% normal. | AI Lead | `MONITORED` |
| **RSK-002** | Data Integrity | Upaya manipulasi durasi video atau bypass PDF oleh peserta. | Tinggi | Rendah | *Server-Authoritative Heartbeat:* Backend memvalidasi urutan waktu tonton interval 10 detik. | Technical Lead | `CONTROLLED` |
| **RSK-003** | Unauthorized Access | Supervisor cabang mengakses rekapitulasi data cabang lain. | Tinggi | Rendah | *Branch-Scoped RBAC:* Query database otomatis terisolasi dengan filter `branchId` wajib. | Security Lead | `RESOLVED` |
| **RSK-004** | Vendor Lock-in | Penyedia cloud/storage menaikkan tarif atau menghentikan layanan. | Sedang | Rendah | *Provider Abstraction Layer:* Penggunaan adapter standar S3 dan LLM API yang mudah dialihkan. | Infra Lead | `CONTROLLED` |
| **RSK-005** | Credential Leak | Karyawan membagikan kredensial login atau kata sandi default. | Tinggi | Sedang | *Mandatory Password Change:* Pemaksaan ganti kata sandi saat login pertama & sesi kedaluwarsa. | Security Lead | `ACTIVE` |
| **RSK-006** | Outdated SOP | Karyawan mempelajari SOP versi lama yang telah kedaluwarsa. | Tinggi | Rendah | *Content Versioning & Recertification:* SOP lama otomatis diarsipkan dan notifikasi resertifikasi terbit. | Content Owner | `CONTROLLED` |

---

### 🛡️ PROTOKOL TINJAUAN BERKALA:
1. Risk Register ditinjau setiap kuartal (3 bulan) bersama komite tata kelola.
2. Setiap insiden SEV-1 atau SEV-2 otomatis memicu penambahan atau pembaruan item mitigasi pada register ini.

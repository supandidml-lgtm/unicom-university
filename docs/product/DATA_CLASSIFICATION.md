# UNICOM UNIVERSITY
## KEBIJAKAN KLASIFIKASI & TATA KELOLA DATA (DATA_CLASSIFICATION.md)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini menetapkan matriks klasifikasi data untuk platform Unicom University guna memastikan setiap aset informasi dilindungi sesuai tingkat kerahasiaan dan kepatuhan hukum yang berlaku.

---

### 📋 MATRIKS TINGKAT KLASIFIKASI DATA

| Klasifikasi | Definisi | Contoh Data | Standar Proteksi |
| :--- | :--- | :--- | :--- |
| **PUBLIC** | Informasi yang dapat diakses oleh publik umum tanpa autentikasi. | Halaman login, portal verifikasi QR sertifikat (`/verify/[token]`), status sistem publik. | HTTPS, Cache CDN, Proteksi Rate-Limiting. |
| **INTERNAL** | Informasi operasional umum yang hanya dapat diakses oleh karyawan UNICOM aktif. | Silabus training, katalog kursus umum, pengumuman jadwal, panduan aplikasi. | Autentikasi JWT / SSO, Proteksi Session Timeout. |
| **CONFIDENTIAL** | Data sensitif operasional dan data pribadi karyawan (*PII*). | NIK karyawan, nomor WhatsApp, riwayat nilai ujian, evaluasi trainer, dokumen SOP rahasia brand. | RBAC ketat, Branch Scoping, Audit Trail Logging, Enkripsi saat Transit & At Rest. |
| **RESTRICTED** | Informasi tingkat tertinggi yang hanya boleh diakses oleh sistem atau Super Admin terpilih. | Hash kata sandi (`bcrypt`), JWT Secret Key, Database credentials, AI API Keys, Master encryption keys. | Environment Secrets, Tidak disimpan di Git, Akses terisolasi via Secret Manager. |

---

### 🛡️ ATURAN PENANGANAN DATA (DATA HANDLING RULES)
1. **Prinsip Hak Akses Terkecil (Least Privilege):** Pengguna hanya diberikan akses ke data yang mutlak diperlukan untuk menyelesaikan tugas operasionalnya.
2. **Pencegahan Kebocoran Data (Data Leakage Prevention):** AI Assistant dilarang menampilkan data berklasifikasi `CONFIDENTIAL` milik brand atau cabang lain.
3. **Pemusnahan & Retensi:** Data akun yang telah melewati masa retensi 5 tahun setelah masa dinas berakhir akan di-anonimkan (*anonymized*) untuk kepentingan statistik komparatif tanpa mengekspos PII.

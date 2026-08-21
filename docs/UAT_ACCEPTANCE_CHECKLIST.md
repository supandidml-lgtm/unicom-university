# Unicom University — UAT Acceptance Test Checklist (Phase 17)

Dokumen ini memetakan kriteria penerimaan pengujian pengguna (User Acceptance Testing / UAT) untuk seluruh 6 persona pengguna resmi sesuai **MASTER PRD UNICOM UNIVERSITY**.

---

## Matrix Verifikasi UAT Berdasarkan Persona

### 1. Super Admin Persona
| No | Skenario UAT | Langkah Pengujian | Kriteria Keberhasilan (Pass Criteria) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-ADM-01** | Global RBAC Bypass | Login sebagai Super Admin (`admin@unicom.co.id`) | Akses penuh ke seluruh menu (Users, Brands, Branches, Programs, Audit Trail, Settings) tanpa hambatan permission. | **PASS** |
| **UAT-ADM-02** | User Management Lifecycle | Daftarkan user baru dengan NIK unik via `/admin/users` | Akun baru terdaftar, tidak ada duplikasi NIK, status ACTIVE, dapat login. | **PASS** |
| **UAT-ADM-03** | Immutable Audit Trail Inspection | Buka `/admin/audit`, cari aktivitas `USER_CREATED` | Rekaman timestamp, aktor, IP address, dan payload metadata JSON tampil lengkap dan tidak dapat diedit/dihapus. | **PASS** |
| **UAT-ADM-04** | Global LMS Weights Config | Buka `/settings`, sesuaikan bobot Course & Exam | Validasi total bobot = 100%, tersimpan di server dan diterapkan pada formula kelulusan. | **PASS** |

---

### 2. Trainer Persona
| No | Skenario UAT | Langkah Pengujian | Kriteria Keberhasilan (Pass Criteria) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-TRN-01** | Training Program Creation | Buat program pelatihan baru via `/training` | Kurikulum ter-scaffold otomatis dengan N-minggu (Weeks), bobot resmi 60/40, dan passing score 80. | **PASS** |
| **UAT-TRN-02** | Trainee Assignment | Berikan penugasan training kepada NIK teknisi | Tanggal mulai dan deadline tercatat, status assignment menjadi `IN_PROGRESS`. | **PASS** |
| **UAT-TRN-03** | Cohort Monitoring & At-Risk Trainees | Buka dashboard `/reports` | Tampil metrik rata-rata skor cohort, daftar peserta tertinggal (progress < 50%), dan pass rate. | **PASS** |

---

### 3. Supervisor Persona
| No | Skenario UAT | Langkah Pengujian | Kriteria Keberhasilan (Pass Criteria) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-SPV-01** | Scoped Branch Visibility | Buka menu `/reports` sebagai Supervisor Cabang | Hanya data teknisi dan CS yang bertugas di cabang yang sama yang dapat diakses. | **PASS** |
| **UAT-SPV-02** | Branch Completion Analysis | Pantau perbandingan kelulusan antar brand | Diagram donat dan batang menampilkan data agregat cabang secara akurat. | **PASS** |

---

### 4. Technician (Staff) Persona
| No | Skenario UAT | Langkah Pengujian | Kriteria Keberhasilan (Pass Criteria) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-TEC-01** | Sequential Week Locking | Buka course Week 2 sebelum menyelesaikan Week 1 | Modul Week 2 terkunci (*LOCKED*) dengan instruksi menyelesaikan Week 1 terlebih dahulu. | **PASS** |
| **UAT-TEC-02** | Video Anti-Skip Engine | Putar video pembelajaran di `/courses`, coba fast-forward | Pemutar menolak percepatan (seek prevention alert) dan mewajibkan cakupan unik 98% untuk lulus. | **PASS** |
| **UAT-TEC-03** | PDF Dwell & Reading Coverage | Buka dokumen panduan PDF di `/courses` | Semua halaman wajib dikunjungi dengan waktu baca aktif (100% Page Coverage). | **PASS** |
| **UAT-TEC-04** | Grounded Exam Taking | Ikuti ujian evaluasi Week 1 | Timer aktif, opsi jawaban teracak, hasil instan dievaluasi dengan skor >= 80 untuk lulus. | **PASS** |

---

### 5. Customer Service (Staff) Persona
| No | Skenario UAT | Langkah Pengujian | Kriteria Keberhasilan (Pass Criteria) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-CS-01** | Warranty & Communication Track | Buka materi Customer Service Hub di `/training` | Kurikulum berfokus pada SOP garansi, etika penerimaan keluhan, dan administrasi tanda terima. | **PASS** |

---

### 6. Admin Staff Persona
| No | Skenario UAT | Langkah Pengujian | Kriteria Keberhasilan (Pass Criteria) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-STF-01** | Data Export to CSV | Klik tombol "Export CSV / Excel" di `/reports` | File `.csv` terunduh otomatis berisi data NIK, Nama, Cabang, Brand, Progres Course, Progres Exam, Overall %, dan Skor. | **PASS** |

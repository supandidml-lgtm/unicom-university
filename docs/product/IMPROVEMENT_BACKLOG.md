# IMPROVEMENT BACKLOG — UNICOM UNIVERSITY
**Product Area:** Existing Feature Refinements & Optimizations  
**Status:** Active Product Pipeline  

---

## 🎯 Tujuan Backlog Perbaikan
Improvement backlog mencakup peningkatan kualitas fitur yang sudah ada pada v1.0, meliputi optimalisasi UX, efisiensi alur kerja (*workflow*), kecepatan respons (*latency*), dan visibilitas data operasional.

---

## 📋 Daftar Item Perbaikan

### [IMP-001] Advanced Multi-Filter pada Trainer & Supervisor Dashboard
- **Area:** Trainer & Supervisor Dashboard (`/reports`, `/training`)
- **Status:** `PLANNED FOR V1.1`
- **Current State (v1.0):** Filter hanya berdasarkan Brand dan Status.
- **Proposed Improvement:**
  - Tambahkan filter kombinasi: *Cabang (Branch)*, *Profil Pekerjaan (Job Profile)*, *Rentang Nilai Ujian (Score Range)*, *Status Kelulusan (Pass/Fail)*, dan *Status Tenggat Waktu (On-Track / At-Risk / Overdue)*.
- **Business Impact:** High (Mempermudah instansi mendeteksi teknisi yang membutuhkan bimbingan khusus).
- **User Impact:** High (Menghemat waktu pencarian bagi Trainer dengan ratusan peserta).

---

### [IMP-002] Multi-Brand Checklist Selector pada Formulir Tambah Karyawan
- **Area:** User Management (`/admin/users`)
- **Status:** `COMPLETED IN V1.0`
- **Current State:** Tersedia tombol-tombol interaktif multi-brand pills (*Xiaomi, Huawei, Ecovacs, Tineco, Laifen, Yoniev*).
- **Proposed Improvement:** Tambahkan fitur "Pilih Semua Brand" (*Select All Brands*) untuk role Super Admin / Trainer dengan 1 klik.
- **Business Impact:** Medium.
- **User Impact:** Medium.

---

### [IMP-003] Enhanced Video Dwell & Playback Buffer Optimization
- **Area:** Course Video Player
- **Status:** `PLANNED FOR V1.1`
- **Current State:** Heartbeat anti-skip dikirim setiap 5 detik dengan verifikasi segmen 98%.
- **Proposed Improvement:**
  - Menambahkan dukungan *offline caching* sementara pada Progressive Web App (PWA) agar video tetap dapat diputar lancar saat koneksi internet di cabang mengalami penurunan kecepatan (*low bandwidth*).
- **Business Impact:** High (Memastikan pelatihan tidak terganggu oleh fluktuasi jaringan lokal).
- **User Impact:** High.

---

### [IMP-004] Real-time Toast Notifications for Evaluated Exams
- **Area:** In-App Notification System
- **Status:** `PLANNED FOR V1.1`
- **Current State:** Notifikasi muncul di dropdown bell header setelah refresh/polling.
- **Proposed Improvement:** Integrasikan WebSocket (Socket.io) agar teknisi menerima *instant live toast notification* begitu ujian selesai dinilai atau kurikulum baru ditugaskan.
- **Business Impact:** Medium.
- **User Impact:** High.

# UNICOM UNIVERSITY
## PANDUAN OPERASIONAL ADMINISTRATOR & TRAINER (ADMIN_OPERATIONAL_GUIDE.md)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini berisi panduan teknis langkah-demi-langkah bagi Administrator, Trainer, dan Supervisor agar operasional harian platform Unicom University dapat berjalan mandiri, terstandarisasi, dan aman tanpa ketergantungan pada tim programmer.

---

### 📑 DAFTAR ISI PANDUAN OPERASIONAL

1. [Cara Menambahkan Akun Karyawan Baru (Create Staff)](#1-cara-menambahkan-akun-karyawan-baru)
2. [Cara Mengedit & Memperbarui Data Karyawan](#2-cara-mengedit--memperbarui-data-karyawan)
3. [Cara Menonaktifkan Akun Karyawan (Disable Staff)](#3-cara-menonaktifkan-akun-karyawan)
4. [Cara Menetapkan Ekosistem Brand Resmi (Assign Brand)](#4-cara-menetapkan-ekosistem-brand-resmi)
5. [Cara Menetapkan Cabang Service Center (Assign Branch)](#5-cara-menetapkan-cabang-service-center)
6. [Cara Menugaskan Program Pelatihan (Assign Training)](#6-cara-menugaskan-program-pelatihan)
7. [Cara Membuat Training Program Baru](#7-cara-membuat-training-program-baru)
8. [Cara Mengatur Struktur Modul Mingguan (Week)](#8-cara-mengatur-struktur-modul-mingguan)
9. [Cara Menambahkan Kursus Baru (Create Course)](#9-cara-menambahkan-kursus-baru)
10. [Cara Mengunggah Dokumen SOP (Upload PDF)](#10-cara-mengunggah-dokumen-sop)
11. [Cara Mengunggah Video Tutorial Servis (Upload Video)](#11-cara-mengunggah-video-tutorial-servis)
12. [Cara Menerbitkan Materi Pembelajaran (Publish Material)](#12-cara-menerbitkan-materi-pembelajaran)
13. [Cara Melakukan AI Question Generation](#13-cara-melakukan-ai-question-generation)
14. [Cara Memberikan Izin Ujian Ulang (Grant Retake)](#14-cara-memberikan-izin-ujian-ulang)
15. [Cara Membaca & Memfilter Audit Log Keamanan](#15-cara-membaca--memfilter-audit-log-keamanan)
16. [Cara Mereset Kata Sandi Karyawan Secara Aman](#16-cara-mereset-kata-sandi-karyawan-secara-aman)
17. [Cara Memantau & Me-review Antrean AI Jobs](#17-cara-memantau--me-review-antrean-ai-jobs)
18. [Cara Melakukan Pengarsipan Materi Lama (Archive Material)](#18-cara-melakukan-pengarsipan-materi-lama)

---

### 1. Cara Menambahkan Akun Karyawan Baru
1. Masuk sebagai **Super Admin** atau **Trainer**.
2. Buka menu **Manajemen Pengguna** (`/admin/users`).
3. Klik tombol biru **"+ Tambah Karyawan"**.
4. Masukkan **Nama Lengkap**, **NIK Unik** (misal: `UC10045`), **Email**, **Nomor WhatsApp**, **Peran/Role**, dan pilih **Cabang Service Center**.
5. Pilih **Job Profile** (*Technician*, *Customer Service*, atau *Admin*).
6. Centang **Brand Partner Resmi** yang ditangani karyawan.
7. Klik **"Simpan & Buat Akun"**. Sistem akan meng-generate kata sandi sementara yang wajib diganti saat login pertama.
8. Gunakan tombol **"Kirim Kredensial via WhatsApp"** untuk mengirimkan info login secara instan ke nomor karyawan.

---

### 2. Cara Mengedit & Memperbarui Data Karyawan
1. Di halaman `/admin/users`, gunakan kolom pencarian untuk menemukan karyawan berdasarkan NIK atau Nama.
2. Klik tombol opsi (titik tiga) di ujung kanan baris karyawan, lalu pilih **"Edit Profil"**.
3. Perbarui informasi yang diperlukan (misal: mutasi cabang, penambahan otorisasi brand baru).
4. Klik **"Perbarui Data"**. Perubahan akan tercatat di Audit Log.

---

### 3. Cara Menonaktifkan Akun Karyawan (Disable Staff)
1. Cari akun karyawan yang telah resign atau dipindahtugaskan di `/admin/users`.
2. Klik tombol aksi lalu pilih **"Nonaktifkan Akun"**.
3. Konfirmasi alasan penonaktifan.
4. Akun langsung berstatus `INACTIVE`, sesi login aktif otomatis dicabut, dan seluruh token API karyawan dibatalkan secara permanen.

---

### 4. Cara Menetapkan Ekosistem Brand Resmi (Assign Brand)
1. Buka formulir detail karyawan di `/admin/users`.
2. Pada bagian **"Brand Otorisasi"**, centang brand yang relevan (*Xiaomi, Huawei, Ecovacs, Tineco, Laifen, Yoniev*).
3. Simpan. Karyawan hanya akan dapat mengakses materi pelatihan dan SOP khusus brand yang telah dicentang.

---

### 5. Cara Menetapkan Cabang Service Center (Assign Branch)
1. Pada menu pengguna, pilih cabang penugasan resmi (*Jakarta Pusat, Surabaya, Bandung, Medan, Makassar*).
2. Supervisor dari cabang bersangkutan akan secara otomatis memperoleh visibilitas pemantauan terhadap karyawan tersebut.

---

### 6. Cara Menugaskan Program Pelatihan (Assign Training)
1. Buka menu **Pelatihan** (`/training`).
2. Pilih Training Program yang sesuai (misal: *Teknisi Handphone Xiaomi Level 1*).
3. Klik **"Tugaskan Peserta"**, pilih nama-nama teknisi, lalu tentukan **Tanggal Mulai** dan **Batas Waktu (Deadline)**.
4. Klik **"Kirim Penugasan"**. Peserta akan menerima notifikasi otomatis di dashboard masing-masing.

---

### 7. Cara Membuat Training Program Baru
1. Buka menu **Kurikulum** (`/courses`).
2. Klik **"Buat Program Pelatihan"**.
3. Isi Judul Program, Deskripsi, Brand Terafiliasi, Job Profile target, dan Estimasi Durasi (dalam minggu).
4. Klik **"Simpan Program"**.

---

### 8. Cara Mengatur Struktur Modul Mingguan (Week)
1. Masuk ke halaman detail Training Program.
2. Klik **"+ Tambah Minggu (Week)"**.
3. Masukkan nomor minggu (misal: *Week 1: Pengenalan SOP & Kebijakan Garansi*) dan target capaian kompetensi.

---

### 9. Cara Menambahkan Kursus Baru (Create Course)
1. Di dalam Week yang telah dibuat, klik **"+ Tambah Kursus (Course)"**.
2. Masukkan judul kursus, ringkasan materi, dan urutan modul pembelajaran.

---

### 10. Cara Mengunggah Dokumen SOP (Upload PDF)
1. Pada halaman kursus, klik **"Tambah Materi"** lalu pilih tipe **PDF SOP**.
2. Unggah file dokumen SOP resmi (format `.pdf`, pastikan teks dapat di-ekstrak).
3. Tentukan jumlah halaman minimum yang wajib dibaca peserta.

---

### 11. Cara Mengunggah Video Tutorial Servis (Upload Video)
1. Pilih tipe materi **Video Tutorial**.
2. Masukkan URL video MP4 / streaming HLS internal.
3. Masukkan total durasi video dalam detik. Sistem anti-skip akan memantau tontonan peserta melalui mekanisme heartbeat interval 10 detik.

---

### 12. Cara Menerbitkan Materi Pembelajaran (Publish Material)
1. Pastikan dokumen PDF atau Video telah berstatus `APPROVED` oleh Content Owner.
2. Ubah status materi dari `DRAFT` menjadi `PUBLISHED`.
3. Materi langsung tersedia di dashboard peserta yang terdaftar pada program tersebut.

---

### 13. Cara Melakukan AI Question Generation
1. Buka materi PDF yang telah diunggah.
2. Klik tombol **"Generate Soal dengan AI"**.
3. Pilih jumlah soal pilihan ganda (misal: 10 soal).
4. AI akan mengekstrak pengetahuan inti dokumen dan menghasilkan soal lengkap dengan kunci jawaban, pembahasan, dan nomor halaman rujukan resmi.
5. Trainer meninjau draf soal (*Human Review*). Jika sesuai, klik **"Setujui & Terbitkan Ujian"**.

---

### 14. Cara Memberikan Izin Ujian Ulang (Grant Retake)
1. Buka menu **Laporan & Nilai** (`/reports`).
2. Cari peserta yang berstatus `FAILED` pada ujian mingguan.
3. Klik tombol **"Beri Izin Retake"**.
4. Masukkan alasan pemberian remedial (misal: *Sudah mengikuti bimbingan meja kerja oleh Trainer*).
5. Karyawan akan memperoleh 1 kesempatan pengerjaan ujian ulang.

---

### 15. Cara Membaca & Memfilter Audit Log Keamanan
1. Buka menu **Audit Trail** (`/admin/audit`).
2. Filter berdasarkan **Aktor (Email/NIK)**, **Tindakan (Action)**, atau **Rentang Tanggal**.
3. Periksa peristiwa penting seperti `USER_CREATED`, `LOGIN_ATTEMPT`, `EXAM_SUBMITTED`, atau `CERTIFICATE_ISSUED`.

---

### 16. Cara Mereset Kata Sandi Karyawan Secara Aman
1. Buka menu `/admin/users` dan temukan akun bersangkutan.
2. Klik **"Reset Password"**.
3. Sistem akan menghasilkan kata sandi sementara berkekuatan tinggi.
4. Salin kata sandi atau kirim langsung ke WhatsApp karyawan. Karyawan akan dipaksa mengganti kata sandi saat login berikutnya.

---

### 17. Cara Memantau & Me-review Antrean AI Jobs
1. Buka menu **Pengaturan Sistem** (`/settings`) pada tab **AI & Background Workers**.
2. Pantau status antrean pemrosesan dokumen PDF, transkrip video, dan pembuatan soal.
3. Jika terdapat antrean dengan status `FAILED`, klik **"Retry Job"** setelah memastikan koneksi API provider aktif.

---

### 18. Cara Melakukan Pengarsipan Materi Lama (Archive Material)
1. Ketika SOP versi baru diterbitkan, buka materi versi lama di `/courses`.
2. Ubah status materi menjadi `ARCHIVED`.
3. Materi lama tidak akan muncul pada daftar penugasan peserta baru, namun riwayat belajar teknisi lama yang telah lulus tetap tersimpan utuh di basis data.

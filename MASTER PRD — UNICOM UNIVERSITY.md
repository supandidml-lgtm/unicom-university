# MASTER PRD — UNICOM UNIVERSITY

**Document Version:** 1.0  
**Application:** Unicom University  
**Application Type:** Enterprise Web-Based Learning Management System  
**Status:** MASTER SOURCE OF TRUTH  
**Primary Language:** Bahasa Indonesia  
**Target:** Internal Company Training Platform  
**Implementation Agent:** Google Antigravity  

---

# 1. DOCUMENT AUTHORITY

Dokumen ini adalah **MASTER PRD** dan menjadi sumber kebenaran utama selama pengembangan Unicom University.

Urutan prioritas instruksi:

1. MASTER PRD ini.
2. `.agents/rules/`
3. Technical architecture documentation.
4. Database specification.
5. Security specification.
6. Design system.
7. Testing specification.
8. Task/Phase prompt.
9. Implementation decision oleh AI.

Jika terdapat konflik antara implementasi dan MASTER PRD:

> MASTER PRD WAJIB MENANG.

Antigravity dilarang:

- menghapus requirement tanpa instruksi;
- mengganti business rule;
- mengubah arsitektur utama secara sepihak;
- mengurangi security requirement;
- melewati testing;
- melanjutkan Phase berikutnya sebelum diperintahkan;
- membuat mock feature dan menganggapnya selesai;
- membuat tombol yang tidak berfungsi;
- menggunakan placeholder sebagai implementasi akhir;
- mengubah permission untuk sekadar membuat test berhasil.

---

# 2. PRODUCT NAME

## Unicom University

Unicom University adalah platform Learning Management System internal yang digunakan untuk:

- onboarding staff;
- training technician;
- training Customer Service;
- training Admin;
- training per brand;
- training multibrand;
- distribusi materi;
- video learning;
- PDF learning;
- exam otomatis;
- monitoring progress;
- monitoring nilai;
- monitoring pass rate;
- monitoring peserta oleh Trainer;
- monitoring staff oleh Supervisor;
- reporting training.

---

# 3. PRODUCT VISION

Membangun satu pusat training internal perusahaan yang dapat memastikan seluruh peserta memperoleh materi yang sesuai dengan:

- posisi;
- brand;
- cabang;
- program training;

serta memberikan kemampuan perusahaan untuk mengetahui:

> siapa yang sudah belajar,  
> apa yang sudah dipelajari,  
> berapa progress-nya,  
> bagaimana hasil exam-nya,  
> dan apakah peserta sudah memenuhi standar training.

---

# 4. CORE PRINCIPLES

Unicom University wajib mengikuti prinsip:

### 4.1 Secure by Default

Akses diberikan berdasarkan permission.

### 4.2 Server Authoritative

Progress, nilai, permission, dan completion tidak boleh ditentukan hanya dari frontend.

Backend adalah sumber kebenaran.

### 4.3 Configurable

Jangan hardcode:

- brand;
- branch;
- jumlah week;
- passing grade;
- jumlah exam;
- role assignment;
- urutan course;
- training duration.

### 4.4 Auditability

Aktivitas penting harus dapat ditelusuri.

### 4.5 Anti-Cheating

Learning progress tidak cukup hanya berdasarkan klik "Open".

### 4.6 Grounded AI

AI hanya boleh membuat exam berdasarkan materi training yang tersedia.

### 4.7 Responsive

Aplikasi harus nyaman digunakan pada:

- Desktop;
- Laptop;
- Tablet;
- Mobile.

---

# 5. USER MODEL

Pisahkan antara:

## SYSTEM ROLE

dan:

## JOB PROFILE

---

# 6. SYSTEM ROLES

Role utama:

```text
SUPER_ADMIN
TRAINER
SUPERVISOR
STAFF
```

---

# 7. JOB PROFILE

Job Profile:

```text
ADMIN
TECHNICIAN
CUSTOMER_SERVICE
```

Job Profile hanya berlaku untuk user dengan role STAFF.

Contoh:

```text
System Role:
STAFF

Job Profile:
TECHNICIAN

Brand:
Xiaomi

Branch:
Jakarta

NIK:
UC12345
```

---

# 8. SUPER ADMINISTRATOR

Super Administrator mempunyai level akses tertinggi.

Super Administrator dapat:

- membuat user;
- mengedit user;
- menonaktifkan user;
- mengaktifkan kembali user;
- reset credential user;
- menentukan role;
- membuat Trainer;
- membuat Supervisor;
- membuat Staff;
- membuat Branch;
- membuat Brand;
- membuat Training Program;
- menentukan jumlah Week;
- membuat Course;
- upload material;
- mengatur exam;
- mengatur passing score;
- mengatur attempts;
- melihat seluruh progress;
- melihat seluruh nilai;
- melihat report;
- melihat audit log;
- mengatur konfigurasi sistem.

Super Administrator tidak boleh dibuat oleh Trainer atau Supervisor.

---

# 9. TRAINER

Trainer bertugas mengelola peserta training.

Trainer dapat:

- melihat trainee;
- membuat Staff jika diberikan permission;
- mengisi NIK;
- menentukan Branch;
- menentukan Brand;
- menentukan Training Program;
- menentukan Job Profile;
- menentukan Training Start Date;
- menentukan Training Deadline;
- melihat progress training;
- melihat Course Progress;
- melihat Exam Progress;
- melihat Score;
- melihat Pass Rate;
- melihat peserta yang tertinggal;
- melihat aktivitas training.

Trainer tidak boleh:

- membuat Super Admin;
- meningkatkan dirinya menjadi Super Admin;
- mengubah global security settings;
- melihat data di luar scope apabila access scope diberlakukan.

---

# 10. SUPERVISOR / SPV

Supervisor digunakan untuk monitoring.

Supervisor dapat melihat Staff berdasarkan scope yang diberikan.

Contoh scope:

```text
Branch Jakarta
```

atau:

```text
Region Jabodetabek
```

Supervisor dapat melihat:

- staff;
- program training;
- progress;
- course completion;
- exam completion;
- nilai;
- pass/fail;
- training deadline.

Default Supervisor adalah **read-only monitoring role**.

Supervisor tidak boleh mengedit materi training kecuali mendapat permission tambahan.

---

# 11. STAFF

Staff adalah peserta training.

Staff mempunyai Job Profile:

- Technician;
- Customer Service;
- Admin.

Staff hanya dapat melihat Training Program yang di-assign kepada dirinya.

Staff tidak boleh:

- melihat user lain;
- melihat global reports;
- mengubah brand assignment;
- mengubah branch assignment;
- mengubah nilai;
- memanipulasi progress;
- membuka admin API.

---

# 12. ACCOUNT REGISTRATION

Tidak tersedia public self-registration.

Artinya:

```text
/register
```

tidak tersedia untuk publik.

User harus dibuat oleh authorized user.

Minimum data:

```text
Full Name
NIK
Username / Email
System Role
Job Profile
Branch
Account Status
```

Untuk Staff:

```text
Brand / Training Assignment
```

juga diperlukan.

---

# 13. NIK

NIK merupakan Employee ID perusahaan.

Requirement:

- NIK wajib untuk Staff;
- NIK harus unik;
- NIK tidak boleh digunakan dua akun aktif berbeda;
- perubahan NIK dicatat di Audit Log.

---

# 14. ACCOUNT STATUS

Gunakan:

```text
ACTIVE
INACTIVE
SUSPENDED
PENDING_ACTIVATION
```

User INACTIVE atau SUSPENDED tidak dapat login.

---

# 15. FIRST LOGIN

Pada provisioning account:

1. User dibuat.
2. User menerima credential/activation method.
3. User login.
4. Jika menggunakan temporary password:
   - wajib mengganti password.
5. Session lama tidak boleh tetap aktif setelah password reset administratif.

---

# 16. BRAND MANAGEMENT

Brand tidak boleh hardcoded.

Contoh:

```text
Xiaomi
Huawei
Ecovacs
Tineco
Laifen
Yoniev
Multibrand
```

merupakan data database.

Super Admin dapat:

- Create Brand;
- Edit Brand;
- Activate Brand;
- Deactivate Brand.

Brand yang sudah mempunyai training history tidak boleh destructive delete.

Gunakan archive/deactivate.

---

# 17. BRANCH MANAGEMENT

Branch harus configurable.

Minimum:

```text
Branch Name
Branch Code
Location
Status
```

Super Admin dapat:

- create;
- edit;
- activate;
- deactivate.

Branch yang mempunyai user/history tidak boleh destructive delete.

---

# 18. TRAINING PROGRAM

Struktur utama:

```text
BRAND
  ↓
TRAINING PROGRAM
  ↓
WEEK
  ↓
COURSE
  ↓
MATERIAL
  ↓
EXAM
```

Contoh:

```text
Brand:
Xiaomi

Program:
Xiaomi Technician Training

Duration:
4 Weeks
```

---

# 19. PROGRAM CONFIGURATION

Training Program harus memiliki:

```text
Program Name
Brand
Applicable Job Profile
Description
Number of Weeks
Start Rule
Completion Rule
Sequential Learning
Passing Requirement
Status
Version
```

---

# 20. NUMBER OF WEEKS

Jumlah Week configurable.

Jangan hardcode:

```text
4 weeks
```

Program dapat mempunyai:

```text
3 Week
4 Week
6 Week
8 Week
```

atau jumlah lain.

---

# 21. MULTIBRAND

Multibrand harus dibuat sebagai konsep program/assignment yang configurable.

Jangan membuat kondisi:

```javascript
if (brand === "multibrand")
```

untuk menentukan seluruh logic bisnis.

Program Multibrand dapat berisi beberapa Brand Track.

Contoh:

```text
MULTIBRAND PROGRAM

Xiaomi
Huawei
Honor
ZTE
```

User Multibrand hanya melihat brand/program yang memang menjadi assignment-nya.

---

# 22. TRAINING ASSIGNMENT

Training Assignment menghubungkan:

```text
USER
+
TRAINING PROGRAM
+
BRANCH
+
TRAINER
+
START DATE
+
DEADLINE
```

Satu Staff dapat memiliki lebih dari satu Training Assignment sepanjang lifecycle pekerjaannya.

Historical assignment tidak boleh hilang ketika mendapat training baru.

---

# 23. TRAINING ASSIGNMENT STATUS

Gunakan:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
FAILED
OVERDUE
CANCELLED
```

---

# 24. WEEK STRUCTURE

Setiap Training Program dapat memiliki Week:

```text
Week 1
Week 2
Week 3
...
Week N
```

Setiap Week mempunyai:

```text
Title
Description
Order
Unlock Rule
Courses
Exam Requirement
```

---

# 25. COURSE

Course merupakan unit pembelajaran.

Contoh:

```text
Week 1

Course:
Pengenalan Perusahaan

Course:
SOP Layanan

Course:
Penggunaan System

Course:
Basic Troubleshooting
```

---

# 26. MATERIAL TYPES — MVP

Versi awal wajib mendukung:

```text
VIDEO
PDF
```

Arsitektur harus memungkinkan penambahan:

```text
TEXT
IMAGE
DOCUMENT
LINK
INTERACTIVE_CONTENT
```

di masa depan tanpa redesign database besar.

---

# 27. COURSE ORDER

Setiap Course memiliki:

```text
display_order
```

Admin dapat mengatur urutan.

---

# 28. SEQUENTIAL MODE

Training Program memiliki konfigurasi:

```text
Sequential Learning:
ON / OFF
```

Jika ON:

```text
Course 1
↓ COMPLETE
Course 2
↓ COMPLETE
Course 3
↓ COMPLETE
Exam
```

Course berikutnya tetap LOCKED sebelum prerequisite selesai.

---

# 29. LEARNING STATUS

Material/Course menggunakan:

```text
LOCKED
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Exam:

```text
LOCKED
AVAILABLE
IN_PROGRESS
PASSED
FAILED
```

---

# 30. IMPORTANT LIMITATION

Sistem secara teknis **tidak dapat mengetahui isi pikiran user dan membuktikan bahwa seseorang benar-benar memahami setiap tulisan**.

Karena itu Unicom University mengukur:

> verified learning engagement.

Untuk PDF berdasarkan:

- page exposure;
- active reading duration;
- page traversal;
- completion;
- user activity.

Untuk video berdasarkan:

- unique watched segments;
- active playback time;
- seek validation;
- heartbeat.

Exam kemudian digunakan untuk mengukur pemahaman.

---

# 31. VIDEO PLAYER

Gunakan controlled video player.

Video Player wajib mendukung:

- play;
- pause;
- volume;
- fullscreen;
- playback position;
- resume position;
- completion tracking.

---

# 32. VIDEO ANTI-SKIP

Peserta tidak boleh melompati bagian video yang belum ditonton.

Contoh:

```text
Watched until:
08:32

User attempts:
18:00

Result:
DENIED
```

Peserta boleh kembali ke bagian yang sudah ditonton.

---

# 33. VIDEO PROGRESS

Jangan menggunakan hanya:

```text
currentTime / duration
```

Gunakan unique watched segment tracking.

Contoh:

```text
0:00 - 04:00 watched
08:00 - 12:00 watched
```

tidak berarti 100%.

Server harus mengetahui bagian yang benar-benar pernah diputar.

---

# 34. VIDEO HEARTBEAT

Frontend mengirim progress heartbeat secara periodik.

Payload konseptual:

```json
{
  "materialId": "...",
  "sessionId": "...",
  "currentPosition": 312,
  "playing": true
}
```

Backend melakukan validasi.

Frontend tidak boleh dapat mengirim:

```text
progress = 100
```

sebagai final authority.

---

# 35. VIDEO COMPLETION THRESHOLD

Default:

```text
98%
```

unique video segments harus sudah ditonton.

Threshold harus configurable.

98% dipilih untuk menghindari masalah teknis beberapa detik terakhir media.

---

# 36. PLAYBACK SPEED

Default policy:

```text
1x
```

Super Admin dapat mengaktifkan:

```text
1.25x
1.5x
```

secara global/program-specific di masa depan.

Jika tidak diperlukan pada MVP, speed control dikunci 1x.

---

# 37. BACKGROUND PLAYBACK

Jika browser/tab kehilangan active state dalam waktu panjang, sistem harus dapat membedakan playback aktif dan tidak aktif.

Progress tidak boleh dimanipulasi dengan membiarkan video berjalan tanpa heartbeat valid.

---

# 38. VIDEO RESUME

Ketika user kembali:

```text
Resume from last validated progress
```

bukan dari progress lokal browser semata.

---

# 39. PDF VIEWER

PDF harus dibuka melalui viewer aplikasi.

Viewer harus menyediakan:

- page navigation;
- zoom;
- responsive display;
- page number;
- current position;
- progress.

---

# 40. PDF TRACKING

Sistem menyimpan:

```text
Pages Viewed
Active Reading Time
Current Page
Last Activity
Completed Pages
```

---

# 41. PDF ANTI-FAKE-COMPLETION

Scroll langsung ke bottom tidak menghasilkan 100%.

Material PDF dianggap selesai ketika:

1. Required pages telah dikunjungi.
2. Minimum engagement requirement terpenuhi.
3. End-of-document telah dicapai.
4. Server mengesahkan completion.

---

# 42. DOCUMENT COMPLETION THRESHOLD

Default:

```text
Required Pages:
100%

Minimum Engagement:
configurable
```

Material yang sangat singkat dapat menggunakan requirement yang berbeda.

---

# 43. CONTENT VERSIONING

Material harus memiliki version.

Jika Admin mengganti PDF atau video setelah peserta sudah training:

- historical completion tidak boleh rusak;
- material version lama tetap tercatat;
- assignment baru dapat menggunakan version baru.

---

# 44. PROGRESS ENGINE

Progress Engine adalah modul bisnis penting dan harus bersifat server-authoritative.

Progress terdiri dari:

```text
Material Progress
Course Progress
Week Progress
Training Progress
Exam Progress
```

---

# 45. MATERIAL PROGRESS

Range:

```text
0 - 100
```

Tetapi `COMPLETED` hanya diberikan setelah completion rule terpenuhi.

---

# 46. COURSE PROGRESS

Jika Course memiliki 4 required material:

```text
Video A 100
PDF A   100
Video B  80
PDF B   60
```

maka display progress dapat dihitung berdasarkan weighted average.

Namun Course Status tetap:

```text
IN_PROGRESS
```

sampai semua required material memenuhi completion rule.

---

# 47. WEEK PROGRESS

Week Progress dihitung dari required Course dan required Exam di dalam Week.

Formula tidak boleh tersebar di frontend.

Satu centralized Progress Engine harus menentukan nilai.

---

# 48. COURSE PROGRESS VS EXAM PROGRESS

Dashboard harus memisahkan:

```text
Course Progress
Exam Progress
Overall Training Progress
```

Jangan mencampurkan Score dengan Progress.

---

# 49. DEFAULT OVERALL PROGRESS

Default:

```text
Course Completion Weight = 60%
Exam Completion Weight   = 40%
```

Formula:

```text
Overall Progress =
(Course Progress × 0.60)
+
(Exam Progress × 0.40)
```

Weight harus configurable.

---

# 50. SCORE BUKAN PROGRESS

Contoh:

```text
Exam Progress:
100%

Exam Score:
70

Passing Score:
80

Status:
FAILED
```

Peserta sudah mengerjakan exam 100%, tetapi belum lulus.

Keduanya berbeda.

---

# 51. PASS RATE

Pass Rate:

```text
Passed Required Exams
--------------------- × 100
Submitted Required Exams
```

Dashboard juga harus menyediakan:

```text
Exam Completion %
Average Score
Pass Rate
```

sebagai metrik terpisah.

---

# 52. EXAM UNLOCK

Exam hanya AVAILABLE jika prerequisite learning material selesai.

Contoh:

```text
Video = COMPLETED
PDF   = COMPLETED

→ EXAM AVAILABLE
```

Jika belum:

```text
EXAM LOCKED
```

---

# 53. AI EXAM GENERATION

Exam harus dapat dibuat otomatis dari:

```text
PDF
VIDEO
```

Peserta tidak perlu menunggu AI membuat soal setelah course selesai.

Exam harus di-generate **ketika material dipublish atau diperbarui**.

Dengan demikian saat learner menyelesaikan course:

```text
Exam langsung tersedia
```

jika generation telah sukses.

---

# 54. AI EXAM PIPELINE — PDF

```text
PDF Upload
↓
File Validation
↓
Text Extraction
↓
Structure Detection
↓
Content Normalization
↓
Chunking
↓
Knowledge Extraction
↓
Question Generation
↓
Answer Generation
↓
Source Grounding
↓
Question Validation
↓
Duplicate Detection
↓
Exam Version
↓
READY
```

---

# 55. AI EXAM PIPELINE — VIDEO

```text
Video Upload
↓
Media Validation
↓
Audio Extraction
↓
Transcript Generation
↓
Transcript Normalization
↓
Chunking
↓
Knowledge Extraction
↓
Question Generation
↓
Answer Generation
↓
Source Grounding
↓
Validation
↓
Exam READY
```

Jika video sudah memiliki valid transcript/caption, sistem dapat menggunakannya.

---

# 56. GROUNDED QUESTION GENERATION

AI **DILARANG** membuat aturan perusahaan berdasarkan pengetahuan umum model.

Setiap Question harus mempunyai internal source reference seperti:

```text
material_id
material_version
source_chunk_id
page_number
timestamp_start
timestamp_end
```

tergantung jenis material.

---

# 57. AI HALLUCINATION RULE

Jika sumber tidak cukup:

```text
DO NOT GENERATE
```

Jangan mengarang.

Generation Job harus mengembalikan:

```text
INSUFFICIENT_SOURCE
```

atau status kegagalan yang sesuai.

---

# 58. AI QUESTION TYPES — MVP

Prioritas V1:

```text
MULTIPLE_CHOICE
MULTIPLE_ANSWER
TRUE_FALSE
```

Essay AI grading bukan requirement wajib MVP.

Arsitektur boleh dipersiapkan untuk future:

```text
ESSAY
CASE_STUDY
```

---

# 59. AI EXAM SETTINGS

Admin dapat mengatur:

```text
Question Count
Passing Score
Attempt Limit
Randomize Questions
Randomize Answers
Difficulty Distribution
Question Types
Exam Duration
```

---

# 60. DEFAULT DIFFICULTY

Jika tidak dikonfigurasi:

```text
Easy   20%
Medium 50%
Hard   30%
```

---

# 61. QUESTION VALIDATION

Question validator minimal memeriksa:

- answer tersedia pada source;
- pertanyaan tidak ambigu;
- hanya satu correct answer untuk MCQ;
- multi-answer memiliki correct option yang valid;
- distractor masuk akal;
- tidak duplicate;
- tidak bertentangan dengan materi;
- bahasa dapat dipahami;
- tidak mencantumkan jawaban dalam wording soal.

---

# 62. LOW CONFIDENCE QUESTIONS

Jika confidence di bawah threshold:

```text
REJECT
```

atau:

```text
REVIEW_REQUIRED
```

Jangan otomatis memasukkan soal berisiko ke exam peserta.

---

# 63. EXAM VERSIONING

Exam tidak boleh destructive overwrite.

Gunakan:

```text
Exam V1
Exam V2
Exam V3
```

Historical attempt tetap merujuk version yang dikerjakan peserta.

---

# 64. EXAM ATTEMPT

Simpan:

```text
user
exam
exam_version
started_at
submitted_at
score
status
attempt_number
```

---

# 65. EXAM RANDOMIZATION

Jika enabled:

- question order random;
- answer option random;
- randomization server-side.

Correct answer ID tidak boleh dikirim secara terbuka sebelum submission.

---

# 66. AUTO GRADING

Objective question:

```text
MULTIPLE_CHOICE
MULTIPLE_ANSWER
TRUE_FALSE
```

harus auto-grade.

Score ditentukan backend.

Frontend tidak boleh menghitung nilai final.

---

# 67. PASSING SCORE

Passing Score configurable:

```text
0 - 100
```

Contoh:

```text
80
```

Jika:

```text
score >= 80
```

status:

```text
PASSED
```

Jika tidak:

```text
FAILED
```

---

# 68. RETAKE

Admin dapat mengatur:

```text
Attempt Limit
```

Contoh:

```text
2
```

Setelah batas tercapai:

```text
RETAKE_LOCKED
```

Trainer/Super Admin dapat memberikan additional attempt jika memiliki permission.

Semua perubahan dicatat Audit Log.

---

# 69. STAFF DASHBOARD

Staff Dashboard menampilkan minimal:

```text
Greeting
Current Training
Brand
Training Progress
Course Progress
Exam Progress
Average Score
Pass Rate
Current Week
Next Course
Deadline
Training Status
```

---

# 70. STAFF DASHBOARD EXAMPLE

```text
UNICOM UNIVERSITY

Good Morning, Andi

Xiaomi Technician Training

Overall Progress        68%
Course Progress         75%
Exam Progress           55%

Average Score           87
Pass Rate               90%

Current:
Week 3

Week 1   Completed
Week 2   Completed
Week 3   In Progress
Week 4   Locked

[Continue Learning]
```

---

# 71. BRAND-BASED DASHBOARD

Jika assigned:

```text
Xiaomi
```

tampilkan Xiaomi training.

Jangan menampilkan training brand lain.

Jika Multibrand:

tampilkan program dan track yang memang di-assign.

Authorization harus diterapkan backend.

---

# 72. TRAINER DASHBOARD

Trainer Dashboard:

```text
Total Trainees
Active Training
Completed
In Progress
Overdue
At Risk
Average Progress
Average Score
Pass Rate
```

---

# 73. TRAINER FILTER

Filter:

```text
Brand
Branch
Job Profile
Program
Week
Training Status
Completion %
Score
Pass / Fail
Deadline
```

---

# 74. AT-RISK LEARNER

Sistem harus dapat menandai peserta berisiko berdasarkan rule configurable.

Contoh rule:

- deadline mendekat;
- progress terlalu rendah;
- exam gagal berulang;
- tidak ada aktivitas beberapa hari.

Default sederhana dapat digunakan pada MVP.

---

# 75. SUPERVISOR DASHBOARD

Supervisor melihat scope staff-nya.

Minimum:

```text
Total Staff
Training Progress
Completed
In Progress
Failed
Overdue
Average Score
Pass Rate
```

Supervisor dapat drill-down ke peserta jika memiliki permission.

---

# 76. SUPER ADMIN DASHBOARD

Global overview:

```text
Total Users
Active Trainees
Brands
Branches
Training Programs
Completion Rate
Average Score
Pass Rate
Overdue Training
Recent Activity
AI Generation Status
```

---

# 77. DASHBOARD DATA

Dashboard tidak boleh menggunakan mock data di production.

Dashboard harus berasal dari API/database asli.

Loading state dan error state wajib ada.

---

# 78. ACTIVITY EVENT

Sistem menyimpan event penting.

Contoh:

```text
USER_LOGIN
COURSE_OPENED
VIDEO_STARTED
VIDEO_PROGRESS
VIDEO_COMPLETED
DOCUMENT_OPENED
DOCUMENT_PAGE_VIEWED
DOCUMENT_COMPLETED
EXAM_UNLOCKED
EXAM_STARTED
EXAM_SUBMITTED
EXAM_PASSED
EXAM_FAILED
TRAINING_COMPLETED
```

---

# 79. AUDIT LOG

Administrative changes harus dicatat.

Contoh:

```text
USER_CREATED
USER_UPDATED
USER_DISABLED

ROLE_CHANGED
BRAND_ASSIGNED
BRANCH_CHANGED

PROGRAM_CREATED
PROGRAM_UPDATED

MATERIAL_CREATED
MATERIAL_UPDATED

EXAM_SETTING_CHANGED

EXTRA_ATTEMPT_GRANTED
```

---

# 80. AUDIT DATA

Simpan secara aman:

```text
actor
action
resource_type
resource_id
timestamp
result
relevant_metadata
```

IP/device metadata digunakan sesuai kebutuhan dan kebijakan privasi.

Jangan menyimpan password atau secret dalam logs.

---

# 81. PERMISSION ARCHITECTURE

Gunakan:

```text
RBAC
+
RESOURCE SCOPE
```

Contoh:

```text
Role:
SUPERVISOR

Permission:
training.progress.read

Scope:
Branch Jakarta
```

---

# 82. AUTHORIZATION

Frontend hiding bukan security.

Contoh Staff mencoba:

```text
GET /api/admin/users
```

Backend wajib:

```text
403 FORBIDDEN
```

---

# 83. AUTHENTICATION SECURITY

Wajib:

- password hashing modern;
- secure session management;
- secure cookies jika menggunakan cookie session;
- expiration;
- session revocation;
- rate limiting;
- login throttling;
- password reset protection.

Privileged account seperti:

```text
SUPER_ADMIN
```

harus disiapkan untuk MFA.

MFA Super Admin sangat direkomendasikan untuk production.

---

# 84. SECURITY REQUIREMENTS

Proteksi minimal:

```text
Broken Access Control
IDOR
SQL Injection
XSS
CSRF
SSRF
Brute Force
Session Hijacking
Path Traversal
Malicious File Upload
Mass Assignment
Privilege Escalation
Sensitive Data Exposure
```

---

# 85. SECURITY HEADERS

Production wajib memiliki secure HTTP headers sesuai arsitektur aplikasi.

Termasuk evaluasi:

```text
CSP
HSTS
X-Content-Type-Options
Referrer-Policy
frame protection
```

---

# 86. INPUT VALIDATION

Semua external input harus divalidasi server-side.

Jangan mempercayai:

```text
request body
query
route params
uploaded files
client-calculated progress
client-calculated permission
client-calculated exam score
```

---

# 87. FILE UPLOAD SECURITY

Wajib:

- MIME validation;
- extension validation;
- maximum size;
- safe filename;
- metadata sanitization;
- malware scanning jika infrastructure mendukung;
- private storage by default.

---

# 88. FILE ACCESS

Material private tidak boleh memiliki permanent unrestricted public URL.

Gunakan authenticated access atau short-lived signed URLs sesuai storage architecture.

---

# 89. SECRET MANAGEMENT

Dilarang memasukkan:

```text
DATABASE_PASSWORD
JWT_SECRET
API_KEY
AI_KEY
STORAGE_KEY
```

ke source repository.

Gunakan:

```text
environment variables
/
secret manager
```

`.env.example` hanya berisi nama variable, bukan real credentials.

---

# 90. UI / UX DESIGN DIRECTION

Product:

```text
Enterprise Internal LMS
```

Style:

```text
Clean
Professional
Bright
Modern
Minimal
Structured
High Information Clarity
```

Primary background:

```text
WHITE
```

---

# 91. COLOR SYSTEM

Gunakan white-dominant interface.

Accent dapat menggunakan warna cerah seperti:

```text
Blue
Sky
Cyan
Emerald
```

Semantic:

```text
Green  = success
Orange = warning
Red    = error/danger
Blue   = primary/action/info
```

Jangan menggunakan terlalu banyak warna sekaligus.

---

# 92. VISUAL RULES

Hindari:

- AI-template appearance;
- excessive gradients;
- glassmorphism berlebihan;
- terlalu banyak card;
- semua section diberi rounded rectangle;
- giant headings pada internal application;
- decorative illustration tanpa fungsi;
- random icon styles;
- excessive shadows;
- excessive empty space;
- animasi berlebihan;
- inconsistent spacing.

---

# 93. ACCESSIBILITY

Minimum:

- keyboard navigation;
- clear focus state;
- semantic HTML;
- labels;
- sufficient contrast;
- form error accessible;
- tidak hanya mengandalkan warna untuk status;
- reduced motion diperhatikan.

Target:

```text
WCAG 2.2 AA
```

untuk fitur utama sejauh practical.

---

# 94. RESPONSIVE DESIGN

Minimum viewport class:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Tables pada mobile harus memiliki adaptation yang masuk akal.

Tidak diperbolehkan sekadar mengecilkan desktop UI.

---

# 95. TASTE SKILL INSTALLATION

Taste Skill wajib di-install pada project bootstrap sebelum implementasi UI utama.

Gunakan command:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Setelah install:

1. identifikasi lokasi `SKILL.md`;
2. baca seluruh instruction terkait skill;
3. gunakan skill sebagai design discipline;
4. tetap tunduk pada MASTER PRD;
5. jangan membiarkan Taste Skill mengubah business requirement.

Design brief Unicom University:

```text
Product:
Unicom University

Type:
Enterprise internal learning management system

Audience:
Employee, Technician, CS, Trainer, Supervisor, Administrator

Vibe:
clean
bright
professional
structured
modern

Background:
white dominant

Visual Density:
medium-high for dashboards
comfortable for learning screens

Avoid:
AI dashboard template
excessive cards
excessive gradient
glassmorphism
giant typography
random colors
decorative clutter
excessive animation
```

---

# 96. PROPOSED TECHNICAL ARCHITECTURE

Gunakan architecture modular.

Recommended logical architecture:

```text
Browser
   │
   ▼
WEB FRONTEND
   │
   ▼
BACKEND API
   │
   ├─────────────┐
   │             │
   ▼             ▼
PostgreSQL    Redis / Queue
   │             │
   │             ▼
   │          Worker
   │             │
   │      ┌──────┴────────┐
   │      │               │
   ▼      ▼               ▼
Storage  AI Service   Media Processing
```

---

# 97. RECOMMENDED APPLICATION STRUCTURE

Recommended monorepo:

```text
unicom-university/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   └── validation/
│
├── database/
│
├── docs/
│
├── tests/
│
├── scripts/
│
├── .agents/
│   └── rules/
│
├── MASTER_PRD_UNICOM_UNIVERSITY.md
│
├── .env.example
└── README.md
```

---

# 98. RECOMMENDED STACK

Preferred baseline:

### Frontend

```text
Next.js
React
TypeScript
```

### Backend

```text
Node.js
NestJS
TypeScript
```

### Database

```text
PostgreSQL
```

### Cache / Queue

```text
Redis
```

### Storage

```text
S3-compatible private object storage
```

### Background Processing

Dedicated worker for:

- transcription;
- document processing;
- AI exam generation;
- long-running tasks.

Exact library versions harus menggunakan **current compatible stable releases pada Phase 0 dan dipin**, jangan menggunakan floating production dependency versions.

---

# 99. API ARCHITECTURE

Gunakan versioning:

```text
/api/v1/
```

Contoh:

```text
/api/v1/auth
/api/v1/users
/api/v1/brands
/api/v1/branches
/api/v1/training-programs
/api/v1/training-assignments
/api/v1/courses
/api/v1/materials
/api/v1/progress
/api/v1/exams
/api/v1/reports
```

---

# 100. API RESPONSE

Gunakan predictable API response dan structured errors.

Contoh error:

```json
{
  "success": false,
  "error": {
    "code": "COURSE_LOCKED",
    "message": "Course belum dapat diakses."
  }
}
```

Jangan expose:

- stack trace;
- database errors;
- secret;
- internal infrastructure detail;

kepada user production.

---

# 101. DATABASE CORE ENTITIES

Minimum:

```text
users
roles
permissions
user_roles

employee_profiles

branches

brands

training_programs
training_program_brands
training_weeks

training_assignments

courses
course_materials
material_versions

learning_sessions
video_progress
document_progress
course_progress
week_progress
training_progress

exams
exam_versions
questions
question_options
question_sources

exam_attempts
exam_answers

ai_generation_jobs

notifications

activity_events
audit_logs
```

---

# 102. DATABASE RULES

Wajib:

- foreign key;
- unique constraint;
- database index;
- timestamps;
- migration;
- transaction untuk critical operation.

Gunakan soft delete/archive untuk business entity yang memiliki historical references.

---

# 103. DATA INTEGRITY

Critical rules juga harus diproteksi database bila memungkinkan.

Contoh:

```text
NIK UNIQUE
```

Jangan hanya frontend validation.

---

# 104. TRANSACTIONS

Gunakan transaction pada operasi seperti:

- training assignment;
- exam submission;
- score finalization;
- privilege change;
- multi-record administrative action.

---

# 105. CONCURRENCY

Exam submission harus idempotent.

Double-click:

```text
Submit
Submit
```

tidak boleh membuat dua final attempts.

Progress heartbeat harus tahan terhadap out-of-order request.

---

# 106. BACKGROUND JOB

AI generation dan media processing jangan memblokir synchronous API request terlalu lama.

Gunakan job queue.

Status:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
RETRYING
```

---

# 107. AI PROVIDER ABSTRACTION

Jangan membuat seluruh LMS bergantung langsung pada satu AI vendor.

Gunakan interface:

```text
AIProvider
```

sehingga provider dapat diganti tanpa redesign seluruh application.

---

# 108. OBSERVABILITY

Production minimum:

```text
structured logs
error tracking
health checks
performance monitoring
job monitoring
```

Health endpoints minimal:

```text
/liveness
/readiness
```

sesuai deployment architecture.

---

# 109. NOTIFICATIONS — MVP

Minimum notification:

- new training assigned;
- new course available;
- exam available;
- exam passed;
- exam failed;
- deadline approaching;
- training completed.

In-app notification wajib.

Email dapat ditambahkan sesuai infrastructure.

---

# 110. SEARCH / FILTER / PAGINATION

Semua large data table wajib server-side:

- pagination;
- filtering;
- sorting;
- search.

Jangan mengambil seluruh user database ke browser hanya untuk filter.

---

# 111. REPORTING

Super Admin/Trainer sesuai permission dapat melihat:

```text
Training Completion Report
Course Progress Report
Exam Result Report
Pass/Fail Report
Branch Report
Brand Report
Staff Report
```

Future-ready untuk export:

```text
Excel / CSV
```

---

# 112. PERFORMANCE REQUIREMENTS

Target awal:

- normal page interaction responsif;
- API normal P95 target < 500 ms bila operation sederhana;
- dashboard heavy query dioptimalkan;
- media tidak dilayani langsung dari application server jika storage/CDN tersedia;
- indexes wajib diaudit;
- N+1 query dilarang;
- pagination wajib untuk large collections.

Target harus divalidasi load test pada staging.

---

# 113. BROWSER SUPPORT

Target:

- current Chrome;
- current Edge;
- current Firefox;
- current Safari.

Primary enterprise target:

```text
Chrome
Edge
```

---

# 114. ENVIRONMENTS

Wajib mempunyai:

```text
DEVELOPMENT
STAGING
PRODUCTION
```

Production tidak digunakan sebagai testing environment.

---

# 115. CI QUALITY GATE

Pull request / deployment pipeline minimal menjalankan:

```text
install
lint
typecheck
unit tests
integration tests
build
security checks
```

Critical migration harus diverifikasi.

---

# 116. TESTING STRATEGY

Gunakan:

```text
Unit Tests
Integration Tests
API Tests
E2E Tests
Browser Tests
Authorization Tests
Security Tests
Regression Tests
Accessibility Tests
Performance Tests
```

---

# 117. CRITICAL DOMAIN TESTS

Wajib mempunyai automated tests untuk:

### Authentication

- valid login;
- invalid login;
- disabled user;
- logout;
- expired session.

### Authorization

- staff cannot access admin;
- trainer cannot escalate role;
- supervisor cannot modify restricted resources;
- branch scope enforced.

### Progress

- video cannot fake completion;
- video skip denied;
- PDF scroll-only does not complete;
- duplicate heartbeat safe;
- locked course inaccessible.

### Exam

- exam stays locked before course completion;
- grading correct;
- answer randomization safe;
- attempt limit enforced;
- duplicate submission safe.

### AI

- source grounding;
- generation failure handling;
- no source → no fabricated exam.

---

# 118. BROWSER VERIFICATION

Setelah setiap Phase yang mengubah UI:

Antigravity wajib menjalankan aplikasi menggunakan browser dan memverifikasi hasil nyata.

Tidak cukup:

```text
npm run build = PASS
```

Browser verification wajib mengecek:

- layout;
- navigation;
- interaction;
- form;
- loading;
- success;
- error;
- responsive;
- permission;
- real API data.

---

# 119. SECURITY VERIFICATION

Setelah relevant Phase:

```text
dependency security audit
secret scan
authorization check
input validation
file upload validation
security headers
sensitive information review
```

Critical/High security finding harus diselesaikan sebelum production.

---

# 120. NO MOCK COMPLETION

Fitur dianggap belum selesai jika:

- button tidak bekerja;
- API placeholder;
- hardcoded fake dashboard data;
- fake progress;
- TODO untuk business logic utama;
- UI tanpa backend;
- backend tanpa permission;
- test di-disable agar PASS.

---

# 121. ERROR HANDLING

Semua halaman penting harus mempunyai:

```text
Loading State
Empty State
Error State
Success State
Permission Denied State
```

Tidak boleh blank screen jika API gagal.

---

# 122. DATABASE MIGRATIONS

Setiap database change harus menggunakan migration.

Dilarang melakukan perubahan manual production schema tanpa migration history.

Migration harus:

- reviewed;
- tested;
- backward impact evaluated;
- memiliki rollback/forward recovery strategy.

---

# 123. BACKUP

Production database:

- automated backup;
- retention policy;
- restore procedure;
- restore test.

Backup tanpa restore test tidak dianggap cukup.

---

# 124. DEPLOYMENT

Deployment architecture harus mendukung:

```text
HTTPS
Domain
DNS
Frontend
Backend
Database
Redis
Object Storage
Background Worker
Monitoring
Backup
```

---

# 125. PRODUCTION DEPLOYMENT CHECKLIST

Sebelum deploy:

```text
lint PASS
typecheck PASS
unit test PASS
integration test PASS
E2E critical PASS
build PASS
security verification PASS
migration verified
backup verified
environment variables verified
staging UAT PASS
```

---

# 126. DEPLOYMENT VERIFICATION

Setelah deployment:

```text
health check
login
dashboard
training
video
PDF
progress
exam
score
permission
logout
```

Smoke test wajib PASS.

---

# 127. ROLLBACK

Production deployment harus memiliki rollback strategy.

Jika deployment baru gagal:

```text
New Version
↓ failure
Rollback
↓
Previous Stable Version
```

Database migration harus diperhitungkan dalam rollback strategy.

---

# 128. DEVELOPMENT PHASES

## PHASE 0 — FOUNDATION

Kerjakan:

- repository setup;
- monorepo;
- package manager;
- TypeScript;
- lint;
- formatting;
- environment validation;
- base CI;
- Taste Skill installation;
- `.agents/rules/`;
- architecture documentation;
- initial application shell.

Tidak membuat business feature besar.

---

# 129. PHASE 1 — DATABASE & CORE ARCHITECTURE

Kerjakan:

- PostgreSQL;
- migration system;
- core schema;
- User;
- Role;
- Permission;
- Profile;
- Brand;
- Branch;
- Training Program;
- audit foundation.

---

# 130. PHASE 2 — AUTHENTICATION & RBAC

Kerjakan:

- login;
- logout;
- session;
- password;
- account status;
- authorization middleware;
- RBAC;
- scope;
- privileged route protection.

---

# 131. PHASE 3 — USER MANAGEMENT

Kerjakan:

- create user;
- edit user;
- activate/deactivate;
- Trainer;
- Supervisor;
- Staff;
- NIK;
- Job Profile;
- Branch assignment.

---

# 132. PHASE 4 — BRAND & TRAINING ASSIGNMENT

Kerjakan:

- Brand management;
- Training assignment;
- assign brand;
- assign program;
- assign trainer;
- start date;
- deadline.

---

# 133. PHASE 5 — TRAINING PROGRAM

Kerjakan:

- Program;
- configurable Week;
- Course;
- order;
- prerequisites;
- sequential learning;
- content version foundation.

---

# 134. PHASE 6 — LEARNING MATERIAL SYSTEM

Kerjakan:

- video upload/playback;
- PDF upload/viewer;
- access protection;
- storage;
- material publishing.

---

# 135. PHASE 7 — PROGRESS ENGINE

Kerjakan:

- learning session;
- video heartbeat;
- anti-skip;
- unique watched segment;
- PDF tracking;
- material completion;
- course progress;
- week progress;
- training progress;
- locking/unlocking.

---

# 136. PHASE 8 — AI EXAM ENGINE

Kerjakan:

- extraction;
- transcription architecture;
- chunking;
- question generation;
- source grounding;
- validation;
- generation jobs;
- versioning.

---

# 137. PHASE 9 — EXAM SYSTEM

Kerjakan:

- Exam;
- question;
- options;
- attempts;
- randomization;
- timer if enabled;
- grading;
- score;
- passing;
- pass rate;
- retake.

---

# 138. PHASE 10 — STAFF EXPERIENCE

Kerjakan:

- Staff Dashboard;
- My Training;
- Week view;
- Course Player;
- Exam;
- Results;
- Profile.

---

# 139. PHASE 11 — TRAINER DASHBOARD

Kerjakan:

- trainee monitoring;
- filters;
- progress;
- score;
- pass rate;
- assignment management;
- at-risk visibility.

---

# 140. PHASE 12 — SUPERVISOR DASHBOARD

Kerjakan:

- scoped monitoring;
- branch staff;
- progress;
- score;
- completion;
- filtering.

---

# 141. PHASE 13 — SUPER ADMIN DASHBOARD

Kerjakan:

- system overview;
- user management;
- brand;
- branch;
- training management;
- reports;
- AI processing visibility.

---

# 142. PHASE 14 — NOTIFICATION & REPORTING

Kerjakan:

- in-app notification;
- deadline alerts;
- reports;
- export foundation.

---

# 143. PHASE 15 — AUDIT & SECURITY HARDENING

Kerjakan comprehensive:

- audit;
- security;
- authorization;
- session;
- upload;
- rate limiting;
- abuse prevention;
- headers;
- secret review.

---

# 144. PHASE 16 — QA & PERFORMANCE

Kerjakan:

- regression;
- E2E;
- performance;
- accessibility;
- responsive;
- browser matrix;
- error-state verification.

---

# 145. PHASE 17 — STAGING & UAT

Deploy staging.

Lakukan UAT untuk:

```text
Super Admin
Trainer
Supervisor
Technician
CS
Admin Staff
```

Semua Critical/High defect diselesaikan.

---

# 146. PHASE 18 — PRODUCTION

Kerjakan:

- production infrastructure;
- secrets;
- SSL;
- domain;
- database;
- backup;
- application deployment;
- worker;
- monitoring;
- smoke test.

---

# 147. PHASE 19 — POST-DEPLOYMENT

Kerjakan:

- monitoring;
- backup test;
- production health;
- error review;
- performance review;
- security review;
- documentation;
- operational handover.

---

# 148. PHASE EXECUTION RULE

Antigravity harus mengerjakan **SATU PHASE SAJA** setiap diberikan instruksi.

Setelah selesai:

```text
STOP.
```

Jangan otomatis melanjutkan.

---

# 149. PHASE QUALITY GATE

Sebelum menyatakan Phase selesai:

```text
Lint PASS
Typecheck PASS
Relevant Unit Tests PASS
Relevant Integration Tests PASS
Build PASS
Security Verification PASS
Browser Verification PASS
Regression Verification PASS
Documentation Updated
```

Jika ada satu mandatory gate gagal:

```text
PHASE STATUS = NOT COMPLETE
```

---

# 150. REGRESSION POLICY

Pada Phase N:

Antigravity harus memastikan functionality Phase:

```text
0 ... N-1
```

tidak rusak.

Fix tidak boleh menghancurkan fitur lama hanya agar fitur baru PASS.

---

# 151. DEFINITION OF DONE

Feature dianggap DONE jika:

- requirement implemented;
- real backend connected;
- correct database integration;
- server validation;
- permission enforced;
- loading state;
- empty state;
- error state;
- responsive;
- relevant tests;
- security checked;
- browser verified;
- documentation updated;
- tidak mempunyai blocking TODO;
- tidak menggunakan mock data production;
- tidak mempunyai known Critical/High bug.

---

# 152. IMPLEMENTATION REPORT

Setiap Phase wajib menghasilkan report:

```text
PHASE:
STATUS:

Implemented:
-

Changed Files:
-

Database Changes:
-

Security:
-

Testing:
Lint:
Typecheck:
Unit:
Integration:
Build:
Browser:
Regression:

Known Issues:
-

Deferred Items:
-

MASTER PRD deviations:
NONE / explain

READY FOR NEXT PHASE:
YES / NO
```

---

# 153. ANTIGRAVITY RULE STRUCTURE

Buat:

```text
.agents/
└── rules/
    ├── 00-master.md
    ├── 01-architecture.md
    ├── 02-database.md
    ├── 03-backend.md
    ├── 04-frontend.md
    ├── 05-ui-ux.md
    ├── 06-security.md
    ├── 07-testing.md
    ├── 08-progress-engine.md
    └── 09-ai-exam.md
```

Jangan memasukkan seluruh aturan ke satu file besar.

---

# 154. MASTER ANTIGRAVITY BEHAVIOR

Antigravity harus:

1. membaca MASTER PRD;
2. membaca `.agents/rules/`;
3. memeriksa repository;
4. memahami existing implementation;
5. membuat plan;
6. mengerjakan hanya Phase aktif;
7. tidak menghancurkan existing implementation;
8. menjalankan quality gates;
9. memperbaiki failure yang disebabkan pekerjaannya;
10. melakukan browser verification;
11. membuat implementation report;
12. berhenti.

---

# 155. PROHIBITED AI BEHAVIOR

Dilarang:

```text
"Untuk sementara..."
"Placeholder..."
"Mock saja dulu..."
"Implementasi sederhana..."
"Nanti dapat ditambahkan..."
```

untuk requirement yang memang masuk Phase aktif.

Jangan mengganti real implementation dengan TODO.

---

# 156. CODE QUALITY

Code harus:

```text
typed
modular
readable
testable
secure
maintainable
consistent
```

Hindari:

- duplicated business logic;
- giant components;
- giant services;
- magic numbers;
- business logic tersebar di UI;
- hardcoded permissions;
- hardcoded brands;
- silent catch;
- `any` tanpa alasan kuat;
- direct database access dari UI.

---

# 157. BUSINESS LOGIC LOCATION

Logic kritikal seperti:

```text
progress
unlock
passing
attempt
permissions
assignment
```

harus berada di backend/domain layer.

Frontend hanya merepresentasikan state.

---

# 158. CENTRALIZED CONFIGURATION

Configurable values:

```text
course weight
exam weight
passing score
completion threshold
attempt limit
week count
sequential mode
deadline
```

jangan diduplikasi di berbagai komponen.

---

# 159. DATE & TIME

Database timestamp harus konsisten.

Simpan timestamp secara timezone-safe.

UI menampilkan waktu sesuai timezone organisasi/user.

Jangan menggunakan string date ambiguous.

---

# 160. PRIVACY

Hanya tampilkan data pribadi yang diperlukan.

Sensitive operational information tidak boleh muncul pada logs/client payload tanpa kebutuhan.

---

# 161. SUCCESS CRITERIA — MVP

Unicom University V1 dianggap sukses jika:

### User

Authorized user dapat membuat Staff.

### Assignment

Trainer dapat menetapkan:

- NIK;
- Job Profile;
- Branch;
- Brand;
- Training Program.

### Learning

Staff hanya melihat training yang diberikan.

### Video

Video tidak dapat diselesaikan dengan seek langsung.

### PDF

Scroll langsung ke bawah tidak menghasilkan completion palsu.

### Progress

Dashboard menunjukkan Course, Exam, dan Overall Progress yang valid.

### Exam

Exam dihasilkan otomatis berdasarkan material.

### Grounding

Pertanyaan mempunyai source reference.

### Scoring

Exam dapat dinilai otomatis.

### Monitoring

Trainer dan SPV dapat memonitor sesuai scope.

### Administration

Super Admin dapat mengelola seluruh struktur training.

### Security

User tidak dapat mengakses resource di luar permission.

### QA

Critical E2E flows PASS.

### Production

Aplikasi berhasil berjalan melalui HTTPS pada production environment dengan monitoring dan backup.

---

# 162. FINAL MASTER RULE

Tidak ada Phase yang dianggap selesai hanya karena:

```text
code compiles
```

atau:

```text
build succeeded
```

Sebuah Phase selesai hanya jika:

```text
IMPLEMENTATION
+
VALIDATION
+
SECURITY
+
TESTING
+
BROWSER VERIFICATION
+
REGRESSION CHECK
```

semuanya memenuhi acceptance criteria Phase tersebut.

---

# END OF MASTER PRD

**Project:** Unicom University  
**Version:** 1.0  
**Status:** Approved Foundation Specification  
**Purpose:** Source of Truth for Antigravity Implementation
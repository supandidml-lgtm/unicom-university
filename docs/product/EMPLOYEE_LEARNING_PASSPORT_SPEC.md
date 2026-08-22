# UNICOM UNIVERSITY
## SPESIFIKASI PASPOR BELAJAR KARYAWAN (EMPLOYEE_LEARNING_PASSPORT_SPEC.md)

======================================================================
### TUJUAN DOKUMEN
======================================================================
Dokumen ini mendefinisikan struktur data, skema rekam jejak historis, dan spesifikasi verifikasi digital untuk Paspor Belajar Karyawan (*Employee Learning Passport*) yang mendokumentasikan seluruh capaian sertifikasi dan kompetensi teknisi UNICOM.

---

### 📋 SKEMA DATA PASPOR BELAJAR DIGITAL

```typescript
export interface EmployeeLearningPassport {
  passportId: string;                 // Format: PASSPORT-UNICOM-<NIK>
  employee: {
    userId: string;
    nik: string;
    fullName: string;
    branchId: string;
    branchName: string;
    jobProfile: "TECHNICIAN" | "CUSTOMER_SERVICE" | "ADMIN";
    joinedDate: string;
    currentLevel: "FOUNDATION" | "BRAND_CERTIFIED" | "ADVANCED" | "MASTER" | "EXPERT";
  };
  certifications: Array<{
    certificateId: string;
    certificateNumber: string;
    brandName: string;
    programTitle: string;
    issuedDate: string;
    expirationDate?: string;
    status: "ACTIVE" | "EXPIRED" | "REVOKED";
    verificationUrl: string;
  }>;
  competencyRadar: {
    overallScore: number;             // 0 - 100
    overallLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    brandCoverage: Record<string, number>; // misal: { "Xiaomi": 92, "Huawei": 75, "Ecovacs": 83 }
    categoryScores: {
      sopAndStandards: number;
      hardwareRepair: number;
      softwareDiagnostics: number;
      troubleshooting: number;
      customerCommunication: number;
    };
  };
  historicalSummary: {
    totalProgramsCompleted: number;
    totalExamsPassed: number;
    averageExamScore: number;
    totalPracticalAssessments: number;
    practicalPassRate: number;
    coachingSessionsAttended: number;
  };
  immutableActivityLog: Array<{
    eventId: string;
    action: "COURSE_COMPLETED" | "EXAM_PASSED" | "PRACTICAL_PASSED" | "CERTIFICATE_EARNED" | "COACHING_COMPLETED";
    targetTitle: string;
    score?: number;
    timestamp: string;
    assessorOrSystem: string;
  }>;
}
```

---

### 🛡️ ATURAN INTEGRITAS DATA PASPOR:
1. **Prinsip Immutability:** Riwayat pencapaian ujian dan praktikum di masa lalu tidak boleh ditimpa saat teknisi mengikuti ujian baru.
2. **Portabilitas & Audit:** Data paspor dapat diekspor menjadi format PDF resmi bertanda tangan digital untuk keperluan audit sertifikasi prinsipal brand partner.

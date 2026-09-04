# Certificate Rules

Certificates derive exclusively from a canonical `COMPLETED` TrainingEnrollment with a completion timestamp and bound Curriculum Version. Issuance never changes progress, score, lifecycle, or assessment data.

- A database unique constraint permits one `TrainingCertificate` per Enrollment.
- Certificate numbers are random server-generated `UNICOM-YYYY-XXXXXXXX` identifiers, never NIK-derived and never authorization secrets.
- Participant, Brand, Curriculum, Version, and completion date are immutable snapshots at issuance. Re-generation uses this snapshot.
- PDFs are server generated with `CERTIFICATE_TEMPLATE_V1`, private storage, and no NIK, phone number, score, token, or public URL.
- Revocation retains the complete historical record but blocks normal download. It never creates a replacement certificate.
- Public verification, QR codes, and digital signatures are deliberately deferred.

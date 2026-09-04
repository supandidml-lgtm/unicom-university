# Certificate Generation and Backfill

The worker claims pending issued certificates, renders a server-side PDF, writes it to private storage, and marks it `READY`. A PDF failure marks only the PDF state `FAILED`; the canonical Enrollment remains `COMPLETED`.

Run the safe, bounded, idempotent historical backfill with `pnpm certificate:backfill`. Each run selects up to 100 completed Enrollments without a certificate. It can be run repeatedly or resumed; it does not generate PDFs during a database migration and cannot create a second certificate for an Enrollment.

Generated PDFs are only delivered through authenticated API endpoints. Never move storage keys into public buckets or send the PDF as an email attachment.

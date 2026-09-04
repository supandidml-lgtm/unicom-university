-- At most one resumable attempt can exist for an enrollment and exam.
CREATE UNIQUE INDEX "ExamAttempt_one_in_progress_per_enrollment_exam"
ON "ExamAttempt" ("enrollmentId", "examId")
WHERE "status" = 'IN_PROGRESS';

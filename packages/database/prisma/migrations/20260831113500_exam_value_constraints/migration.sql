ALTER TABLE "Exam"
  ADD CONSTRAINT "Exam_passingScoreBasisPoints_range"
  CHECK ("passingScoreBasisPoints" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "Exam_maxAttempts_positive"
  CHECK ("maxAttempts" IS NULL OR "maxAttempts" >= 1);

ALTER TABLE "ExamQuestion"
  ADD CONSTRAINT "ExamQuestion_points_positive"
  CHECK ("points" >= 1);

ALTER TABLE "ExamAttempt"
  ADD CONSTRAINT "ExamAttempt_attemptNumber_positive"
  CHECK ("attemptNumber" >= 1),
  ADD CONSTRAINT "ExamAttempt_passingScoreBasisPoints_range"
  CHECK ("passingScoreBasisPoints" BETWEEN 0 AND 10000);

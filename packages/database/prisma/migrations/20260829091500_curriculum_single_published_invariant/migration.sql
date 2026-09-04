-- Enforce one current published version while retaining retired curriculum history.
CREATE UNIQUE INDEX "CurriculumVersion_one_published_per_curriculum_key"
  ON "CurriculumVersion"("curriculumId")
  WHERE "status" = 'PUBLISHED';

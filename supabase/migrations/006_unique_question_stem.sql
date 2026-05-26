-- ============================================================
-- Unique constraint on question stem
-- Prevents inserting duplicate questions when seed files are
-- re-run or new pools overlap with existing ones.
-- ============================================================

ALTER TABLE public.questions
  ADD CONSTRAINT questions_stem_unique UNIQUE (stem);

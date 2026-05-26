-- ============================================================
-- Normalize Scrum Open questions
-- 1) Tag legacy Pool 1 rows that were seeded before pool tags existed.
-- 2) Add UNIQUE(stem) safety net to prevent future duplicates.
--
-- Run this once after merging the dedupe PR.
-- ============================================================

-- Step 1: tag legacy Pool 1 rows.
-- Without this, the DELETE clause at the top of seed_scrum_open.sql would
-- not match these rows; re-running that seed would then collide with the
-- UNIQUE constraint added in step 2.
UPDATE public.questions
SET tags = array_append(tags, 'scrum-open-pool-1')
WHERE source = 'Scrum Open Assessment'
  AND owner_id IS NULL
  AND NOT ('scrum-open-pool-1' = ANY(tags));

-- Step 2: enforce unique stems at the database level.
-- Future seeds with overlapping stems will fail loudly with the offending
-- text in the error message, instead of silently duplicating.
ALTER TABLE public.questions
  ADD CONSTRAINT questions_stem_unique UNIQUE (stem);

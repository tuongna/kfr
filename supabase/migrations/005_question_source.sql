-- ============================================================
-- Add provenance + quality label to questions
-- Cleanup self-generated test questions previously seeded via seed.sql
-- Tag existing Scrum Open Assessment questions as trusted
-- ============================================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS source  text,
  ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'reference'
    CHECK (quality IN ('trusted', 'reference'));

-- Drop the 3 sample questions inserted by supabase/seed.sql
DELETE FROM public.questions
  WHERE stem IN (
    'Who is accountable for managing the Product Backlog?',
    'During a Sprint, when is it appropriate to update the Sprint Goal?',
    'Which statement best describes the role of the Scrum Master during the Daily Scrum?'
  );

-- Promote the public Scrum Open Assessment seed to "trusted"
UPDATE public.questions
  SET source  = 'Scrum Open Assessment',
      quality = 'trusted'
  WHERE owner_id IS NULL;

-- ============================================================
-- Allow public (shared) questions — owner_id nullable
-- Questions with owner_id IS NULL are readable by all auth users.
-- ============================================================

-- Make owner_id nullable so seed data needs no specific user
ALTER TABLE public.questions ALTER COLUMN owner_id DROP NOT NULL;

-- Replace owner-only SELECT with: public rows OR own rows
DROP POLICY "owner_select" ON public.questions;
CREATE POLICY "any_or_owner_select" ON public.questions
  FOR SELECT USING (owner_id IS NULL OR owner_id = auth.uid());

-- question_options inherits public visibility from parent question
DROP POLICY "owner_via_question" ON public.question_options;
CREATE POLICY "owner_via_question" ON public.question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questions
      WHERE questions.id = question_options.question_id
        AND (questions.owner_id IS NULL OR questions.owner_id = auth.uid())
    )
  );

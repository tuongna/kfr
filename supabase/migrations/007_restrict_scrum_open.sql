-- ============================================================
-- Restrict Scrum Open Assessment questions to a single owner.
-- Questions with source = 'Scrum Open Assessment' are private
-- and readable only by natuong2017@gmail.com.
-- All other public questions (owner_id IS NULL, different source)
-- remain readable by every authenticated user.
-- ============================================================

-- questions: replace the broad public-read policy
DROP POLICY IF EXISTS "any_or_owner_select" ON public.questions;

CREATE POLICY "question_select" ON public.questions
  FOR SELECT USING (
    -- user's own questions
    owner_id = auth.uid()
    -- public questions that are NOT Scrum Open Assessment
    OR (
      owner_id IS NULL
      AND source IS DISTINCT FROM 'Scrum Open Assessment'
    )
    -- Scrum Open Assessment questions: restricted to one account
    OR (
      owner_id IS NULL
      AND source = 'Scrum Open Assessment'
      AND (auth.jwt() ->> 'email') = 'natuong2017@gmail.com'
    )
  );

-- question_options: mirror the same logic via parent question
DROP POLICY IF EXISTS "owner_via_question" ON public.question_options;

CREATE POLICY "owner_via_question" ON public.question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_options.question_id
        AND (
          q.owner_id = auth.uid()
          OR (q.owner_id IS NULL AND q.source IS DISTINCT FROM 'Scrum Open Assessment')
          OR (
            q.owner_id IS NULL
            AND q.source = 'Scrum Open Assessment'
            AND (auth.jwt() ->> 'email') = 'natuong2017@gmail.com'
          )
        )
    )
  );

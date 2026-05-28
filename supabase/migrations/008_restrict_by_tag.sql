-- ============================================================
-- Fix: restrict Scrum Open questions by TAG (not source text),
-- since some rows may have inconsistent source values.
-- Questions tagged scrum-open-pool-* are only readable by
-- natuong2017@gmail.com. All other public questions remain
-- readable by every authenticated user.
-- ============================================================

-- questions
DROP POLICY IF EXISTS "question_select"     ON public.questions;
DROP POLICY IF EXISTS "any_or_owner_select" ON public.questions;

CREATE POLICY "question_select" ON public.questions
  FOR SELECT USING (
    -- user's own questions
    owner_id = auth.uid()
    -- public questions NOT tagged as scrum-open
    OR (
      owner_id IS NULL
      AND NOT (tags && ARRAY['scrum-open-pool-1', 'scrum-open-pool-2'])
    )
    -- scrum-open questions: owner account only
    OR (
      owner_id IS NULL
      AND tags && ARRAY['scrum-open-pool-1', 'scrum-open-pool-2']
      AND (auth.jwt() ->> 'email') = 'natuong2017@gmail.com'
    )
  );

-- question_options: mirror parent question visibility
DROP POLICY IF EXISTS "owner_via_question" ON public.question_options;

CREATE POLICY "owner_via_question" ON public.question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_options.question_id
        AND (
          q.owner_id = auth.uid()
          OR (q.owner_id IS NULL AND NOT (q.tags && ARRAY['scrum-open-pool-1', 'scrum-open-pool-2']))
          OR (
            q.owner_id IS NULL
            AND q.tags && ARRAY['scrum-open-pool-1', 'scrum-open-pool-2']
            AND (auth.jwt() ->> 'email') = 'natuong2017@gmail.com'
          )
        )
    )
  );

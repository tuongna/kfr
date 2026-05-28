-- ============================================================
-- Supersedes 008: restrict ALL Scrum Open Assessment content.
-- 008 only blocked pool-1 and pool-2; pool-3+ were accessible.
-- This migration blocks anything that has:
--   source = 'Scrum Open Assessment'  (standardised on all pools)
--   OR any tag matching 'scrum-open-pool-%'  (safety net)
-- Only natuong2017@gmail.com can read those rows.
-- ============================================================

-- questions
DROP POLICY IF EXISTS "question_select"     ON public.questions;
DROP POLICY IF EXISTS "any_or_owner_select" ON public.questions;

CREATE POLICY "question_select" ON public.questions
  FOR SELECT USING (
    -- user's own questions
    owner_id = auth.uid()
    -- public questions that are NOT Scrum Open content
    OR (
      owner_id IS NULL
      AND source IS DISTINCT FROM 'Scrum Open Assessment'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(tags, '{}')) AS t(v)
        WHERE v LIKE 'scrum-open-pool-%'
      )
    )
    -- Scrum Open questions: authorised account only
    OR (
      owner_id IS NULL
      AND (
        source = 'Scrum Open Assessment'
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(tags, '{}')) AS t(v)
          WHERE v LIKE 'scrum-open-pool-%'
        )
      )
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
          OR (
            q.owner_id IS NULL
            AND q.source IS DISTINCT FROM 'Scrum Open Assessment'
            AND NOT EXISTS (
              SELECT 1 FROM unnest(COALESCE(q.tags, '{}')) AS t(v)
              WHERE v LIKE 'scrum-open-pool-%'
            )
          )
          OR (
            q.owner_id IS NULL
            AND (
              q.source = 'Scrum Open Assessment'
              OR EXISTS (
                SELECT 1 FROM unnest(COALESCE(q.tags, '{}')) AS t(v)
                WHERE v LIKE 'scrum-open-pool-%'
              )
            )
            AND (auth.jwt() ->> 'email') = 'natuong2017@gmail.com'
          )
        )
    )
  );

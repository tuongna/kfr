-- ============================================================
-- Row Level Security — Only the content owner can read/write
-- ============================================================

-- terms: only owner
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.terms
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owner_insert" ON public.terms
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner_update" ON public.terms
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owner_delete" ON public.terms
  FOR DELETE USING (owner_id = auth.uid());

-- term_senses: readable if parent term is owned
ALTER TABLE public.term_senses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_via_term" ON public.term_senses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.terms
      WHERE terms.id = term_senses.term_id
        AND terms.owner_id = auth.uid()
    )
  );

-- questions: only owner
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.questions
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owner_insert" ON public.questions
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner_update" ON public.questions
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owner_delete" ON public.questions
  FOR DELETE USING (owner_id = auth.uid());

-- question_options: readable if parent question is owned
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_via_question" ON public.question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questions
      WHERE questions.id = question_options.question_id
        AND questions.owner_id = auth.uid()
    )
  );

-- progress: user owns their own rows
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own" ON public.progress
  FOR ALL USING (user_id = auth.uid());

-- looked_up_terms: user owns their own rows
ALTER TABLE public.looked_up_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own" ON public.looked_up_terms
  FOR ALL USING (user_id = auth.uid());

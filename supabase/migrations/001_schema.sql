-- ============================================================
-- KfR Schema  — Scrum Learning App
-- ============================================================

-- Terms (single words or phrases)
CREATE TABLE IF NOT EXISTS public.terms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text        text NOT NULL,
  type        text NOT NULL DEFAULT 'word' CHECK (type IN ('word', 'phrase')),
  ipa         text,
  tags        text[] NOT NULL DEFAULT '{}',
  source      text,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX terms_owner_idx ON public.terms(owner_id);
CREATE INDEX terms_tags_idx  ON public.terms USING GIN(tags);

-- Multiple meanings per term
CREATE TABLE IF NOT EXISTS public.term_senses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id     uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  register    text NOT NULL DEFAULT 'general' CHECK (register IN ('general', 'scrum')),
  en          text NOT NULL,
  vi          text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0
);

CREATE INDEX term_senses_term_idx ON public.term_senses(term_id);

-- PSM / PSPO style questions
CREATE TABLE IF NOT EXISTS public.questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam            text NOT NULL CHECK (exam IN ('PSM-I', 'PSPO-I')),
  stem            text NOT NULL,
  explanation_en  text,
  explanation_vi  text,
  tags            text[] NOT NULL DEFAULT '{}',
  term_refs       uuid[] NOT NULL DEFAULT '{}',   -- links to terms table
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX questions_owner_idx ON public.questions(owner_id);
CREATE INDEX questions_exam_idx  ON public.questions(exam);
CREATE INDEX questions_tags_idx  ON public.questions USING GIN(tags);

-- Answer options
CREATE TABLE IF NOT EXISTS public.question_options (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text         text NOT NULL,
  correct      boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0
);

CREATE INDEX question_options_q_idx ON public.question_options(question_id);

-- SRS progress per user per item
CREATE TABLE IF NOT EXISTS public.progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type    text NOT NULL CHECK (item_type IN ('term', 'question')),
  item_id      uuid NOT NULL,
  level        int  NOT NULL DEFAULT -1,
  xp           int  NOT NULL DEFAULT 0,
  next_review  timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT progress_unique UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX progress_user_idx   ON public.progress(user_id);
CREATE INDEX progress_review_idx ON public.progress(next_review);

-- Lookup tracking (tap-to-gloss analytics)
CREATE TABLE IF NOT EXISTS public.looked_up_terms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id        uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  count          int  NOT NULL DEFAULT 1,
  last_looked_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT looked_up_unique UNIQUE (user_id, term_id)
);

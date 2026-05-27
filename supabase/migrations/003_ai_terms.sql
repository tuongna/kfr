-- Add optional note column to term_senses for AI-translated context hints
ALTER TABLE public.term_senses ADD COLUMN IF NOT EXISTS note text;

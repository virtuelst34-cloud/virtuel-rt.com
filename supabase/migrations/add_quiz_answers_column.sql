-- Réponses quiz persistées pour affichage multi-clients dans le salon
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '[]';

-- Succès / achievements persistés par utilisateur
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_name TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_name, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_name);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users manage own achievements" ON public.user_achievements;

CREATE POLICY "Anyone can read achievements"
  ON public.user_achievements FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users manage own achievements"
  ON public.user_achievements FOR ALL TO authenticated, anon
  USING (true)
  WITH CHECK (true);

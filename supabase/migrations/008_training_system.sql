-- ═══════════════════════════════════════════════════════
--  008: Training System — 自适应训练引擎
-- ═══════════════════════════════════════════════════════

-- ── 用户训练记录 ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id    TEXT REFERENCES public.math_models(id),
  level       INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  score       FLOAT CHECK (score BETWEEN 0 AND 100),
  time_spent  INT,                          -- 用时(秒)
  is_correct  BOOLEAN,
  is_complete BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_user ON public.training_records(user_id);
CREATE INDEX IF NOT EXISTS idx_training_model ON public.training_records(model_id);

-- ── 用户模型掌握度 ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_model_mastery (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id    TEXT NOT NULL REFERENCES public.math_models(id),
  mastery     FLOAT DEFAULT 0 CHECK (mastery BETWEEN 0 AND 1),
  level       INT DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  attempts    INT DEFAULT 0,
  avg_score   FLOAT DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, model_id)
);

-- ── RLS ─────────────────────────────────────────────
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_model_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own training" ON public.training_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training" ON public.training_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own mastery" ON public.user_model_mastery
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage mastery" ON public.user_model_mastery
  FOR ALL USING (auth.role() = 'service_role');

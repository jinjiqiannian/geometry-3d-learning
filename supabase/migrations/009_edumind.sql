-- ═══════════════════════════════════════════════════════
--  009: EduMind — 考试分析与学习规划系统
-- ═══════════════════════════════════════════════════════

-- ── 考试表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  subject        TEXT DEFAULT '数学',
  exam_date      DATE DEFAULT CURRENT_DATE,
  total_score    FLOAT,
  score          FLOAT,
  duration_min   INT,
  grade          TEXT,
  question_count INT,
  questions      JSONB DEFAULT '[]',
  tags           TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_user ON public.exams(user_id, exam_date DESC);

-- ── AI 分析缓存表 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_analyses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id        UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE UNIQUE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         TEXT DEFAULT 'pending',
  overall_summary TEXT,
  score_analysis  JSONB DEFAULT '{}',
  knowledge_mastery JSONB DEFAULT '[]',
  error_attribution JSONB DEFAULT '[]',
  improvement_suggestions JSONB DEFAULT '[]',
  recommended_plan JSONB DEFAULT '{}',
  ai_model        TEXT DEFAULT 'deepseek-chat',
  tokens_used     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exam_analyses_user ON public.exam_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_analyses_exam ON public.exam_analyses(exam_id);

-- ── 学习计划表 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id         UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  duration_days   INT NOT NULL,
  start_date      DATE DEFAULT CURRENT_DATE,
  is_active       BOOLEAN DEFAULT true,
  goal            TEXT,
  plan_content    JSONB DEFAULT '[]',
  progress        FLOAT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_plans_user ON public.learning_plans(user_id);

-- ── AI 教练对话 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT NOT NULL,
  content        TEXT NOT NULL,
  message_type   TEXT DEFAULT 'general',
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user ON public.coach_messages(user_id, created_at DESC);

-- ── 每日学习提醒 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  is_read        BOOLEAN DEFAULT false,
  is_actioned    BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ── RLS ─────────────────────────────────────────────
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own exams" ON public.exams
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own analyses" ON public.exam_analyses
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own plans" ON public.learning_plans
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own coach messages" ON public.coach_messages
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own reminders" ON public.daily_reminders
  FOR ALL USING (auth.uid() = user_id);

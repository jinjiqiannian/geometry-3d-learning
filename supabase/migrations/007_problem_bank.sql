-- ═══════════════════════════════════════════════════════
--  007: Problem Bank — 数学模型库 + 题库
-- ═══════════════════════════════════════════════════════

-- ── 数学模型注册表 ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.math_models (
  id          TEXT PRIMARY KEY,              -- M-SG-001
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,                 -- 立体几何/函数/导数/数列/圆锥曲线
  difficulty  INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  sub_category TEXT,                         -- 空间角/空间距离/...
  methods     JSONB DEFAULT '[]'::jsonb,    -- 解题方法列表
  traps       JSONB DEFAULT '[]'::jsonb,    -- 易错点列表
  ai_prompt   TEXT,                          -- 专属 AI 提示词
  recognition TEXT[] DEFAULT '{}',           -- 识别关键词数组
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_math_models_category ON public.math_models(category);

-- ── 母题库 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.problem_bank (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    TEXT REFERENCES public.math_models(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,                 -- 题目原文
  answer      TEXT,                          -- 答案
  difficulty  INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  source      TEXT,                          -- 来源（高考/模拟/自编）
  params      JSONB DEFAULT '{}'::jsonb,    -- 可变参数
  is_template BOOLEAN DEFAULT false,         -- 是否为模板题
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_bank_model ON public.problem_bank(model_id);

-- ── RLS ─────────────────────────────────────────────
ALTER TABLE public.math_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models readable by all" ON public.math_models
  FOR SELECT USING (true);

CREATE POLICY "Problem bank readable by all" ON public.problem_bank
  FOR SELECT USING (true);

CREATE POLICY "Service only — models write" ON public.math_models
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service only — problem_bank write" ON public.problem_bank
  FOR ALL USING (auth.role() = 'service_role');

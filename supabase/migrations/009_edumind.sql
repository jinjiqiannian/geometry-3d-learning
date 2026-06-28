-- ═══════════════════════════════════════════════════════
--  009: EduMind — 考试分析与学习诊断系统
--  来源: archive/exammind, 移除 users 表 (主项目使用 auth.users)
-- ═══════════════════════════════════════════════════════

-- ── 考试表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  subject TEXT NOT NULL DEFAULT 'math',
  total_score INT,
  actual_score INT,
  exam_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_user ON public.exams(user_id, exam_date DESC);

-- ── 题目表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_no INT NOT NULL,
  question_text TEXT,
  question_type TEXT DEFAULT 'choice',
  knowledge_point TEXT,
  difficulty INT CHECK(difficulty BETWEEN 1 AND 5),
  correct_answer TEXT,
  student_answer TEXT,
  is_correct BOOLEAN,
  score INT,
  earned INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON public.questions(exam_id);

-- ── 错题表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_no INT,
  type TEXT NOT NULL,
  reason TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);

-- ── 知识点掌握度表 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_point TEXT NOT NULL,
  mastery FLOAT DEFAULT 0 CHECK(mastery BETWEEN 0 AND 1),
  question_count INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, knowledge_point)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user ON public.knowledge_mastery(user_id);

-- ── 学习计划表 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  title TEXT,
  duration_days INT,
  plan_content JSONB DEFAULT '[]',
  progress FLOAT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_user ON public.learning_paths(user_id);

-- ── 上传记录表 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'exam_paper',
  file_url TEXT NOT NULL,
  ocr_text TEXT,
  ocr_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user ON public.uploads(user_id);

-- ── RLS ─────────────────────────────────────────────
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own exams" ON public.exams
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own questions" ON public.questions
  FOR ALL USING (auth.uid() = (SELECT user_id FROM public.exams WHERE id = exam_id));

CREATE POLICY "Users own mistakes" ON public.mistakes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own mastery" ON public.knowledge_mastery
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own plans" ON public.learning_paths
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own uploads" ON public.uploads
  FOR ALL USING (auth.uid() = user_id);

-- ── Storage bucket for uploads ──────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-uploads', 'exam-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload exams" ON storage.objects
  FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);

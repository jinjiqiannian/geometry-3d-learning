-- ═══════════════════════════════════════════════
--  几何维度 — 会员体系数据库迁移 v4
--  新增: 错题本 · 学习分析 · 班级管理 · 分享记录
-- ═══════════════════════════════════════════════

-- ═══════════════════════════════════════════════
--  错题本表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.error_book (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  problem_text TEXT NOT NULL,
  parsed_data JSONB DEFAULT '{}',
  wrong_answer TEXT,
  correct_answer TEXT,
  error_type  TEXT,                -- 'concept' | 'calculation' | 'careless' | 'other'
  geometry_type TEXT,              -- 'cube' | 'sphere' | 'pyramid' | ...
  knowledge_point TEXT,            -- 知识点标签: '体对角线' | '二面角' | '异面直线' | ...
  difficulty   INT DEFAULT 1,      -- 1-5 难度评级
  resolved     BOOLEAN DEFAULT false,  -- 是否已掌握
  tags         TEXT[] DEFAULT '{}',
  workspace_id UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_error_book_user ON public.error_book(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_book_knowledge ON public.error_book(user_id, knowledge_point);
CREATE INDEX IF NOT EXISTS idx_error_book_resolved ON public.error_book(user_id, resolved);

-- ═══════════════════════════════════════════════
--  学习分析表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.learning_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 学习时长（秒）
  study_duration_sec INT DEFAULT 0,

  -- 解题统计
  problems_solved   INT DEFAULT 0,
  problems_correct  INT DEFAULT 0,
  problems_wrong    INT DEFAULT 0,

  -- 知识点覆盖
  knowledge_points_covered TEXT[] DEFAULT '{}',

  -- 各知识点掌握度（JSON: { "体对角线": 0.85, "二面角": 0.45, ... }）
  mastery_scores    JSONB DEFAULT '{}',

  -- 活跃时段分布（JSON: [{ "hour": 19, "count": 12 }, ...]）
  active_hours      JSONB DEFAULT '[]',

  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_user ON public.learning_analytics(user_id, date DESC);

-- ═══════════════════════════════════════════════
--  班级管理表（教师版功能）
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.classrooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,           -- 班级名称: "高二(3)班"
  subject     TEXT DEFAULT '数学',
  invite_code TEXT UNIQUE NOT NULL,    -- 邀请码（6位字母数字）
  student_count INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON public.classrooms(teacher_id);

-- ═══════════════════════════════════════════════
--  班级-学生关联表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_students_class ON public.classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_student ON public.classroom_students(student_id);

-- ═══════════════════════════════════════════════
--  作业布置表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  problems     JSONB NOT NULL DEFAULT '[]',  -- [{ text, type, size }]
  due_date     TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON public.assignments(classroom_id);

-- ═══════════════════════════════════════════════
--  作业提交表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers      JSONB DEFAULT '{}',
  score        INT,                    -- 得分百分比 0-100
  graded       BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at    TIMESTAMPTZ,

  UNIQUE(assignment_id, student_id)
);

-- ═══════════════════════════════════════════════
--  分享记录表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.share_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type  TEXT NOT NULL,            -- 'link' | 'workspace' | 'scene' | 'teacher_mode'
  workspace_id UUID,
  share_url   TEXT,
  view_count  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_records_user ON public.share_records(user_id, created_at DESC);

-- ═══════════════════════════════════════════════
--  功能权限表（可扩展的权限系统）
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.feature_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan        TEXT NOT NULL,            -- 'free' | 'pro' | 'teacher'
  feature_key TEXT NOT NULL,            -- 'unlimited_questions' | 'ai_teacher_mode' | 'ppt_export' | ...
  enabled     BOOLEAN DEFAULT false,
  daily_limit INT,                      -- NULL = unlimited
  description TEXT,

  UNIQUE(plan, feature_key)
);

-- ═══════════════════════════════════════════════
--  初始权限数据
-- ═══════════════════════════════════════════════
INSERT INTO public.feature_permissions (plan, feature_key, enabled, daily_limit, description) VALUES
  -- 免费版
  ('free', 'ai_parse', true, 50, 'AI 题目解析'),
  ('free', '3d_visualize', true, null, '3D 图形生成'),
  ('free', 'step_explain', true, null, '分步讲解'),
  ('free', 'history_records', true, null, '本地历史记录'),
  ('free', 'share_link', true, null, '链接分享'),
  ('free', 'model_switch', true, null, '几何体类型切换'),
  ('free', 'ai_teacher_mode', false, null, '自动讲课模式'),
  ('free', 'ppt_export', false, null, 'PPT 导出'),
  ('free', 'pdf_export', false, null, 'PDF 导出'),
  ('free', 'image_export', false, null, '高清图片导出'),
  ('free', 'error_book', false, null, '错题本'),
  ('free', 'learning_analytics', false, null, '学习分析'),
  ('free', 'advanced_share', false, null, '高级分享'),
  ('free', 'cloud_sync', false, null, '云端同步'),
  ('free', 'classroom', false, null, '班级管理'),
  ('free', 'batch_export', false, null, '批量导出'),
  ('free', 'student_stats', false, null, '学生统计'),

  -- Pro 会员
  ('pro', 'ai_parse', true, null, 'AI 题目解析 — 无限'),
  ('pro', '3d_visualize', true, null, '3D 图形生成'),
  ('pro', 'step_explain', true, null, '分步讲解'),
  ('pro', 'history_records', true, null, '历史记录'),
  ('pro', 'share_link', true, null, '链接分享'),
  ('pro', 'model_switch', true, null, '几何体类型切换'),
  ('pro', 'ai_teacher_mode', true, null, '自动讲课模式'),
  ('pro', 'ppt_export', true, null, 'PPT 导出'),
  ('pro', 'pdf_export', true, null, 'PDF 导出'),
  ('pro', 'image_export', true, null, '高清图片导出'),
  ('pro', 'error_book', true, null, '错题本'),
  ('pro', 'learning_analytics', true, null, '学习分析'),
  ('pro', 'advanced_share', true, null, '高级分享'),
  ('pro', 'cloud_sync', true, null, '云端同步'),
  ('pro', 'classroom', false, null, '班级管理'),
  ('pro', 'batch_export', false, null, '批量导出'),
  ('pro', 'student_stats', false, null, '学生统计'),

  -- 教师版
  ('teacher', 'ai_parse', true, null, 'AI 题目解析 — 无限'),
  ('teacher', '3d_visualize', true, null, '3D 图形生成'),
  ('teacher', 'step_explain', true, null, '分步讲解'),
  ('teacher', 'history_records', true, null, '历史记录'),
  ('teacher', 'share_link', true, null, '链接分享'),
  ('teacher', 'model_switch', true, null, '几何体类型切换'),
  ('teacher', 'ai_teacher_mode', true, null, '自动讲课模式'),
  ('teacher', 'ppt_export', true, null, 'PPT 导出'),
  ('teacher', 'pdf_export', true, null, 'PDF 导出'),
  ('teacher', 'image_export', true, null, '高清图片导出'),
  ('teacher', 'error_book', true, null, '错题本'),
  ('teacher', 'learning_analytics', true, null, '学习分析'),
  ('teacher', 'advanced_share', true, null, '高级分享'),
  ('teacher', 'cloud_sync', true, null, '云端同步'),
  ('teacher', 'classroom', true, null, '班级管理'),
  ('teacher', 'batch_export', true, null, '批量课件导出'),
  ('teacher', 'student_stats', true, null, '学生统计')
ON CONFLICT (plan, feature_key) DO NOTHING;

-- ═══════════════════════════════════════════════
--  RLS 策略
-- ═══════════════════════════════════════════════
ALTER TABLE public.error_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users own error_book" ON public.error_book
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own analytics" ON public.learning_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers own classrooms" ON public.classrooms
  FOR ALL USING (auth.uid() = teacher_id);

-- 学生可以查看自己加入的班级
CREATE POLICY "Students view own enrollments" ON public.classroom_students
  FOR SELECT USING (auth.uid() = student_id);

-- 教师管理班级学生
CREATE POLICY "Teachers manage classroom students" ON public.classroom_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
    )
  );

-- 学生通过邀请码加入班级
CREATE POLICY "Students join via invite" ON public.classroom_students
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers own assignments" ON public.assignments
  FOR ALL USING (auth.uid() = teacher_id);

-- 学生查看自己班级的作业
CREATE POLICY "Students view class assignments" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students cs
      WHERE cs.classroom_id = assignments.classroom_id
      AND cs.student_id = auth.uid()
    )
  );

CREATE POLICY "Students own submissions" ON public.assignment_submissions
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers view submissions" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
      AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users own share_records" ON public.share_records
  FOR ALL USING (auth.uid() = user_id);

-- feature_permissions 所有人可读
CREATE POLICY "Anyone can read permissions" ON public.feature_permissions
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════
--  触发器: 更新 classroom 学生计数
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_classroom_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.classrooms SET student_count = student_count + 1, updated_at = now()
    WHERE id = NEW.classroom_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.classrooms SET student_count = GREATEST(0, student_count - 1), updated_at = now()
    WHERE id = OLD.classroom_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_classroom_student_change ON public.classroom_students;
CREATE TRIGGER on_classroom_student_change
  AFTER INSERT OR DELETE ON public.classroom_students
  FOR EACH ROW EXECUTE FUNCTION public.update_classroom_student_count();

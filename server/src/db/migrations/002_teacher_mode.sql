-- ═══════════════════════════════════════════════
--  MathViz SaaS — Migration 002: Teacher Mode
--  在 Supabase SQL Editor 中执行
-- ═══════════════════════════════════════════════

-- 教师讲稿表（自动播放脚本）
CREATE TABLE IF NOT EXISTS public.teacher_scripts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  narration   JSONB NOT NULL DEFAULT '[]',
  -- [{stepIdx, phrase, delay, sceneState, animationType}]
  slide_count INTEGER DEFAULT 5,
  is_published BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scripts_workspace ON public.teacher_scripts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user ON public.teacher_scripts(user_id);

-- 课程收藏表（教师批量管理workspace）
CREATE TABLE IF NOT EXISTS public.course_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  workspace_ids UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_user ON public.course_collections(user_id);

-- RLS
ALTER TABLE public.teacher_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own scripts" ON public.teacher_scripts;
CREATE POLICY "Users own scripts" ON public.teacher_scripts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own collections" ON public.course_collections;
CREATE POLICY "Users own collections" ON public.course_collections
  FOR ALL USING (auth.uid() = user_id);

-- 公开的讲稿（已发布的课程）
DROP POLICY IF EXISTS "Public scripts read" ON public.teacher_scripts;
CREATE POLICY "Public scripts read" ON public.teacher_scripts
  FOR SELECT USING (is_published = true);

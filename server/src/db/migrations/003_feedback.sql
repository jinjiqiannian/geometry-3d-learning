-- ═══════════════════════════════════════════════
--  MathViz SaaS — Migration 003: Feedback System
--  在 Supabase SQL Editor 中执行
--  如已开启 auto-migration，服务器启动时会自动建表
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                    -- suggestion | bug | improvement | learning-difficulty | other | satisfaction
  title TEXT,                            -- 标题
  description TEXT,                      -- 详细描述
  contact TEXT,                          -- 联系方式（选填）
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 解题评价专用
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  -- 学习困难专用
  learning_difficulties JSONB DEFAULT '[]',
  geometry_type TEXT,
  difficulty_level TEXT,
  -- 管理字段（未来管理后台用）
  status TEXT NOT NULL DEFAULT 'pending', -- pending | reviewed | resolved | archived
  admin_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',            -- 预留扩展字段
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引（管理员查询优化）
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 任何人都可以提交反馈（包括未登录用户）
DROP POLICY IF EXISTS "Everyone can insert feedback" ON public.feedback;
CREATE POLICY "Everyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

-- 用户只能查看自己的反馈（管理员通过 service_role 绕过 RLS）
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

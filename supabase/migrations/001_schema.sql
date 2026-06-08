-- ═══════════════════════════════════════════════
--  MathViz SaaS — 数据库 Schema 迁移 v1
--  执行方式: Supabase SQL Editor 或 supabase db push
-- ═══════════════════════════════════════════════

-- ═══════════════════════════════════════════════
--  用户档案表 (extends auth.users)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'student',  -- 'student' | 'teacher'
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 自动创建 profile (trigger on auth.users insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════
--  订阅表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan              TEXT DEFAULT 'free',     -- 'free' | 'pro' | 'teacher'
  billing_interval  TEXT DEFAULT 'monthly',  -- 'monthly' | 'yearly'
  status            TEXT DEFAULT 'active',   -- 'active' | 'canceled' | 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 自动创建免费订阅 (trigger on profile insert)
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ═══════════════════════════════════════════════
--  使用量追踪表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.usage_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,               -- 'generate' | 'export_ppt' | 'export_image' | 'ai_explain'
  problem_text TEXT,
  workspace_id UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON public.usage_records(user_id, created_at);

-- ═══════════════════════════════════════════════
--  Workspace 存储表
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  problem_text TEXT NOT NULL,
  parsed_data JSONB DEFAULT '{}',          -- AI解析结果
  steps       JSONB DEFAULT '[]',          -- 解题步骤数组
  geometry    JSONB DEFAULT '{}',          -- 几何体配置
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_user ON public.workspaces(user_id, created_at DESC);

-- ═══════════════════════════════════════════════
--  Row Level Security (RLS)
-- ═══════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的数据
DROP POLICY IF EXISTS "Users own profiles" ON public.profiles;
CREATE POLICY "Users own profiles" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users own subscriptions" ON public.subscriptions;
CREATE POLICY "Users own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own usage" ON public.usage_records;
CREATE POLICY "Users own usage" ON public.usage_records
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own workspaces" ON public.workspaces;
CREATE POLICY "Users own workspaces" ON public.workspaces
  FOR ALL USING (auth.uid() = user_id);

-- 公开 workspace（分享链接用）
DROP POLICY IF EXISTS "Public workspaces read" ON public.workspaces;
CREATE POLICY "Public workspaces read" ON public.workspaces
  FOR SELECT USING (is_public = true);

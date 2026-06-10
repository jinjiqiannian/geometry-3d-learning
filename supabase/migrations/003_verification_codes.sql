-- ═══════════════════════════════════════════════
--  MathViz — 003 短信验证码表
--  在 Supabase SQL Editor 中执行
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,
  purpose     TEXT DEFAULT 'register',   -- 'register' | 'login' | 'reset_password'
  attempts    INT DEFAULT 0,
  verified    BOOLEAN DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vc_phone_purpose ON public.verification_codes(phone, purpose, created_at DESC);

-- 超过5次尝试或已过期的不允许验证
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- 允许 anon 用户插入（发送验证码）
DROP POLICY IF EXISTS "Anyone can insert codes" ON public.verification_codes;
CREATE POLICY "Anyone can insert codes" ON public.verification_codes
  FOR INSERT WITH CHECK (true);

-- 允许 anon 用户查询自己的验证码
DROP POLICY IF EXISTS "Anyone can read own codes" ON public.verification_codes;
CREATE POLICY "Anyone can read own codes" ON public.verification_codes
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════
--  MathViz — 002 手机号支持
--  给 profiles 表添加 phone 列
--  在 Supabase SQL Editor 中执行
-- ═══════════════════════════════════════════════

-- 1) 添加 phone 列
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2) 为 phone 列创建索引（加速手机号查找）
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3) 更新 handle_new_user trigger，支持 phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

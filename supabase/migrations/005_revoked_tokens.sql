-- ═══════════════════════════════════════════════════════
--  005: Revoked Tokens — 刷新令牌轮换黑名单
--  替代进程内 Set，防止重启后令牌重放
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.revoked_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL,          -- token 的 SHA256 哈希（不存原文）
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,   -- token 过期时间
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 查询加速
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON public.revoked_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON public.revoked_tokens(expires_at);

-- 自动清理过期记录
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_cleanup ON public.revoked_tokens(created_at)
  WHERE expires_at < NOW();

-- RLS: 仅服务端可写入（用户不可直接操作）
ALTER TABLE public.revoked_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only — revoked_tokens" ON public.revoked_tokens
  FOR ALL USING (auth.role() = 'service_role');

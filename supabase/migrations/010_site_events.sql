-- ═══════════════════════════════════════════════════════
--  站点行为埋点
--  用途：判断自媒体带来多少流量、漏斗卡在哪一步。
--  隐私边界：只记「匿名动作」，不存 IP、不存个人信息、
--            不关联账号、不跨站追踪。anon_id 是浏览器本地随机值。
-- ═══════════════════════════════════════════════════════

create table if not exists public.site_events (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  anon_id      text,           -- 浏览器本地随机 ID，与账号无关
  session_id   text,           -- 一次访问会话
  event        text not null,  -- 事件名，白名单见 api/track.js
  path         text,
  referrer     text,
  utm_source   text,           -- 自媒体归因的关键：bilibili / douyin / xiaohongshu
  utm_medium   text,
  utm_campaign text,           -- 具体哪条视频
  props        jsonb,          -- 事件附加信息（如题型、步骤数）
  is_mobile    boolean,
  screen       text
);

-- 最常用的两种查询：按时间看总量、按来源看渠道效果
create index if not exists idx_site_events_created
  on public.site_events (created_at desc);
create index if not exists idx_site_events_event
  on public.site_events (event, created_at desc);
create index if not exists idx_site_events_source
  on public.site_events (utm_source, created_at desc);

alter table public.site_events enable row level security;

-- 只给 anon 插入权限；不建任何 select 策略 = 匿名读不到数据。
-- 数据只能在 Supabase 控制台看。
--
-- 注：anon key 在前端包里是公开的，理论上可被灌数据。当前零流量
-- 阶段风险可忽略；等有流量了，在 Vercel 配 SUPABASE_SERVICE_ROLE_KEY，
-- api/track.js 会自动优先用它，届时可删掉这条策略。
drop policy if exists site_events_insert_anon on public.site_events;
create policy site_events_insert_anon on public.site_events
  for insert to anon with check (true);

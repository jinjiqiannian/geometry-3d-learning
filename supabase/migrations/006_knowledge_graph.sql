-- ═══════════════════════════════════════════════════════
--  006: Knowledge Graph — 知识图谱核心表
--  使用嵌套集模型（Nested Set）支持层级查询
-- ═══════════════════════════════════════════════════════

-- ── 知识点节点 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,       -- KP-SG-ANGLE-01
  name        TEXT NOT NULL,              -- 异面直线夹角
  category    TEXT NOT NULL,              -- 立体几何/函数/导数/数列/圆锥曲线
  sub_category TEXT,                       -- 空间角/空间距离/平行垂直
  description TEXT,                       -- 知识点说明
  importance  INT DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),  -- 重要性 1-5
  -- 嵌套集模型
  lft         INT NOT NULL,
  rgt         INT NOT NULL,
  depth       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_points_category ON public.knowledge_points(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_lft_rgt ON public.knowledge_points(lft, rgt);

-- ── 知识点前置关系（DAG） ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_prerequisites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id    UUID NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(knowledge_id, prerequisite_id),
  CHECK(knowledge_id != prerequisite_id)
);

CREATE INDEX IF NOT EXISTS idx_kp_knowledge ON public.knowledge_prerequisites(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_kp_prerequisite ON public.knowledge_prerequisites(prerequisite_id);

-- ── 模型-知识点关联 ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.model_knowledge_tags (
  model_id      TEXT NOT NULL,             -- math_models.id
  knowledge_id  UUID NOT NULL REFERENCES public.knowledge_points(id) ON DELETE CASCADE,
  relevance     FLOAT DEFAULT 1.0 CHECK (relevance BETWEEN 0 AND 1),
  PRIMARY KEY (model_id, knowledge_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_model ON public.model_knowledge_tags(model_id);
CREATE INDEX IF NOT EXISTS idx_mkt_knowledge ON public.model_knowledge_tags(knowledge_id);

-- ── RLS ─────────────────────────────────────────────
ALTER TABLE public.knowledge_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_knowledge_tags ENABLE ROW LEVEL SECURITY;

-- 知识点对全部用户可读
CREATE POLICY "Knowledge points are readable by all" ON public.knowledge_points
  FOR SELECT USING (true);

CREATE POLICY "Knowledge prerequisites are readable by all" ON public.knowledge_prerequisites
  FOR SELECT USING (true);

CREATE POLICY "Model knowledge tags are readable by all" ON public.model_knowledge_tags
  FOR SELECT USING (true);

-- 写入仅限服务端
CREATE POLICY "Service role only — knowledge_points write" ON public.knowledge_points
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only — knowledge_prerequisites write" ON public.knowledge_prerequisites
  FOR ALL USING (auth.role() = 'service_role');

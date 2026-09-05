// ═══════════════════════════════════════════════════════
//  KnowledgeGraphPage — 知识图谱（教材模式）
//  每个知识点配专属示意图 + 详细文字讲解
//  优先走后端 API，失败时回退到本地种子数据
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  KNOWLEDGE_SEED,
  getKnowledgeContent,
} from "../engines/knowledgeContent";
import "./KnowledgeGraphPage.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState([]);
  const [selectedId, setSelectedId] = useState("KP-SG-ROOT");
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("立体几何");

  const fetchNodes = useCallback(async (cat) => {
    setLoading(true);
    try {
      const params = cat ? `?category=${encodeURIComponent(cat)}` : "";
      const res = await fetch(`${API_BASE}/api/knowledge/nodes${params}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setNodes(json.data);
        return;
      }
      throw new Error("empty");
    } catch {
      // 回退到本地种子数据 —— 保证页面离线/无后端时仍可用
      setNodes(KNOWLEDGE_SEED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes(category);
  }, [category, fetchNodes]);

  // 按 depth 分层渲染
  const levels = useMemo(() => {
    const lv = [];
    for (const node of nodes) {
      if (!lv[node.depth]) lv[node.depth] = [];
      lv[node.depth].push(node);
    }
    return lv.filter(Boolean);
  }, [nodes]);

  // 选中知识点的完整内容（图 + 讲解 + 关系）—— 始终来自本地内容库
  const selected = useMemo(() => getKnowledgeContent(selectedId), [selectedId]);

  return (
    <div className="kg-page">
      <header className="kg-header">
        <div>
          <h1>知识图谱</h1>
          <p className="kg-header-sub">
            点击任一知识点，查看专属示意图与详细讲解
          </p>
        </div>
        <div className="kg-controls">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">全部</option>
            <option value="立体几何">立体几何</option>
            <option value="函数">函数</option>
            <option value="导数">导数</option>
            <option value="数列">数列</option>
            <option value="圆锥曲线">圆锥曲线</option>
          </select>
        </div>
      </header>

      {/* ── 知识树 ── */}
      <div className="kg-tree">
        {loading ? (
          <div className="kg-loading">加载中…</div>
        ) : levels.length === 0 ? (
          <div className="kg-loading">暂无知识点数据</div>
        ) : (
          levels.map((levelNodes, depth) => (
            <div key={depth} className="kg-level">
              <span className="kg-level-label">第 {depth + 1} 层</span>
              <div className="kg-level-nodes">
                {levelNodes.map((node) => (
                  <button
                    key={node.id}
                    className={`kg-node ${selectedId === node.id ? "active" : ""}`}
                    onClick={() => setSelectedId(node.id)}
                  >
                    <span className="kg-node-name">{node.name}</span>
                    {node.sub_category && (
                      <span className="kg-node-sub">{node.sub_category}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── 知识点详情：专属图 + 文字讲解 ── */}
      {selected && (
        <div className="kg-detail">
          <div className="kg-detail-head">
            <h2>{selected.point.name}</h2>
            {selected.point.sub_category && (
              <span className="kg-detail-tag">
                {selected.point.sub_category}
              </span>
            )}
          </div>

          <div className="kg-detail-body">
            {/* 专属示意图 */}
            <div className="kg-diagram-card">
              <div className="kg-diagram-frame">
                {selected.content?.diagram}
              </div>
              <p className="kg-diagram-caption">
                专属示意图 · {selected.point.name}
              </p>
            </div>

            {/* 文字讲解 */}
            <div className="kg-text-col">
              <section className="kg-text-block">
                <h3 className="kg-block-title">概念讲解</h3>
                <p className="kg-summary">
                  {selected.content?.summary || selected.point.description}
                </p>
              </section>

              {selected.content?.keyPoints?.length > 0 && (
                <section className="kg-text-block">
                  <h3 className="kg-block-title">要点</h3>
                  <ul className="kg-keypoints">
                    {selected.content.keyPoints.map((kp, i) => (
                      <li key={i}>{kp}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {/* 关系 */}
          <div className="kg-rel-grid">
            {selected.prerequisites.length > 0 && (
              <div className="kg-rel-section">
                <h3 className="kg-rel-title">前置知识</h3>
                <div className="kg-rel-list">
                  {selected.prerequisites.map((p) => (
                    <button
                      key={p.id}
                      className="kg-rel-tag"
                      onClick={() => setSelectedId(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selected.children.length > 0 && (
              <div className="kg-rel-section">
                <h3 className="kg-rel-title">子知识点</h3>
                <div className="kg-rel-list">
                  {selected.children.map((c) => (
                    <button
                      key={c.id}
                      className="kg-rel-tag"
                      onClick={() => setSelectedId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

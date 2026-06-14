// ═══════════════════════════════════════════════════════
//  KnowledgeGraphPage — 知识图谱可视化
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import './KnowledgeGraphPage.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function KnowledgeGraphPage() {
  const [nodes, setNodes] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('立体几何')

  const fetchNodes = useCallback(async (cat) => {
    setLoading(true)
    setError(null)
    try {
      const params = cat ? `?category=${encodeURIComponent(cat)}` : ''
      const res = await fetch(`${API_BASE}/api/knowledge/nodes${params}`)
      const json = await res.json()
      if (json.success) setNodes(json.data)
      else setError(json.error)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNodes(category) }, [category, fetchNodes])

  // 点击节点加载详情
  const handleSelect = async (node) => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/nodes/${node.id}`)
      const json = await res.json()
      if (json.success) setSelected(json.data)
    } catch { /* */ }
  }

  // 按 depth 分组渲染
  const levels = []
  for (const node of nodes) {
    if (!levels[node.depth]) levels[node.depth] = []
    levels[node.depth].push(node)
  }

  return (
    <div className="kg-page">
      <header className="kg-header">
        <h1>知识图谱</h1>
        <div className="kg-controls">
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">全部</option>
            <option value="立体几何">立体几何</option>
            <option value="函数">函数</option>
            <option value="导数">导数</option>
            <option value="数列">数列</option>
            <option value="圆锥曲线">圆锥曲线</option>
          </select>
        </div>
      </header>

      {loading && <div className="kg-loading">加载中…</div>}
      {error && <div className="kg-error">{error}</div>}

      {!loading && !error && (
        <div className="kg-tree">
          {levels.map((levelNodes, depth) => (
            <div key={depth} className="kg-level">
              {levelNodes.map(node => (
                <button
                  key={node.id}
                  className={`kg-node ${selected?.point?.id === node.id ? 'active' : ''}`}
                  style={{ '--importance': node.importance }}
                  onClick={() => handleSelect(node)}
                >
                  <span className="kg-node-name">{node.name}</span>
                  {node.sub_category && (
                    <span className="kg-node-sub">{node.sub_category}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="kg-detail">
          <h2>{selected.point?.name}</h2>
          <p className="kg-detail-desc">{selected.point?.description}</p>

          {selected.prerequisites?.length > 0 && (
            <div className="kg-rel-section">
              <h3>前置知识</h3>
              <div className="kg-rel-list">
                {selected.prerequisites.map(p => (
                  <span key={p.id} className="kg-rel-tag">{p.name}</span>
                ))}
              </div>
            </div>
          )}

          {selected.children?.length > 0 && (
            <div className="kg-rel-section">
              <h3>子知识点</h3>
              <div className="kg-rel-list">
                {selected.children.map(c => (
                  <span key={c.id} className="kg-rel-tag">{c.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

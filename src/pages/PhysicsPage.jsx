import { useState } from "react"
import { useNavigate } from "react-router-dom"
import SubjectSolver from "../components/SubjectSolver"
import { PHYSICS_CATEGORIES, PHYSICS_KNOWLEDGE } from "../data/physicsKnowledge"
import "./SubjectPage.css"

const C = "#06b6d4"
const ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
  </svg>
)

const FORMULAS = [
  { name: "牛顿第二定律", expr: "F = ma", desc: "力 = 质量 × 加速度" },
  { name: "动能定理", expr: "Eₖ = ½mv²", desc: "动能 = ½ × 质量 × 速度²" },
  { name: "欧姆定律", expr: "V = IR", desc: "电压 = 电流 × 电阻" },
  { name: "折射定律", expr: "n₁sinθ₁ = n₂sinθ₂", desc: "斯涅尔定律" },
]
const EXAMPLES = [
  { text: "一个质量为2kg的物体在水平面上受到10N的水平推力，求加速度", tag: "力学" },
  { text: "电阻为10Ω的导体两端电压为20V，求通过的电流", tag: "电磁学" },
  { text: "光线从空气射入水中，入射角为30°，求折射角", tag: "光学" },
]
const FrequencyStars = ({ count }) => (
  <span style={{ color: "#E8551F", letterSpacing: "1px", fontSize: 13 }}>
    {"★".repeat(count)}{"☆".repeat(5 - count)}
  </span>
)

export default function PhysicsPage() {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState(null)
  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id)

  return (
    <div className="subject-page">
      <div className="subject-glow" style={{ background: `radial-gradient(circle, ${C}12 0%, transparent 70%)` }} />

      {/* Hero */}
      <section className="subject-hero">
        <div className="subject-hero-icon" style={{ backgroundColor: `${C}15`, color: C }}>{ICON}</div>
        <h1 className="subject-hero-title">物理</h1>
        <p className="subject-hero-desc">从经典力学到现代物理，用科学思维理解宇宙规律</p>
      </section>

      {/* Solver */}
      <section className="subject-section">
        <div className="subject-section-header" style={{ color: C }}>
          <span className="subject-section-title" style={{ color: C }}>AI 解题</span>
        </div>
        <SubjectSolver subject="physics" />
      </section>

      {/* Formulas */}
      <section className="subject-section">
        <div className="subject-section-header" style={{ color: C }}>
          <span className="subject-section-title" style={{ color: C }}>公式库</span>
        </div>
        <div className="subject-formula-grid">
          {FORMULAS.map((f, i) => (
            <div key={i} className="subject-formula-card" style={{ '--sub-color': C }}>
              <p className="subject-formula-name" style={{ color: `${C}cc` }}>{f.name}</p>
              <p className="subject-formula-expr" style={{ color: C }}>{f.expr}</p>
              <p className="subject-formula-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section className="subject-section">
        <div className="subject-section-header" style={{ color: C }}>
          <span className="subject-section-title" style={{ color: C }}>典型例题</span>
        </div>
        <div className="subject-example-grid">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="subject-example-card" style={{ '--sub-color': C }}
              onClick={() => navigate(`/workspace?q=${encodeURIComponent(ex.text)}`)}>
              <span className="subject-example-tag" style={{ backgroundColor: `${C}15`, color: C }}>{ex.tag}</span>
              <span className="subject-example-text">{ex.text}</span>
              <svg className="subject-example-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4l4 4-4 4" />
              </svg>
            </button>
          ))}
        </div>
      </section>

      {/* Knowledge by category with exam frequency */}
      <section className="subject-section">
        <div className="subject-section-header" style={{ color: C }}>
          <span className="subject-section-title" style={{ color: C }}>高考知识点</span>
          <span className="subject-section-hint">★ 为高考考频，点击知识点查看专题例题</span>
        </div>
        {PHYSICS_CATEGORIES.map(cat => {
          const items = PHYSICS_KNOWLEDGE.filter(k => k.category === cat.id)
          if (items.length === 0) return null
          return (
            <div key={cat.id} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${cat.color}22` }}>
                <h3 style={{ margin: 0, color: cat.color, fontSize: 18 }}>{cat.name}</h3>
                <span style={{ fontSize: 12, color: "#888" }}>高考占比 {cat.weight} · {cat.desc}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map(k => {
                  const isOpen = expandedId === k.id
                  return (
                    <div key={k.id} style={{
                      border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px",
                      background: isOpen ? `${cat.color}08` : "#fff",
                      transition: "all .2s", cursor: "pointer"
                    }} onClick={() => toggleExpand(k.id)}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 4,
                            background: k.type === "experiment" ? `${cat.color}15` : "#f0f0f0",
                            color: k.type === "experiment" ? cat.color : "#666"
                          }}>{k.type === "experiment" ? "实验" : "知识点"}</span>
                          <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{k.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <FrequencyStars count={k.frequency} />
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5"
                            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s" }}>
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e0e0e0" }} onClick={e => e.stopPropagation()}>
                          <p style={{ margin: "0 0 8px", color: "#555", fontSize: 14 }}>{k.description}</p>
                          <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fff7ed", borderRadius: 6, borderLeft: `3px solid ${cat.color}` }}>
                            <span style={{ fontWeight: 600, color: cat.color, fontSize: 13 }}>高考要点：</span>
                            <span style={{ color: "#555", fontSize: 13 }}>{k.examTips}</span>
                          </div>
                          {k.formula && (
                            <div style={{ marginBottom: 10, padding: "8px 12px", background: "#f8f9fa", borderRadius: 6, fontFamily: "monospace", whiteSpace: "pre-line", color: "#333", fontSize: 13 }}>
                              {k.formula}
                            </div>
                          )}
                          {k.example && (
                            <div style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                              <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#15803d", fontSize: 13 }}>📌 专题例题</p>
                              <p style={{ margin: "0 0 6px", color: "#333", fontSize: 14, whiteSpace: "pre-line" }}>{k.example.question}</p>
                              <p style={{ margin: "0 0 4px", color: "#555", fontSize: 13, whiteSpace: "pre-line" }}>{k.example.solution}</p>
                              <p style={{ margin: 0, color: "#15803d", fontWeight: 600, fontSize: 13 }}>答案：{k.example.answer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

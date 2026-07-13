import { useNavigate } from "react-router-dom"
import SubjectSolver from "../components/SubjectSolver"
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
const KNOWLEDGE = [
  { category: "力学基础", items: ["牛顿三大定律", "动量守恒", "能量守恒", "圆周运动"] },
  { category: "电磁学", items: ["电场与磁场", "电磁感应", "交变电流", "电磁波"] },
  { category: "光学与波动", items: ["反射与折射", "透镜成像", "干涉衍射", "光谱分析"] },
]

export default function PhysicsPage() {
  const navigate = useNavigate()

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

      {/* Knowledge */}
      <section className="subject-section">
        <div className="subject-section-header" style={{ color: C }}>
          <span className="subject-section-title" style={{ color: C }}>核心知识点</span>
        </div>
        <div className="subject-knowledge-grid">
          {KNOWLEDGE.map((k, i) => (
            <div key={i} className="subject-knowledge-card">
              <h3 className="subject-knowledge-category" style={{ color: `${C}cc` }}>{k.category}</h3>
              <ul className="subject-knowledge-list">
                {k.items.map((item, j) => (
                  <li key={j} className="subject-knowledge-item" style={{ '--sub-color': C }}>
                    <span style={{ color: C, position: "absolute", left: 0, top: 6, fontSize: 10 }}>●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

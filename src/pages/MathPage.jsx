import { useNavigate } from "react-router-dom"
import SubjectSolver from "../components/SubjectSolver"
import "./SubjectPage.css"

const C = "#E8551F"
const ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
    <path d="M3 9l13 7 13-7" />
    <path d="M16 23V9" />
  </svg>
)

const FORMULAS = [
  { name: "正方体", expr: "V = a³, S = 6a²", desc: "棱长为 a 的正方体" },
  { name: "长方体", expr: "V = abc, S = 2(ab+bc+ac)", desc: "长 a、宽 b、高 c 的长方体" },
  { name: "球体", expr: "V = ⁴⁄₃πr³, S = 4πr²", desc: "半径为 r 的球体" },
  { name: "圆柱体", expr: "V = πr²h, S = 2πr(r+h)", desc: "底面半径 r、高 h 的圆柱" },
  { name: "圆锥体", expr: "V = ⅓πr²h, S = πr(r+l)", desc: "底面半径 r、高 h、母线 l 的圆锥" },
  { name: "正四面体", expr: "V = a³√2⁄₁₂, S = √3·a²", desc: "棱长为 a 的正四面体" },
]
const EXAMPLES = [
  { text: "正方体棱长为2，求体对角线AG的长度", tag: "正方体" },
  { text: "圆锥底面半径为3，高为4，求圆锥的体积和母线长度", tag: "旋转体" },
  { text: "正四棱锥P-ABCD，底面正方形边长为4，高为6，求该棱锥的体积", tag: "棱锥" },
  { text: "圆台上底面半径3，下底面半径5，高为4，求圆台的体积", tag: "圆台" },
]
const KNOWLEDGE = [
  { category: "正方体与长方体", items: ["棱长与体对角线", "表面积与体积", "异面直线夹角", "截面面积"] },
  { category: "棱锥与棱柱", items: ["正四棱锥体积", "侧面积与斜高", "三棱柱体积", "外接球"] },
  { category: "旋转体", items: ["圆柱与圆锥", "圆台体积", "球体与截面", "内切外接"] },
  { category: "正多面体", items: ["正四面体", "正八面体", "对棱距离", "内切球与外接球"] },
]

export default function MathPage() {
  const navigate = useNavigate()

  return (
    <div className="subject-page">
      <div className="subject-glow" style={{ background: `radial-gradient(circle, ${C}12 0%, transparent 70%)` }} />

      {/* Hero */}
      <section className="subject-hero">
        <div className="subject-hero-icon" style={{ backgroundColor: `${C}15`, color: C }}>{ICON}</div>
        <h1 className="subject-hero-title">数学 · 立体几何</h1>
        <p className="subject-hero-desc">从正方体到正八面体，用 AI 和 3D 交互轻松掌握空间几何</p>
      </section>

      {/* Solver */}
      <section className="subject-section">
        <div className="subject-section-header" style={{ color: C }}>
          <span className="subject-section-title" style={{ color: C }}>AI 解题</span>
        </div>
        <SubjectSolver subject="math" />
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

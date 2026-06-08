import { MODULES } from '../constants'
import ModuleCard from '../components/ModuleCard'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-icon">📐</span>
            MathViz 数学可视化
          </h1>
          <p className="hero-subtitle">
            交互式数学学习平台，让抽象概念变得可见、可触、可理解
          </p>
          <p className="hero-desc">
            从立体几何到函数图像，通过可视化探索数学之美
          </p>
        </div>
        <div className="hero-shapes">
          <div className="hero-shape shape-1" />
          <div className="hero-shape shape-2" />
          <div className="hero-shape shape-3" />
        </div>
      </section>

      <section className="modules-section">
        <h2 className="modules-heading">选择学习模块</h2>
        <div className="modules-grid">
          {MODULES.map(mod => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <p>🚀 更多模块正在开发中，敬请期待</p>
      </footer>
    </div>
  )
}

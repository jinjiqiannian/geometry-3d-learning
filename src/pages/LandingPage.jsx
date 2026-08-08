import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./LandingPage.css";

/** 右侧门面：品牌层叠视窗放大，不绑具体几何体 */
function PosterArt() {
  return (
    <svg
      className="landing-poster-art"
      viewBox="0 0 480 640"
      aria-hidden="true"
    >
      {/* 淡网格：结构感 */}
      <g className="lp-grid">
        {Array.from({ length: 9 }, (_, i) => {
          const x = 48 + i * 48;
          return <line key={`v${i}`} x1={x} y1="40" x2={x} y2="600" />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const y = 40 + i * 48;
          return <line key={`h${i}`} x1="48" y1={y} x2="432" y2={y} />;
        })}
      </g>

      {/* 后平面 */}
      <g className="lp-plane-back">
        <rect className="lp-plane" x="78" y="168" width="220" height="220" rx="6" />
      </g>
      {/* 前平面 */}
      <g className="lp-plane-front">
        <rect className="lp-plane" x="168" y="118" width="220" height="220" rx="6" />
      </g>

      {/* 洞察斜线 */}
      <path
        className="lp-slash"
        d="M148 348 L368 168"
        pathLength="1"
      />

      {/* 细节点缀 */}
      <circle className="lp-node" cx="148" cy="348" r="3.2" />
      <circle className="lp-node" cx="368" cy="168" r="3.2" />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-stage">
        <section className="landing-copy">
          <div className="landing-brand-row">
            <BrandLogo className="landing-logo-svg" size={42} />
            <div className="landing-brand-text">
              <p className="landing-brand">几何维度</p>
              <p className="landing-brand-en">MathViz · 理解引擎</p>
            </div>
          </div>

          <h1 className="landing-headline">
            把抽象知识
            <br />
            <em>变得看得见</em>
          </h1>

          <p className="landing-support">
            先看清结构，再学会推理。数学已开放；物理、化学等科目将按同一理解能力接入。
          </p>

          <div className="landing-cta-row">
            <button
              type="button"
              className="landing-submit"
              onClick={() => navigate("/workspace")}
            >
              进入工作台
            </button>
            <button
              type="button"
              className="landing-ghost"
              onClick={() => navigate("/history")}
            >
              学习记录
            </button>
          </div>

          <ul className="landing-pillars">
            <li>构图</li>
            <li>推理</li>
            <li>讲解</li>
            <li>检验</li>
          </ul>
        </section>

        <aside className="landing-poster" aria-hidden="true">
          <div className="landing-poster-glow" />
          <PosterArt />
          <div className="landing-poster-caption">
            <span>SEE</span>
            <span>看见结构</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

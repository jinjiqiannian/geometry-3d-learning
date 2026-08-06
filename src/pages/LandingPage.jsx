import { useEffect, useRef, useState, startTransition } from "react";
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

      <g className="lp-plane-back">
        <rect className="lp-plane" x="78" y="168" width="220" height="220" rx="6" />
      </g>
      <g className="lp-plane-front">
        <rect className="lp-plane" x="168" y="118" width="220" height="220" rx="6" />
      </g>

      <path
        className="lp-slash"
        d="M148 348 L368 168"
        pathLength="1"
      />

      <circle className="lp-node" cx="148" cy="348" r="3.2" />
      <circle className="lp-node" cx="368" cy="168" r="3.2" />
    </svg>
  );
}

/** 滚动进入视口后淡入上移 — CSS 动画，无额外依赖 */
function useReveal(threshold = 0.18) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const { ref, visible } = useReveal();
  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${visible ? "lp-reveal--in" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const FLOW = [
  {
    key: "compose",
    title: "构图",
    body: "把题目里的空间关系画出来——棱、面、辅助线，一眼看见结构。",
  },
  {
    key: "reason",
    title: "推理",
    body: "顺着几何关系一步步推：垂直、平行、中点、夹角，逻辑可回放。",
  },
  {
    key: "explain",
    title: "讲解",
    body: "每一步对应公式与结论，像老师板书一样拆开，而不是只给答案。",
  },
  {
    key: "check",
    title: "检验",
    body: "对照 3D 视图与步骤结论，确认理解到位，再进入下一题。",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const go = (path) => {
    startTransition(() => {
      navigate(path);
    });
  };

  const scrollToOverview = () => {
    const el = document.getElementById("overview");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="landing">
      {/* ── Hero：第一视口只做品牌门面 ── */}
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
              onClick={() => go("/workspace")}
            >
              进入工作台
            </button>
            <button
              type="button"
              className="landing-ghost"
              onClick={scrollToOverview}
            >
              了解产品
            </button>
          </div>
        </section>

        <aside className="landing-poster" aria-hidden="true">
          <div className="landing-poster-glow" />
          <PosterArt />
          <div className="landing-poster-caption">
            <span>SEE</span>
            <span>看见结构</span>
          </div>
        </aside>

        <button
          type="button"
          className="landing-scroll-hint"
          onClick={scrollToOverview}
          aria-label="向下滚动了解产品"
        >
          <span className="landing-scroll-hint__line" />
          <span className="landing-scroll-hint__label">向下浏览</span>
        </button>
      </div>

      {/* ── 概述：产品是什么 ── */}
      <section id="overview" className="landing-section landing-overview">
        <Reveal className="landing-section-inner">
          <p className="landing-eyebrow">产品概述</p>
          <h2 className="landing-section-title">
            不是刷题工具，
            <br />
            是帮你把知识看明白
          </h2>
          <p className="landing-section-lead">
            理解引擎把立体几何变成可交互的三维场景：输入题目，立刻看到结构、步骤与结论同屏对应。学习路径始终是「输入 → 看清 → 理解」。
          </p>
        </Reveal>
      </section>

      {/* ── 能力叙事：全宽暗色，一条主线 ── */}
      <section className="landing-section landing-capability" aria-labelledby="cap-title">
        <Reveal className="landing-section-inner landing-capability-inner">
          <p className="landing-eyebrow landing-eyebrow--light">核心能力</p>
          <h2 id="cap-title" className="landing-section-title landing-section-title--light">
            三维场景 + 逐步讲解
          </h2>
          <p className="landing-section-lead landing-section-lead--light">
            旋转、测量、高亮关键线与夹角；讲解与画面同步推进，抽象关系落成可感知的空间。
          </p>
          <ul className="landing-cap-list">
            <li>
              <strong>即时构图</strong>
              <span>题目解析后生成可交互立体模型</span>
            </li>
            <li>
              <strong>步骤可视</strong>
              <span>每一步对应公式、推理与结论</span>
            </li>
            <li>
              <strong>零配置上手</strong>
              <span>打开即可用，无需设置模型或 API</span>
            </li>
          </ul>
        </Reveal>
      </section>

      {/* ── 学习流：构图→推理→讲解→检验 ── */}
      <section className="landing-section landing-flow" aria-labelledby="flow-title">
        <Reveal className="landing-section-inner">
          <p className="landing-eyebrow">学习路径</p>
          <h2 id="flow-title" className="landing-section-title">
            四步，从看见到会做
          </h2>
          <ol className="landing-flow-list">
            {FLOW.map((item, i) => (
              <li key={item.key} className="landing-flow-item" style={{ "--i": i }}>
                <span className="landing-flow-index">{String(i + 1).padStart(2, "0")}</span>
                <div className="landing-flow-copy">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ── 收尾 CTA ── */}
      <section className="landing-section landing-end">
        <Reveal className="landing-section-inner landing-end-inner">
          <h2 className="landing-section-title">从一道题开始</h2>
          <p className="landing-section-lead">
            打开工作台，输入或选择立体几何题，立刻看到结构与讲解。
          </p>
          <div className="landing-cta-row">
            <button
              type="button"
              className="landing-submit"
              onClick={() => go("/workspace")}
            >
              进入工作台
            </button>
            <button
              type="button"
              className="landing-ghost"
              onClick={() => go("/history")}
            >
              学习记录
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <span>理解引擎</span>
        <span className="landing-footer-dot" aria-hidden="true">·</span>
        <span>Understanding Engine</span>
      </footer>
    </div>
  );
}

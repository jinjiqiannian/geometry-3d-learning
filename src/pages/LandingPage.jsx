import { useEffect, useRef, useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./LandingPage.css";

/** 品牌几何：随滚动阶段切换高亮与辅助线 */
function StoryArt({ stage = 0 }) {
  return (
    <svg
      className={`landing-story-art landing-story-art--stage-${stage}`}
      viewBox="0 0 480 520"
      aria-hidden="true"
    >
      <g className="lp-grid">
        {Array.from({ length: 9 }, (_, i) => {
          const x = 48 + i * 48;
          return <line key={`v${i}`} x1={x} y1="40" x2={x} y2="480" />;
        })}
        {Array.from({ length: 10 }, (_, i) => {
          const y = 40 + i * 48;
          return <line key={`h${i}`} x1="48" y1={y} x2="432" y2={y} />;
        })}
      </g>

      {/* 立方体线框：构图阶段显现 */}
      <g className="lp-cube">
        <path className="lp-edge lp-edge--base" d="M140 320 L260 280 L380 320 L260 360 Z" />
        <path className="lp-edge lp-edge--top" d="M140 200 L260 160 L380 200 L260 240 Z" />
        <line className="lp-edge" x1="140" y1="200" x2="140" y2="320" />
        <line className="lp-edge" x1="260" y1="160" x2="260" y2="280" />
        <line className="lp-edge" x1="380" y1="200" x2="380" y2="320" />
        <line className="lp-edge" x1="260" y1="240" x2="260" y2="360" />
      </g>

      {/* 推理：体对角线 */}
      <path
        className="lp-slash lp-slash--diag"
        d="M140 320 L380 200"
        pathLength="1"
      />

      {/* 讲解：面辅助线 */}
      <path
        className="lp-slash lp-slash--face"
        d="M140 320 L260 280"
        pathLength="1"
      />

      <circle className="lp-node lp-node-a" cx="140" cy="320" r="4" />
      <circle className="lp-node lp-node-g" cx="380" cy="200" r="4" />
      <circle className="lp-node lp-node-mid" cx="260" cy="280" r="3.2" />

      <text className="lp-label lp-label-a" x="118" y="336">
        A
      </text>
      <text className="lp-label lp-label-g" x="388" y="192">
        G
      </text>
    </svg>
  );
}

function useReveal(threshold = 0.2) {
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
      { threshold, rootMargin: "0px 0px -10% 0px" },
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

/** Sticky 叙事：滚动面板驱动左侧画面阶段 */
function useStoryStage(count) {
  const rootRef = useRef(null);
  const panelRefs = useRef([]);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const panels = panelRefs.current.filter(Boolean);
    if (panels.length === 0) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const idx = Number(visible[0].target.dataset.stage);
          if (!Number.isNaN(idx)) setStage(idx);
        }
      },
      { threshold: [0.35, 0.55, 0.7], rootMargin: "-20% 0px -35% 0px" },
    );

    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [count]);

  const setPanelRef = (i) => (el) => {
    panelRefs.current[i] = el;
  };

  return { rootRef, stage, setPanelRef };
}

const STORY = [
  {
    key: "compose",
    kicker: "01 · 构图",
    title: "先把结构画出来",
    body: "题目里的棱、面、点落成可旋转的立体模型。不是示意图，是能转、能量的空间。",
  },
  {
    key: "reason",
    kicker: "02 · 推理",
    title: "顺着关系往下推",
    body: "垂直、平行、中点、对角线——关键线高亮，推理路径可回放，每一步都看得见。",
  },
  {
    key: "explain",
    kicker: "03 · 讲解",
    title: "公式跟着画面走",
    body: "左侧步骤、右侧几何同步推进。像老师板书，而不是只丢一个答案。",
  },
  {
    key: "check",
    kicker: "04 · 检验",
    title: "看懂了，才算过关",
    body: "对照三维场景与结论，确认理解到位，再进入下一题。",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { rootRef, stage, setPanelRef } = useStoryStage(STORY.length);

  const go = (path) => {
    startTransition(() => {
      navigate(path);
    });
  };

  const scrollToStory = () => {
    document.getElementById("story")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="landing">
      {/* ── Hero：一屏品牌门面 ── */}
      <header className="landing-hero">
        <div className="landing-hero-copy">
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
            先看清结构，再学会推理。数学已开放；物理、化学将按同一理解能力接入。
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
              onClick={scrollToStory}
            >
              看看怎么学
            </button>
          </div>
        </div>

        <aside className="landing-hero-visual" aria-hidden="true">
          <div className="landing-hero-glow" />
          <StoryArt stage={1} />
          <div className="landing-hero-caption">
            <span>SEE</span>
            <span>看见结构</span>
          </div>
        </aside>

        <button
          type="button"
          className="landing-scroll-hint"
          onClick={scrollToStory}
          aria-label="向下滚动了解产品"
        >
          <span className="landing-scroll-hint__line" />
          <span className="landing-scroll-hint__label">Scroll</span>
        </button>
      </header>

      {/* ── 宣言：一屏一句话 ── */}
      <section className="landing-manifesto" id="overview" aria-label="产品理念">
        <Reveal className="landing-manifesto-inner">
          <p className="landing-manifesto-kicker">不是刷题工具</p>
          <h2 className="landing-manifesto-title">
            帮你把知识
            <br />
            <span>看明白</span>
          </h2>
          <p className="landing-manifesto-lead">
            输入一道立体几何题，立刻得到可交互的三维场景与逐步讲解。
            学习路径始终是：输入 → 看清 → 理解。
          </p>
        </Reveal>
      </section>

      {/* ── Sticky Canvas：大厂式滚动叙事 ── */}
      <section
        id="story"
        className="landing-story"
        ref={rootRef}
        aria-label="学习路径"
      >
        <div className="landing-story-sticky" aria-hidden="true">
          <div className="landing-story-stage">
            <p className="landing-story-stage-label">
              {STORY[stage]?.kicker ?? "01 · 构图"}
            </p>
            <StoryArt stage={stage} />
            <div className="landing-story-progress" role="presentation">
              {STORY.map((item, i) => (
                <span
                  key={item.key}
                  className={`landing-story-progress-dot ${
                    i === stage ? "is-active" : i < stage ? "is-done" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="landing-story-panels">
          {STORY.map((item, i) => (
            <article
              key={item.key}
              className={`landing-story-panel ${
                i === stage ? "is-active" : ""
              }`}
              data-stage={i}
              ref={setPanelRef(i)}
            >
              <div className="landing-story-panel-art" aria-hidden="true">
                <StoryArt stage={i} />
              </div>
              <p className="landing-eyebrow">{item.kicker}</p>
              <h3 className="landing-story-panel-title">{item.title}</h3>
              <p className="landing-story-panel-body">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── 产品瞬间：同屏对应 ── */}
      <section className="landing-moment" aria-labelledby="moment-title">
        <Reveal className="landing-moment-inner">
          <p className="landing-eyebrow landing-eyebrow--light">工作台</p>
          <h2 id="moment-title" className="landing-moment-title">
            步骤与三维
            <br />
            同屏对应
          </h2>
          <p className="landing-moment-lead">
            左边推一步，右边高亮一条线。旋转、测量、回放——抽象关系落成可感知的空间。
          </p>

          <div className="landing-moment-frame" aria-hidden="true">
            <div className="landing-moment-pane landing-moment-pane--steps">
              <span className="landing-moment-chip">步骤</span>
              <ol>
                <li className="is-done">画出底面与侧棱</li>
                <li className="is-current">用勾股定理求 AG</li>
                <li>写出体对角线结论</li>
              </ol>
            </div>
            <div className="landing-moment-pane landing-moment-pane--viz">
              <span className="landing-moment-chip">三维</span>
              <StoryArt stage={2} />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 零摩擦 ── */}
      <section className="landing-friction" aria-labelledby="friction-title">
        <Reveal className="landing-friction-inner">
          <p className="landing-eyebrow">上手</p>
          <h2 id="friction-title" className="landing-section-title">
            打开就能用
          </h2>
          <p className="landing-section-lead">
            无需配置模型或 API。访客可直接进入工作台，从一道题开始。
          </p>
          <ul className="landing-friction-list">
            <li>
              <strong>即时构图</strong>
              解析后生成可交互立体模型
            </li>
            <li>
              <strong>步骤可视</strong>
              每一步对应公式与结论
            </li>
            <li>
              <strong>零配置</strong>
              不暴露开发者选项
            </li>
          </ul>
        </Reveal>
      </section>

      {/* ── 收尾 CTA ── */}
      <section className="landing-end">
        <Reveal className="landing-end-inner">
          <h2 className="landing-end-title">从一道题开始</h2>
          <p className="landing-end-lead">
            进入工作台，输入立体几何题，立刻看到结构与讲解。
          </p>
          <div className="landing-cta-row landing-cta-row--center">
            <button
              type="button"
              className="landing-submit landing-submit--lg"
              onClick={() => go("/workspace")}
            >
              进入工作台
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <span>理解引擎</span>
        <span className="landing-footer-dot" aria-hidden="true">
          ·
        </span>
        <span>Understanding Engine</span>
      </footer>
    </div>
  );
}

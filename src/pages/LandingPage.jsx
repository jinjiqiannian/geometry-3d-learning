import { useEffect, useRef, useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./LandingPage.css";

const STORY = [
  {
    key: "compose",
    kicker: "01 · 构图",
    title: "先把结构画出来",
    body: "题目里的棱、面、点，落成可旋转的立体模型。不是示意图，是能转、能量的空间。",
  },
  {
    key: "reason",
    kicker: "02 · 推理",
    title: "顺着关系往下推",
    body: "垂直、平行、中点、对角线。关键线高亮，推理路径可回放——每一步都看得见。",
  },
  {
    key: "explain",
    kicker: "03 · 讲解",
    title: "公式跟着画面走",
    body: "左边推一步，右边亮一条线。像老师板书，而不是只丢一个答案。",
  },
  {
    key: "check",
    kicker: "04 · 检验",
    title: "看懂了，才算过关",
    body: "对照三维场景与结论，确认理解到位，再进入下一题。",
  },
];

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

/** 根据 progress 写入 SVG 描线（直接操作 DOM，避免每帧 React 重绘） */
function paintStoryArt(svg, progress, hero = false) {
  if (!svg) return;
  const edgeOp = hero ? 0.72 : 0.28 + Math.min(1, progress / 0.2) * 0.5;
  const diagDraw = hero ? 1 : clamp01((progress - 0.22) / 0.24);
  const faceDraw = hero ? 0 : clamp01((progress - 0.5) / 0.22);
  const nodeOp = hero ? 1 : 0.35 + clamp01((progress - 0.08) / 0.2) * 0.65;

  svg.querySelectorAll(".lp-edge").forEach((el) => {
    el.style.strokeOpacity = String(edgeOp);
  });
  const diag = svg.querySelector(".lp-slash--diag");
  if (diag) {
    diag.style.strokeDashoffset = String(1 - diagDraw);
    diag.style.opacity = String(diagDraw > 0.01 ? 0.35 + diagDraw * 0.65 : 0);
  }
  const face = svg.querySelector(".lp-slash--face");
  if (face) {
    face.style.strokeDashoffset = String(1 - faceDraw);
    face.style.opacity = String(faceDraw > 0.01 ? 0.35 + faceDraw * 0.65 : 0);
  }
  svg.querySelectorAll(".lp-node-a, .lp-label-a").forEach((el) => {
    el.style.opacity = String(nodeOp);
  });
  svg.querySelectorAll(".lp-node-g, .lp-label-g").forEach((el) => {
    el.style.opacity = String(nodeOp * (0.35 + diagDraw * 0.65));
  });
  const mid = svg.querySelector(".lp-node-mid");
  if (mid) mid.style.opacity = String(faceDraw);
}

function StoryArt({ className = "", hero = false }) {
  return (
    <svg
      className={`landing-story-art${hero ? " landing-story-art--hero" : ""} ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-hero={hero ? "1" : undefined}
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

      <g className="lp-cube">
        <path className="lp-edge" d="M140 320 L260 280 L380 320 L260 360 Z" />
        <path className="lp-edge" d="M140 200 L260 160 L380 200 L260 240 Z" />
        <line className="lp-edge" x1="140" y1="200" x2="140" y2="320" />
        <line className="lp-edge" x1="260" y1="160" x2="260" y2="280" />
        <line className="lp-edge" x1="380" y1="200" x2="380" y2="320" />
        <line className="lp-edge" x1="260" y1="240" x2="260" y2="360" />
      </g>

      <path
        className="lp-slash lp-slash--diag"
        d="M140 320 L380 200"
        pathLength="1"
      />
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

function stageOpacity(index, progress, count) {
  const exact = progress * count;
  const current = Math.min(count - 1, Math.floor(exact));
  const local = exact - current;
  if (index === current) return 1 - local * 0.25;
  if (index === current + 1 && current < count - 1) return local * 0.9;
  return 0;
}

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

export default function LandingPage() {
  const navigate = useNavigate();
  const storyRef = useRef(null);
  const pinArtRef = useRef(null);
  const trackFillRef = useRef(null);
  const labelRef = useRef(null);
  const slideRefs = useRef([]);
  const beatRefs = useRef([]);
  const stageRef = useRef(0);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Hero art 初始态
  useEffect(() => {
    document.querySelectorAll(".landing-story-art--hero").forEach((svg) => {
      paintStoryArt(svg, 0.5, true);
    });
  }, []);

  // Sticky film：rAF + DOM 直写，滚动不掉帧、不发黑
  useEffect(() => {
    const el = storyRef.current;
    if (!el || !isDesktop) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const apply = (progress) => {
      const svg =
        pinArtRef.current?.querySelector?.("svg") || pinArtRef.current;
      paintStoryArt(svg, reduced ? 1 : progress, false);

      if (trackFillRef.current) {
        trackFillRef.current.style.transform = `scaleX(${progress})`;
      }

      const stage = Math.min(
        STORY.length - 1,
        Math.floor(progress * STORY.length * 0.999),
      );
      if (labelRef.current && stageRef.current !== stage) {
        labelRef.current.textContent = STORY[stage].kicker;
      }
      stageRef.current = stage;

      STORY.forEach((_, i) => {
        const slide = slideRefs.current[i];
        if (!slide) return;
        const op = reduced ? (i === stage ? 1 : 0) : stageOpacity(i, progress, STORY.length);
        slide.style.opacity = String(op);
        slide.style.transform = `translateY(${(1 - op) * 16}px)`;
        slide.style.pointerEvents = i === stage ? "auto" : "none";
        slide.setAttribute("aria-hidden", i === stage ? "false" : "true");

        const beat = beatRefs.current[i];
        if (beat) {
          beat.classList.toggle("is-active", i === stage);
          beat.classList.toggle("is-done", i < stage);
        }
      });
    };

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const progress =
        total <= 0 ? (rect.top < 0 ? 1 : 0) : clamp01(-rect.top / total);
      apply(progress);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    apply(0);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isDesktop]);

  // 移动端：每张 slide 自带静态画面
  useEffect(() => {
    if (isDesktop) return;
    document.querySelectorAll(".landing-story-slide-art .landing-story-art").forEach((svg, i) => {
      paintStoryArt(svg, (i + 0.7) / STORY.length, false);
    });
  }, [isDesktop]);

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
          <StoryArt hero />
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

      <section
        id="story"
        className="landing-story"
        ref={storyRef}
        style={isDesktop ? { height: `${STORY.length * 100}vh` } : undefined}
        aria-label="学习路径"
      >
        <div className="landing-story-pin">
          <div className="landing-story-visual" aria-hidden="true">
            <p className="landing-story-stage-label" ref={labelRef}>
              {STORY[0].kicker}
            </p>
            <div ref={pinArtRef}>
              <StoryArt />
            </div>
            <div className="landing-story-track" role="presentation">
              <div className="landing-story-track-fill" ref={trackFillRef} />
            </div>
            <div className="landing-story-beats">
              {STORY.map((item, i) => (
                <span
                  key={item.key}
                  ref={(el) => {
                    beatRefs.current[i] = el;
                  }}
                  className={`landing-story-beat ${i === 0 ? "is-active" : ""}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-story-copy">
            {STORY.map((item, i) => (
              <article
                key={item.key}
                className="landing-story-slide"
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                style={
                  isDesktop
                    ? {
                        opacity: i === 0 ? 1 : 0,
                        transform: "translateY(0)",
                      }
                    : undefined
                }
              >
                <div className="landing-story-slide-art" aria-hidden="true">
                  <StoryArt />
                </div>
                <p className="landing-eyebrow landing-eyebrow--light">
                  {item.kicker}
                </p>
                <h3 className="landing-story-slide-title">{item.title}</h3>
                <p className="landing-story-slide-body">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

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
            <div className="landing-moment-chrome">
              <span />
              <span />
              <span />
              <em>理解引擎 · 工作台</em>
            </div>
            <div className="landing-moment-body">
              <div className="landing-moment-pane landing-moment-pane--steps">
                <span className="landing-moment-chip">步骤</span>
                <ol>
                  <li className="is-done">
                    <i>✓</i>
                    画出底面与侧棱
                  </li>
                  <li className="is-current">
                    <i>2</i>
                    用勾股定理求 AG
                  </li>
                  <li>
                    <i>3</i>
                    写出体对角线结论
                  </li>
                </ol>
              </div>
              <div className="landing-moment-pane landing-moment-pane--viz">
                <span className="landing-moment-chip">三维</span>
                <MomentArt />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

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

function MomentArt() {
  const ref = useRef(null);
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    paintStoryArt(svg, 0.72, false);
  }, []);
  return (
    <div ref={ref}>
      <StoryArt />
    </div>
  );
}

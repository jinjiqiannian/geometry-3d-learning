import { useLayoutEffect, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { curriculumStats } from "../data/curriculum";
import "./LandingPage.css";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconLayers({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...strokeProps} aria-hidden="true">
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconSearch({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...strokeProps} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function IconArrowRight({ size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      {...strokeProps}
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

const MODES = [
  {
    key: "teach",
    path: "/teach",
    icon: IconLayers,
    kicker: "教学模式",
    title: "按册学",
    body: "跟着教材目录选知识点，打开就能看模型、听讲解。",
    meta: "数学 · 物理　必修 + 选择性必修",
  },
  {
    key: "search",
    path: "/search",
    icon: IconSearch,
    kicker: "搜题模式",
    title: "贴题即讲",
    body: "粘贴题目或拍照上传，逐步拆给你看，公式跟画面走。",
    meta: "步骤与三维同屏对应，可回放",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const stats = curriculumStats();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("is-landing");
    document.body.classList.add("is-landing");
    return () => {
      root.classList.remove("is-landing");
      document.body.classList.remove("is-landing");
    };
  }, []);

  const go = (path) => {
    startTransition(() => {
      navigate(path);
    });
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <BrandLogo className="landing-nav-logo" size={30} />
          <span className="landing-nav-name">即懂</span>
        </div>
        <div className="landing-nav-links">
          <span className="landing-nav-stat">
            {stats.points} 个知识点 · {stats.models} 种模型
          </span>
        </div>
      </nav>

      <main className="landing-hero">
        <div className="landing-hero-inner">
          <h1 className="landing-title">
            把抽象知识
            <br />
            变得看得见
          </h1>

          <div className="landing-modes">
            {MODES.map((mode, i) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  type="button"
                  className={`landing-mode landing-mode--${mode.key}`}
                  style={{ "--mode-index": i }}
                  onClick={() => go(mode.path)}
                >
                  <span className="landing-mode-head">
                    <span className="landing-mode-icon">
                      <Icon />
                    </span>
                    <span className="landing-mode-kicker">{mode.kicker}</span>
                  </span>
                  <span className="landing-mode-title">{mode.title}</span>
                  <span className="landing-mode-body">{mode.body}</span>
                  <span className="landing-mode-foot">
                    <span className="landing-mode-meta">{mode.meta}</span>
                    <span className="landing-mode-go" aria-hidden="true">
                      <IconArrowRight />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <span>即懂</span>
        <span className="landing-footer-dot" aria-hidden="true">
          ·
        </span>
        <span>MathViz</span>
      </footer>
    </div>
  );
}

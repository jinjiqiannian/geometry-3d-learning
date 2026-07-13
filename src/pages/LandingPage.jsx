import { useNavigate } from "react-router-dom";
import { SUBJECTS } from "../constants";
import "./LandingPage.css";

function GeometryLogo({ size = 48 }) {
  return (
    <svg
      className="landing-logo-svg"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size }}
    >
      <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
      <path d="M3 9l13 7 13-7" />
      <path d="M16 23V9" />
      <path d="M8 13.5l8 4 8-4" />
      <path d="M8 18.5l8 4 8-4" />
    </svg>
  );
}

function SubjectIcon({ type, size = 18 }) {
  const icons = {
    math: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
        <path d="M3 9l13 7 13-7" />
        <path d="M16 23V9" />
      </svg>
    ),
    physics: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
    chemistry: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <circle cx="12" cy="8" r="3" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 11L12 13" />
        <path d="M12 13L8 13" />
        <path d="M12 13L16 13" />
      </svg>
    ),
    biology: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        <ellipse cx="12" cy="12" rx="8" ry="10" />
        <path d="M12 4L12 20" />
        <path d="M6 8L18 8" />
        <path d="M6 12L18 12" />
        <path d="M6 16L18 16" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  };
  return icons[type] || icons.math;
}

const FEATURES = [
  {
    id: "ai",
    icon: "✦",
    title: "AI 智能解析",
    desc: "输入题目，AI 自动识别并生成解题步骤",
  },
  {
    id: "d3",
    icon: "◈",
    title: "3D 动态演示",
    desc: "交互式三维模型，自由旋转缩放",
  },
  {
    id: "nb",
    icon: "📋",
    title: "智能错题本",
    desc: "自动记录错题，针对性巩固薄弱点",
  },
  {
    id: "te",
    icon: "◆",
    title: "教师模式",
    desc: "板书式分步讲解，高效备课授课",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden="true" />

      <div className="landing-bg-orb landing-bg-orb-1" aria-hidden="true" />
      <div className="landing-bg-orb landing-bg-orb-2" aria-hidden="true" />
      <div className="landing-bg-grid" aria-hidden="true" />

      <section className="landing-hero">
        <h1 className="landing-hero-title">
          <span className="landing-hero-line-1">AI 驱动的</span>
          <span className="landing-hero-line-2">3D 学习平台</span>
        </h1>
        <p className="landing-hero-subtitle">
          输入题目，AI 带你一步步理解空间几何
        </p>

        <button
          className="landing-hero-cta"
          onClick={() => navigate("/math")}
        >
          <span>开始学习</span>
        </button>

        <div className="landing-hero-subjects">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              className="landing-hero-subject-chip"
              onClick={() => navigate(s.path)}
              style={{ borderColor: `${s.color}30`, color: s.color }}
            >
              <SubjectIcon type={s.icon} size={14} />
              {s.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

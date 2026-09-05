import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import "./AppNavigation.css";

const NAV_ITEMS = [
  { path: "/", label: "首页" },
  { path: "/workspace", label: "工作台" },
  { path: "/mistakes", label: "错题本" },
  { path: "/progress", label: "进度" },
  { path: "/history", label: "历史" },
  { path: "/edumind", label: "考试分析" },
  { path: "/settings", label: "设置" },
];

function LogoIcon() {
  return (
    <svg className="app-nav-logo-icon" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="nav-logo-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A84FF" />
          <stop offset="1" stopColor="#0040DD" />
        </linearGradient>
        <linearGradient id="nav-logo-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6CC2FF" />
          <stop offset="1" stopColor="#0A84FF" />
        </linearGradient>
      </defs>
      <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" fill="url(#nav-logo-body)" />
      <path d="M16 2L3 9l13 7 13-7z" fill="url(#nav-logo-top)" />
      <path
        d="M8 13.5l8 4 8-4"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 18.5l8 4 8-4"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16v14"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AppNavigation() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="app-nav">
      <div className="app-nav-left">
        <Link to="/" className="app-nav-logo">
          <LogoIcon />
          几何维度
        </Link>

        <nav className="app-nav-links" aria-label="主导航">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`app-nav-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="app-nav-right">
        <ThemeToggle />
        <UserMenu />
      </div>
    </nav>
  );
}

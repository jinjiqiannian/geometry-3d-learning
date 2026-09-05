import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { CURRICULUM, curriculumStats } from "../data/curriculum";
import "./LandingPage.css";

const STORY = [
  {
    key: "compose",
    kicker: "01",
    title: "先看见结构",
    body: "棱、面、点落成立体。能转、能量，不是示意图。",
  },
  {
    key: "reason",
    kicker: "02",
    title: "顺着关系推",
    body: "平行、垂直、中点。关键线亮起来，路径可回放。",
  },
  {
    key: "explain",
    kicker: "03",
    title: "公式跟画面走",
    body: "左边一步，右边一条线。像板书，不是只丢答案。",
  },
  {
    key: "check",
    kicker: "04",
    title: "看懂再往下",
    body: "三维场景对照结论。确认理解，再进下一题。",
  },
];

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

/** Scrub enhances art — never hides the base solid */
function paintGeometryArt(svg, progress, variant = "compose") {
  if (!svg) return;
  const p = clamp01(progress);

  svg.querySelectorAll(".lp-edge").forEach((el) => {
    el.style.strokeOpacity = String(0.75 + p * 0.25);
  });
  svg.querySelectorAll(".lp-face").forEach((el) => {
    el.style.opacity = String(0.75 + p * 0.25);
  });
  const shadow = svg.querySelector(".lp-shadow");
  if (shadow) shadow.style.opacity = String(0.45 + p * 0.35);

  const reveal = (sel, start, end, minOp = 0.55) => {
    const el = svg.querySelector(sel);
    if (!el) return;
    const t = clamp01((p - start) / Math.max(0.01, end - start));
    if (el.classList.contains("lp-slash") || el.getAttribute("pathLength")) {
      el.style.strokeDashoffset = String(Math.max(0, 1 - t));
    }
    el.style.opacity = String(minOp + t * (1 - minOp));
  };

  if (variant === "hero" || variant === "compose") {
    reveal(".lp-slash--diag", 0, 0.4, 0.7);
    reveal(".lp-slash--face", 0.15, 0.55, 0.55);
    svg.querySelectorAll(".lp-node").forEach((el, i) => {
      el.style.opacity = String(0.7 + clamp01((p - i * 0.05) / 0.4) * 0.3);
    });
  } else if (variant === "reason") {
    svg.querySelectorAll(".lp-slash--parallel").forEach((el, i) => {
      const t = clamp01((p - i * 0.1) / 0.45);
      el.style.strokeDashoffset = String(1 - t);
      el.style.opacity = String(0.55 + t * 0.45);
    });
    reveal(".lp-arc", 0.25, 0.65, 0.55);
    svg.querySelectorAll(".lp-node").forEach((el) => {
      el.style.opacity = String(0.75 + p * 0.25);
    });
  } else if (variant === "explain") {
    reveal(".lp-slash--step", 0.1, 0.5, 0.65);
    svg.querySelectorAll(".lp-board-line").forEach((el, i) => {
      const t = clamp01((p - 0.15 - i * 0.08) / 0.35);
      el.style.strokeDashoffset = String(1 - t);
      el.style.opacity = String(0.4 + t * 0.55);
    });
    svg.querySelectorAll(".lp-face--lit").forEach((el) => {
      el.style.opacity = String(0.8 + p * 0.2);
    });
  } else if (variant === "check") {
    reveal(".lp-ring", 0.1, 0.55, 0.45);
    svg.querySelectorAll(".lp-face").forEach((el) => {
      el.style.opacity = String(0.85 + p * 0.15);
    });
    const confirm = svg.querySelector(".lp-confirm");
    if (confirm) confirm.style.opacity = String(0.55 + p * 0.4);
  } else if (variant === "moment") {
    reveal(".lp-slash--diag", 0.15, 0.6, 0.65);
    svg.querySelectorAll(".lp-face--lit").forEach((el) => {
      el.style.opacity = String(0.85 + p * 0.15);
    });
  }
}

/* ─── Strict isometric projection (30° / √3) ───
 * World: +x right, +y up, +z back. Screen from iso(x,y,z).
 * Cuboid corners: A(0,0,0) B(sx,0,0) C(sx,0,sz) D(0,0,sz)
 *                 E(0,sy,0) F(sx,sy,0) G(sx,sy,sz) H(0,sy,sz)
 */
const ISO_COS = Math.sqrt(3) / 2;
const ISO_SIN = 0.5;

function iso(x, y, z, ox = 240, oy = 360, s = 96) {
  return [
    +(ox + (x - z) * s * ISO_COS).toFixed(2),
    +(oy - y * s + (x + z) * s * ISO_SIN).toFixed(2),
  ];
}

function polyPath(pts) {
  return `${pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ")} Z`;
}

function linePath(a, b) {
  return `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
}

function mid(a, b) {
  return [+((a[0] + b[0]) / 2).toFixed(2), +((a[1] + b[1]) / 2).toFixed(2)];
}

function boxVerts(sx, sy, sz, ox, oy, s) {
  const P = (x, y, z) => iso(x, y, z, ox, oy, s);
  return {
    A: P(0, 0, 0),
    B: P(sx, 0, 0),
    C: P(sx, 0, sz),
    D: P(0, 0, sz),
    E: P(0, sy, 0),
    F: P(sx, sy, 0),
    G: P(sx, sy, sz),
    H: P(0, sy, sz),
  };
}

function IsoGrid({ ox = 240, oy = 360, s = 96, n = 4 }) {
  const lines = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    lines.push(
      <path
        key={`gx${i}`}
        className="lp-grid-line"
        d={linePath(iso(0, 0, t, ox, oy, s), iso(1, 0, t, ox, oy, s))}
      />,
      <path
        key={`gz${i}`}
        className="lp-grid-line"
        d={linePath(iso(t, 0, 0, ox, oy, s), iso(t, 0, 1, ox, oy, s))}
      />,
    );
  }
  return <g className="lp-grid lp-grid--soft">{lines}</g>;
}

function ArtCompose({ className = "", hero = false }) {
  const V = boxVerts(1, 1, 1, 240, 372, 108);
  const shadow = [iso(0.5, 0, 0.5, 240, 372, 108)];
  return (
    <svg
      className={`landing-story-art landing-story-art--compose${hero ? " landing-story-art--hero" : ""} ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-variant="compose"
    >
      <ellipse
        className="lp-shadow"
        cx={shadow[0][0]}
        cy={+(+shadow[0][1] + 8).toFixed(2)}
        rx="118"
        ry="16"
      />
      <IsoGrid ox={240} oy={372} s={108} />
      <g className="lp-solid">
        {/* 等轴测：视线沿 (1,1,1)，可见三面在近角 G 交汇 */}
        <path className="lp-face lp-face--top" d={polyPath([V.E, V.F, V.G, V.H])} />
        <path className="lp-face lp-face--side" d={polyPath([V.B, V.C, V.G, V.F])} />
        <path className="lp-face lp-face--front" d={polyPath([V.D, V.C, V.G, V.H])} />
        {/* 可见棱：六边形外轮廓 + 近角 G 的三条内棱 */}
        <path className="lp-edge" d={linePath(V.E, V.F)} />
        <path className="lp-edge" d={linePath(V.F, V.B)} />
        <path className="lp-edge" d={linePath(V.B, V.C)} />
        <path className="lp-edge" d={linePath(V.C, V.D)} />
        <path className="lp-edge" d={linePath(V.D, V.H)} />
        <path className="lp-edge" d={linePath(V.H, V.E)} />
        <path className="lp-edge" d={linePath(V.F, V.G)} />
        <path className="lp-edge" d={linePath(V.C, V.G)} />
        <path className="lp-edge" d={linePath(V.H, V.G)} />
        {/* 不可见棱：远角 A 出发，虚线 */}
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.B)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.E)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.D)} />
      </g>
      {/* 体对角线 AG（立方体正投影缩为一点）· 面对角线与可见棱 GF 重合 */}
      <path className="lp-slash lp-slash--diag" d={linePath(V.A, V.G)} pathLength="1" />
      <path className="lp-slash lp-slash--face" d={linePath(V.A, V.F)} pathLength="1" />
      <circle className="lp-node" cx={V.A[0]} cy={V.A[1]} r="6" />
      <circle className="lp-node" cx={V.G[0]} cy={V.G[1]} r="6" />
    </svg>
  );
}

function ArtReason({ className = "" }) {
  // 长方体 1 × 1.55 × 1：平行棱 BF ∥ DH（两条可见竖棱），底面近角 ∠BCD = 90°
  const ox = 236;
  const oy = 378;
  const s = 92;
  const V = boxVerts(1, 1.55, 1, ox, oy, s);
  const M1 = mid(V.D, V.H);
  const M2 = mid(V.B, V.F);
  const u = 0.14;
  // 直角记号标在底面近角 C（CB 与 CD 均为可见棱）
  const tickB = iso(1, 0, 1 - u, ox, oy, s);
  const tickD = iso(1 - u, 0, 1, ox, oy, s);
  const tickM = iso(1 - u, 0, 1 - u, ox, oy, s);
  return (
    <svg
      className={`landing-story-art landing-story-art--reason ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-variant="reason"
    >
      <ellipse className="lp-shadow" cx="240" cy="448" rx="112" ry="15" />
      <g className="lp-solid">
        <path className="lp-face lp-face--top" d={polyPath([V.E, V.F, V.G, V.H])} />
        <path className="lp-face lp-face--side" d={polyPath([V.B, V.C, V.G, V.F])} />
        <path className="lp-face lp-face--front" d={polyPath([V.D, V.C, V.G, V.H])} />
        {/* 可见棱：外轮廓 + 近角 G 内棱 */}
        <path className="lp-edge" d={linePath(V.E, V.F)} />
        <path className="lp-edge" d={linePath(V.F, V.B)} />
        <path className="lp-edge" d={linePath(V.B, V.C)} />
        <path className="lp-edge" d={linePath(V.C, V.D)} />
        <path className="lp-edge" d={linePath(V.D, V.H)} />
        <path className="lp-edge" d={linePath(V.H, V.E)} />
        <path className="lp-edge" d={linePath(V.F, V.G)} />
        <path className="lp-edge" d={linePath(V.C, V.G)} />
        <path className="lp-edge" d={linePath(V.H, V.G)} />
        {/* 不可见棱：远角 A 出发，虚线 */}
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.B)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.E)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.D)} />
      </g>
      {/* DH ∥ BF：两条可见的竖直轮廓棱 */}
      <path className="lp-slash lp-slash--parallel" d={linePath(V.D, V.H)} pathLength="1" />
      <path className="lp-slash lp-slash--parallel lp-slash--parallel-b" d={linePath(V.B, V.F)} pathLength="1" />
      {/* 底面近角 C 处的直角记号 */}
      <path
        className="lp-arc"
        d={`${linePath(tickB, tickM)} ${linePath(tickM, tickD)}`}
        pathLength="1"
      />
      <circle className="lp-node" cx={M1[0]} cy={M1[1]} r="5" />
      <circle className="lp-node lp-node--teal" cx={M2[0]} cy={M2[1]} r="5" />
    </svg>
  );
}

function ArtExplain({ className = "" }) {
  const V = boxVerts(1, 1, 1, 292, 368, 88);
  return (
    <svg
      className={`landing-story-art landing-story-art--explain ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-variant="explain"
    >
      <ellipse className="lp-shadow" cx="300" cy="442" rx="100" ry="14" />
      <g className="lp-board">
        <rect className="lp-board-plate" x="36" y="118" width="152" height="220" rx="3" />
        <line className="lp-board-line" x1="60" y1="168" x2="164" y2="168" pathLength="1" />
        <line className="lp-board-line" x1="60" y1="208" x2="148" y2="208" pathLength="1" />
        <line className="lp-board-line" x1="60" y1="248" x2="158" y2="248" pathLength="1" />
        <line className="lp-board-line lp-board-line--accent" x1="60" y1="298" x2="128" y2="298" pathLength="1" />
      </g>
      <g className="lp-solid">
        <path className="lp-face lp-face--top" d={polyPath([V.E, V.F, V.G, V.H])} />
        <path className="lp-face lp-face--side" d={polyPath([V.B, V.C, V.G, V.F])} />
        <path className="lp-face lp-face--front lp-face--lit" d={polyPath([V.D, V.C, V.G, V.H])} />
        <path className="lp-edge" d={linePath(V.E, V.F)} />
        <path className="lp-edge" d={linePath(V.F, V.B)} />
        <path className="lp-edge" d={linePath(V.B, V.C)} />
        <path className="lp-edge" d={linePath(V.C, V.D)} />
        <path className="lp-edge" d={linePath(V.D, V.H)} />
        <path className="lp-edge" d={linePath(V.H, V.E)} />
        <path className="lp-edge" d={linePath(V.F, V.G)} />
        <path className="lp-edge" d={linePath(V.C, V.G)} />
        <path className="lp-edge" d={linePath(V.H, V.G)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.B)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.E)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.D)} />
      </g>
      {/* “步”路径：穿过近角、两端落在可见顶点上 */}
      <path className="lp-slash lp-slash--step" d={linePath(V.F, V.D)} pathLength="1" />
      <circle className="lp-node" cx={V.F[0]} cy={V.F[1]} r="6" />
      <circle className="lp-node" cx={V.D[0]} cy={V.D[1]} r="6" />
    </svg>
  );
}

function ArtCheck({ className = "" }) {
  const V = boxVerts(1, 1, 1, 240, 355, 100);
  const center = mid(mid(V.A, V.G), mid(V.B, V.H));
  return (
    <svg
      className={`landing-story-art landing-story-art--check ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-variant="check"
    >
      <ellipse className="lp-shadow" cx="240" cy="430" rx="130" ry="18" />
      <circle className="lp-ring" cx={center[0]} cy={center[1]} r="168" pathLength="1" />
      <g className="lp-solid">
        <path className="lp-face lp-face--top" d={polyPath([V.E, V.F, V.G, V.H])} />
        <path className="lp-face lp-face--side" d={polyPath([V.B, V.C, V.G, V.F])} />
        <path className="lp-face lp-face--front" d={polyPath([V.D, V.C, V.G, V.H])} />
        <path className="lp-edge" d={linePath(V.E, V.F)} />
        <path className="lp-edge" d={linePath(V.F, V.B)} />
        <path className="lp-edge" d={linePath(V.B, V.C)} />
        <path className="lp-edge" d={linePath(V.C, V.D)} />
        <path className="lp-edge" d={linePath(V.D, V.H)} />
        <path className="lp-edge" d={linePath(V.H, V.E)} />
        <path className="lp-edge" d={linePath(V.F, V.G)} />
        <path className="lp-edge" d={linePath(V.C, V.G)} />
        <path className="lp-edge" d={linePath(V.H, V.G)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.B)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.E)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(V.A, V.D)} />
      </g>
      <path
        className="lp-confirm"
        d={`M${+(+center[0] - 42).toFixed(2)} ${center[1]} L${+(+center[0] - 12).toFixed(2)} ${+(+center[1] + 32).toFixed(2)} L${+(+center[0] + 48).toFixed(2)} ${+(+center[1] - 36).toFixed(2)}`}
      />
    </svg>
  );
}

function ArtMoment({ className = "" }) {
  // 正四棱锥：底 ABCD，顶点 S 在底心正上方
  const ox = 240;
  const oy = 390;
  const s = 110;
  const A = iso(0, 0, 0, ox, oy, s);
  const B = iso(1, 0, 0, ox, oy, s);
  const C = iso(1, 0, 1, ox, oy, s);
  const D = iso(0, 0, 1, ox, oy, s);
  const S = iso(0.5, 1.25, 0.5, ox, oy, s);
  const O = iso(0.5, 0, 0.5, ox, oy, s);
  return (
    <svg
      className={`landing-story-art landing-story-art--moment ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-variant="moment"
    >
      <ellipse className="lp-shadow" cx={O[0]} cy={+(+O[1] + 12).toFixed(2)} rx="120" ry="16" />
      <g className="lp-solid">
        {/* 可见侧面在近底角 C 两侧：右前 SBC、左前 SDC；底面朝下不可见，不填色 */}
        <path className="lp-face lp-face--side" d={polyPath([S, B, C])} />
        <path className="lp-face lp-face--lit" d={polyPath([S, D, C])} />
        {/* 可见棱：侧面轮廓 S-B-C-D-S + 近折棱 S-C */}
        <path className="lp-edge" d={linePath(S, B)} />
        <path className="lp-edge" d={linePath(B, C)} />
        <path className="lp-edge" d={linePath(C, D)} />
        <path className="lp-edge" d={linePath(D, S)} />
        <path className="lp-edge" d={linePath(S, C)} />
        {/* 底面远边 A-B、A-D 被侧面遮挡，虚线；S-A 与可见棱 S-C 投影重合，省略 */}
        <path className="lp-edge lp-edge--ghost" d={linePath(A, B)} />
        <path className="lp-edge lp-edge--ghost" d={linePath(A, D)} />
      </g>
      {/* 高 SO：顶点到底心 */}
      <path className="lp-slash lp-slash--diag" d={linePath(S, O)} pathLength="1" />
      <circle className="lp-node" cx={S[0]} cy={S[1]} r="6" />
      <circle className="lp-node" cx={O[0]} cy={O[1]} r="5" />
    </svg>
  );
}

function ArtCylinder({ className = "" }) {
  const ox = 240;
  const oy = 380;
  const s = 100;
  const r = 0.55;
  const h = 1.35;
  const n = 48;
  const top = [];
  const bot = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const x = 0.5 + r * Math.cos(th);
    const z = 0.5 + r * Math.sin(th);
    top.push(iso(x, h, z, ox, oy, s));
    bot.push(iso(x, 0, z, ox, oy, s));
  }
  const leftT = iso(0.5 - r, h, 0.5, ox, oy, s);
  const leftB = iso(0.5 - r, 0, 0.5, ox, oy, s);
  const rightT = iso(0.5 + r, h, 0.5, ox, oy, s);
  const rightB = iso(0.5 + r, 0, 0.5, ox, oy, s);
  const sideFill = [...top.slice(0, n / 2 + 1), ...bot.slice(0, n / 2 + 1).reverse()];
  return (
    <svg
      className={`landing-story-art landing-story-art--cylinder ${className}`.trim()}
      viewBox="0 0 480 520"
      aria-hidden="true"
      data-variant="compose"
    >
      <ellipse className="lp-shadow" cx="240" cy="448" rx="120" ry="16" />
      <g className="lp-solid">
        {/* 侧壁 + 顶面（底面朝下不可见，不填色） */}
        <path className="lp-face lp-face--side" d={polyPath(sideFill)} />
        <path className="lp-face lp-face--top" d={polyPath(top)} />
        <path className="lp-edge" d={polyPath(top).replace(" Z", "")} />
        {/* 底圆：后半弧被侧壁遮挡为虚线，前半弧为可见轮廓 */}
        <path
          className="lp-edge lp-edge--ghost"
          d={bot
            .slice(n / 2)
            .map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`)
            .join(" ")}
        />
        <path
          className="lp-edge"
          d={bot
            .slice(0, n / 2 + 1)
            .map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`)
            .join(" ")}
        />
        <path className="lp-edge" d={linePath(leftT, leftB)} />
        <path className="lp-edge" d={linePath(rightT, rightB)} />
      </g>
      <path className="lp-slash lp-slash--diag" d={linePath(leftB, rightB)} pathLength="1" />
      <circle className="lp-node" cx={leftB[0]} cy={leftB[1]} r="5" />
      <circle className="lp-node lp-node--teal" cx={rightB[0]} cy={rightB[1]} r="5" />
    </svg>
  );
}

const STORY_ART = {
  compose: ArtCompose,
  reason: ArtReason,
  explain: ArtExplain,
  check: ArtCheck,
};

function storyExact(progress, count) {
  return Math.min(count - 0.001, progress * count);
}

function stageOpacity(index, progress, count) {
  const exact = storyExact(progress, count);
  const current = Math.floor(exact);
  const local = exact - current;
  if (index === current) return 1 - local * 0.15;
  if (index === current + 1 && current < count - 1) return local * 0.9;
  return 0;
}

function useReveal(threshold = 0.08) {
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
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold, rootMargin: "40px 0px -4% 0px" },
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
  const slideRefs = useRef([]);
  const beatRefs = useRef([]);
  const artLayerRefs = useRef([]);
  const plateRef = useRef(null);
  const captionKickerRef = useRef(null);
  const captionTitleRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 901px)").matches
      : true,
  );
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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Hero: paint bright + pointer parallax
  useEffect(() => {
    document.querySelectorAll(".landing-story-art--hero").forEach((svg) => {
      paintGeometryArt(svg, 1, "compose");
    });

    const visual = document.querySelector(".landing-hero-visual");
    const art = visual?.querySelector(".landing-hero-art-inner");
    if (!visual || !art) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const tick = () => {
      curX += (targetX - curX) * 0.1;
      curY += (targetY - curY) * 0.1;
      art.style.setProperty("--lp-px", `${curX.toFixed(2)}px`);
      art.style.setProperty("--lp-py", `${curY.toFixed(2)}px`);
      art.style.setProperty("--lp-ry", `${(curX * 0.4).toFixed(2)}deg`);
      art.style.setProperty("--lp-rx", `${(-curY * 0.35).toFixed(2)}deg`);
      if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onMove = (e) => {
      const rect = visual.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = nx * 18;
      targetY = ny * 12;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    visual.addEventListener("pointermove", onMove, { passive: true });
    visual.addEventListener("pointerleave", onLeave);
    return () => {
      visual.removeEventListener("pointermove", onMove);
      visual.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Sticky film scrub
  useEffect(() => {
    const el = storyRef.current;
    if (!el || !isDesktop) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let lastProgress = 0;
    let driftRaf = 0;

    const paintDrift = (progress, t) => {
      const wrap = pinArtRef.current;
      if (!wrap || reduced) return;
      const driftY = Math.sin(t * 0.00055) * 8;
      const driftRot = Math.sin(t * 0.0004) * 1.6 + (progress - 0.5) * 2;
      const scale = 1.02 + Math.sin(t * 0.00065) * 0.015;
      wrap.style.transform = `translate3d(0, ${driftY.toFixed(2)}px, 0) rotate(${driftRot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    };

    const apply = (progress) => {
      if (trackFillRef.current) {
        trackFillRef.current.style.transform = `scaleX(${progress})`;
      }

      const exact = storyExact(progress, STORY.length);
      const stage = Math.floor(exact);
      const local = exact - stage;

      if (plateRef.current) {
        plateRef.current.dataset.stage = STORY[stage]?.key ?? "compose";
      }
      const active = STORY[stage];
      if (active) {
        if (captionKickerRef.current) {
          captionKickerRef.current.textContent = String(stage + 1).padStart(2, "0");
        }
        if (captionTitleRef.current) {
          captionTitleRef.current.textContent = active.title;
        }
      }

      STORY.forEach((item, i) => {
        const layer = artLayerRefs.current[i];
        if (layer) {
          let op = 0;
          if (reduced) {
            op = i === stage ? 1 : 0;
          } else if (i === stage) {
            op = 1 - local * 0.3;
          } else if (i === stage + 1 && stage < STORY.length - 1) {
            op = local * 0.95;
          }
          layer.style.opacity = String(op);
          layer.style.zIndex = String(i === stage || i === stage + 1 ? 2 : 1);
          const svg = layer.querySelector("svg");
          if (svg && op > 0.02) {
            const paintP = i === stage ? 0.55 + local * 0.45 : 0.4 + local * 0.4;
            paintGeometryArt(svg, reduced ? 1 : paintP, item.key);
          }
        }

        const slide = slideRefs.current[i];
        if (!slide) return;
        const op = reduced
          ? i === stage
            ? 1
            : 0
          : stageOpacity(i, progress, STORY.length);
        slide.style.opacity = String(op);
        slide.style.transform = `translateY(${((1 - op) * 16).toFixed(1)}px)`;
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
      lastProgress =
        total <= 0 ? (rect.top < 0 ? 1 : 0) : clamp01(-rect.top / total);
      apply(lastProgress);
      paintDrift(lastProgress, performance.now());
    };

    const driftLoop = (t) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (inView && !reduced) {
        paintDrift(lastProgress, t);
        driftRaf = requestAnimationFrame(driftLoop);
      } else {
        driftRaf = 0;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
      if (!reduced && !driftRaf) {
        driftRaf = requestAnimationFrame(driftLoop);
      }
    };

    // Initial paint — first plate fully visible
    STORY.forEach((item, i) => {
      const svg = artLayerRefs.current[i]?.querySelector("svg");
      if (svg) paintGeometryArt(svg, i === 0 ? 1 : 0.4, item.key);
    });
    apply(0);
    update();
    if (!reduced) driftRaf = requestAnimationFrame(driftLoop);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (driftRaf) cancelAnimationFrame(driftRaf);
    };
  }, [isDesktop]);

  useEffect(() => {
    if (isDesktop) return;
    document.querySelectorAll(".landing-story-slide-art .landing-story-art").forEach((svg) => {
      const variant = svg.getAttribute("data-variant") || "compose";
      paintGeometryArt(svg, 1, variant);
    });
  }, [isDesktop]);

  // Gallery posters — always fully painted
  useEffect(() => {
    document.querySelectorAll(".landing-gallery-card .landing-story-art").forEach((svg) => {
      const variant = svg.getAttribute("data-variant") || "compose";
      paintGeometryArt(svg, 1, variant);
    });
  }, []);

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
            <BrandLogo className="landing-logo-svg" size={44} />
            <div className="landing-brand-text">
              <p className="landing-brand">几何维度</p>
              <p className="landing-brand-en">MathViz</p>
            </div>
          </div>

          <h1 className="landing-headline">
            把抽象知识
            <br />
            <em>变得看得见</em>
          </h1>

          <p className="landing-support">
            教学模式按册学知识点；搜题模式粘贴即讲。数学与物理已开放。
          </p>

          <div className="landing-mode-cards">
            <button
              type="button"
              className="landing-mode-card"
              onClick={() => go("/teach")}
            >
              <span className="landing-mode-card-kicker">教学模式</span>
              <span className="landing-mode-card-title">按册学</span>
              <span className="landing-mode-card-body">
                左栏选数学 / 物理知识点，打开就能看模型。
              </span>
            </button>
            <button
              type="button"
              className="landing-mode-card landing-mode-card--ghost"
              onClick={() => go("/search")}
            >
              <span className="landing-mode-card-kicker">搜题模式</span>
              <span className="landing-mode-card-title">贴题即讲</span>
              <span className="landing-mode-card-body">
                只有搜索框。结果界面与教学完全相同。
              </span>
            </button>
          </div>
        </div>

        <aside className="landing-hero-visual" aria-hidden="true">
          <div className="landing-hero-glow" />
          <div className="landing-hero-grain" />
          <div className="landing-hero-poster">
            <div className="landing-hero-art-wrap">
              <div className="landing-hero-art-inner">
                <ArtCompose hero />
              </div>
            </div>
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
            数学、物理按册覆盖高中重要知识点。每个点先看见模型，再开讲或搜题。
          </p>
        </Reveal>
      </section>

      <section className="landing-coverage" aria-label="知识点覆盖">
        <Reveal className="landing-coverage-inner">
          <p className="landing-eyebrow">覆盖</p>
          <h2 className="landing-coverage-title">
            {stats.points} 个重要知识点 · {stats.models} 种模型
          </h2>
          <p className="landing-coverage-lead">
            数学必修与选择性必修，物理必修与选择性必修。其中 {stats.playable}{" "}
            个可直接开讲例题。
          </p>
          <div className="landing-coverage-grid">
            {CURRICULUM.map((subj) => (
              <div key={subj.id} className="landing-coverage-col">
                <h3>{subj.label}</h3>
                <ul>
                  {subj.books.map((book) => {
                    const n = (book.children || []).reduce(
                      (acc, ch) => acc + (ch.leaves?.length || 0),
                      0,
                    );
                    return (
                      <li key={book.id}>
                        <span>{book.label}</span>
                        <em>{n} 点</em>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="landing-cta-row">
            <button
              type="button"
              className="landing-submit"
              onClick={() => go("/teach")}
            >
              打开教学目录
            </button>
          </div>
        </Reveal>
      </section>

      <section
        id="story"
        className="landing-story"
        ref={storyRef}
        style={isDesktop ? { height: `${STORY.length * 80}vh` } : undefined}
        aria-label="学习路径"
      >
        <div className="landing-story-pin">
          <div className="landing-story-stage">
            <div
              className="landing-story-plate"
              ref={plateRef}
              data-stage="compose"
            >
              <div className="landing-story-art-live" ref={pinArtRef}>
                {STORY.map((item, i) => {
                  const Art = STORY_ART[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`landing-story-art-layer landing-story-art-layer--${item.key}`}
                      ref={(el) => {
                        artLayerRefs.current[i] = el;
                      }}
                      style={{ opacity: i === 0 ? 1 : 0 }}
                    >
                      <Art />
                    </div>
                  );
                })}
              </div>

              <div className="landing-story-caption" aria-live="polite">
                <span className="landing-story-caption-kicker" ref={captionKickerRef}>
                  01
                </span>
                <h3 className="landing-story-caption-title" ref={captionTitleRef}>
                  {STORY[0].title}
                </h3>
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
          </div>

          {/* 移动端竖滑卡片；桌面由上方全幅海报承担 */}
          <div className="landing-story-copy">
            {STORY.map((item, i) => {
              const Art = STORY_ART[item.key];
              return (
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
                    <Art />
                  </div>
                  <p className="landing-eyebrow">{item.kicker}</p>
                  <h3 className="landing-story-slide-title">{item.title}</h3>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-gallery" aria-label="几何形态">
        <Reveal className="landing-gallery-inner">
          <p className="landing-eyebrow">形态</p>
          <h2 className="landing-gallery-title">每一种结构，都值得被看见</h2>
          <div className="landing-gallery-grid">
            <figure className="landing-gallery-card landing-gallery-card--cube">
              <ArtCompose />
            </figure>
            <figure className="landing-gallery-card landing-gallery-card--prism">
              <ArtReason />
            </figure>
            <figure className="landing-gallery-card landing-gallery-card--pyramid">
              <ArtMoment />
            </figure>
            <figure className="landing-gallery-card landing-gallery-card--cylinder">
              <ArtCylinder />
            </figure>
          </div>
        </Reveal>
      </section>

      <section className="landing-moment" aria-labelledby="moment-title">
        <Reveal className="landing-moment-inner">
          <p className="landing-eyebrow">工作台</p>
          <h2 id="moment-title" className="landing-moment-title">
            步骤与三维
            <br />
            同屏对应
          </h2>
          <p className="landing-moment-lead">
            左边推一步，右边高亮一条线。旋转、测量、回放。
          </p>

          <div className="landing-moment-frame" aria-hidden="true">
            <div className="landing-moment-pane landing-moment-pane--steps">
              <ol>
                <li className="is-done">
                  <i>✓</i>
                  画出底面与侧棱
                </li>
                <li className="is-current">
                  <i>2</i>
                  求体对角线
                </li>
                <li>
                  <i>3</i>
                  写出结论
                </li>
              </ol>
            </div>
            <div className="landing-moment-pane landing-moment-pane--viz">
              <MomentArt />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="landing-end">
        <Reveal className="landing-end-inner">
          <h2 className="landing-end-title">从一道题开始</h2>
          <p className="landing-end-lead">
            按册学知识点，或粘贴一道题。讲解界面相同。
          </p>
          <div className="landing-cta-row landing-cta-row--center">
            <button
              type="button"
              className="landing-submit landing-submit--lg"
              onClick={() => go("/teach")}
            >
              进入教学
            </button>
            <button
              type="button"
              className="landing-ghost"
              onClick={() => go("/search")}
            >
              去搜题
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <span>几何维度</span>
        <span className="landing-footer-dot" aria-hidden="true">
          ·
        </span>
        <span>MathViz</span>
      </footer>
    </div>
  );
}

function MomentArt() {
  const ref = useRef(null);
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    paintGeometryArt(svg, 1, "moment");
  }, []);
  return (
    <div ref={ref} className="landing-moment-art">
      <ArtMoment />
    </div>
  );
}

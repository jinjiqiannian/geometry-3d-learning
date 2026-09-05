/** 知识点专属模型图：一种 model 一种构图，每个图都带必要的信息标注 */

import { useEffect, useRef } from "react";

function Frame({ children, className = "" }) {
  const ref = useRef(null);
  // 给描边元素注入 pathLength=1，让任意长度的线都能用同一套 dasharray 生长动画
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll("line, path, ellipse, circle").forEach((el) => {
      const cls = el.classList;
      if (cls.contains("km-hidden") || cls.contains("km-flow") || cls.contains("km-diag")) return;
      el.setAttribute("pathLength", "1");
    });
  }, []);
  return (
    <svg
      ref={ref}
      className={`km-svg ${className}`.trim()}
      viewBox="0 0 480 360"
      aria-hidden="true"
    >
      <rect className="km-bg" x="0" y="0" width="480" height="360" />
      {children}
    </svg>
  );
}

/** 带箭头的线段（向量 / 力 / 场方向） */
function Arrow({ a, b, className = "km-accent-line", fill = "km-arrow-fill" }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const s = 10;
  const p1 = `${b[0] - ux * s - uy * s * 0.42},${b[1] - uy * s + ux * s * 0.42}`;
  const p2 = `${b[0] - ux * s + uy * s * 0.42},${b[1] - uy * s - ux * s * 0.42}`;
  return (
    <g>
      <line
        className={`${className} km-flow`}
        x1={a[0]}
        y1={a[1]}
        x2={b[0] - ux * s * 0.6}
        y2={b[1] - uy * s * 0.6}
      />
      <polygon className={fill} points={`${b[0]},${b[1]} ${p1} ${p2}`} />
    </g>
  );
}

export default function KnowledgeModel({ type = "venn", accent = "", animate = false }) {
  switch (type) {
    case "venn":
      return (
        <Frame>
          <circle cx="200" cy="180" r="88" className="km-fill-a" />
          <circle cx="280" cy="180" r="88" className="km-fill-b" />
          <circle cx="200" cy="180" r="88" className="km-stroke" />
          <circle cx="280" cy="180" r="88" className="km-stroke" />
          <text className="km-vtx" x="160" y="184" textAnchor="middle">A</text>
          <text className="km-vtx" x="320" y="184" textAnchor="middle">B</text>
          <text className="km-vtx" x="240" y="184" textAnchor="middle">A∩B</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">交集：同属 A 与 B 的元素</text>
        </Frame>
      );
    case "implies":
      return (
        <Frame>
          <rect className="km-fill-a" x="56" y="130" width="110" height="92" rx="12" />
          <rect className="km-fill-b" x="314" y="130" width="110" height="92" rx="12" />
          <text className="km-vtx" x="111" y="184" textAnchor="middle">p</text>
          <text className="km-vtx" x="369" y="184" textAnchor="middle">q</text>
          <Arrow a={[176, 148]} b={[304, 148]} />
          <Arrow a={[304, 204]} b={[176, 204]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="240" y="136" textAnchor="middle">p⇒q（充分）</text>
          <text className="km-formula" x="240" y="256" textAnchor="middle">q⇒p（必要）</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">双向互推：p⇔q 充要</text>
        </Frame>
      );
    case "quadratic":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="240" y1="36" x2="240" y2="320" />
          <path className="km-curve" d="M80 80 Q240 420 400 80" />
          <circle className="km-dot" cx="240" cy="250" r="5" />
          <line className="km-soft-stroke" x1="240" y1="250" x2="240" y2="300" />
          <text className="km-vtx" x="252" y="246">顶点</text>
          <text className="km-formula" x="60" y="72">y = ax²+bx+c</text>
          <text className="km-formula" x="252" y="296">x = −b/(2a)</text>
        </Frame>
      );
    case "quad-ineq":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <path className="km-curve" d="M120 110 Q240 530 360 110" />
          <line className="km-accent-line" x1="52" y1="316" x2="203" y2="316" />
          <line className="km-accent-line" x1="277" y1="316" x2="428" y2="316" />
          <circle className="km-dot" cx="203" cy="300" r="5" />
          <circle className="km-dot" cx="277" cy="300" r="5" />
          <text className="km-vtx" x="196" y="338" textAnchor="middle">x₁</text>
          <text className="km-vtx" x="286" y="338" textAnchor="middle">x₂</text>
          <text className="km-formula" x="342" y="106">ax²+bx+c&gt;0</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">y&gt;0：x&lt;x₁ 或 x&gt;x₂</text>
        </Frame>
      );
    case "mapping":
      return (
        <Frame>
          <ellipse className="km-stroke" cx="140" cy="185" rx="72" ry="98" />
          <ellipse className="km-stroke" cx="340" cy="185" rx="72" ry="98" />
          {[130, 185, 240].map((y) => (
            <circle key={y} className="km-dot" cx="140" cy={y} r="5" />
          ))}
          {[130, 185, 240].map((y) => (
            <circle key={y} className="km-dot km-dot-teal" cx="340" cy={y} r="5" />
          ))}
          {[130, 185, 240].map((y) => (
            <Arrow key={y} a={[154, y]} b={[324, y]} />
          ))}
          <text className="km-vtx" x="140" y="66" textAnchor="middle">A（定义域）</text>
          <text className="km-vtx" x="340" y="66" textAnchor="middle">B（值域）</text>
          <text className="km-formula" x="240" y="102" textAnchor="middle">对应法则 f</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">每个 x 只对应唯一的 y</text>
        </Frame>
      );
    case "monotonic":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="70" y1="36" x2="70" y2="320" />
          <path className="km-curve" d="M70 280 C140 280 180 160 240 140 S340 220 420 240" />
          <Arrow a={[140, 230]} b={[210, 172]} />
          <Arrow a={[300, 178]} b={[372, 214]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="118" y="140">增区间</text>
          <text className="km-formula" x="330" y="140">减区间</text>
          <text className="km-vtx" x="240" y="126" textAnchor="middle">最大值</text>
        </Frame>
      );
    case "parity":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="240" y1="36" x2="240" y2="320" />
          <path className="km-curve km-accent" d="M238 262 C190 242 150 180 150 92" />
          <path className="km-curve km-accent" d="M242 262 C290 242 330 180 330 92" />
          <circle className="km-dot" cx="176" cy="196" r="5" />
          <circle className="km-dot" cx="304" cy="196" r="5" />
          <line className="km-soft-stroke" x1="176" y1="196" x2="304" y2="196" />
          <text className="km-formula" x="336" y="84">f(−x)=f(x)</text>
          <text className="km-formula" x="240" y="64" textAnchor="middle">关于 y 轴对称</text>
          <text className="km-vtx" x="176" y="222" textAnchor="middle">f(−x)</text>
          <text className="km-vtx" x="304" y="222" textAnchor="middle">f(x)</text>
        </Frame>
      );
    case "exp-fn":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="90" y1="36" x2="90" y2="320" />
          <path className="km-curve km-accent" d="M90 296 C170 288 250 220 320 120 S390 50 415 44" />
          <line className="km-soft-stroke" x1="90" y1="270" x2="432" y2="270" />
          <circle className="km-dot" cx="90" cy="270" r="5" />
          <text className="km-vtx" x="76" y="276" textAnchor="end">1</text>
          <text className="km-formula" x="316" y="130">y = aˣ (a&gt;1)</text>
          <text className="km-formula" x="180" y="258">恒过 (0,1)</text>
        </Frame>
      );
    case "log-fn":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="90" y1="36" x2="90" y2="320" />
          <path className="km-curve km-accent" d="M94 40 C112 170 134 280 168 296 S320 300 424 300" />
          <line className="km-soft-stroke" x1="150" y1="40" x2="150" y2="300" />
          <circle className="km-dot" cx="150" cy="294" r="5" />
          <text className="km-vtx" x="150" y="338" textAnchor="middle">1</text>
          <text className="km-formula" x="230" y="220">y = logₐx</text>
          <text className="km-formula" x="150" y="66" textAnchor="middle">恒过 (1,0)</text>
        </Frame>
      );
    case "radian":
      return (
        <Frame>
          <circle className="km-stroke" cx="240" cy="180" r="110" />
          <line className="km-stroke-thick" x1="240" y1="180" x2="350" y2="180" />
          <line className="km-stroke-thick" x1="240" y1="180" x2="308" y2="92" />
          <path className="km-accent-line" d="M280 180 A40 40 0 0 0 265 148" />
          <text className="km-vtx" x="232" y="198">O</text>
          <text className="km-vtx" x="358" y="196">A</text>
          <text className="km-vtx" x="302" y="82">B</text>
          <text className="km-formula" x="292" y="172">r</text>
          <text className="km-formula" x="286" y="152">α</text>
          <text className="km-formula" x="150" y="330">弧长 l = |α|·r</text>
        </Frame>
      );
    case "unit-circle":
      return (
        <Frame>
          <circle className="km-stroke" cx="240" cy="180" r="110" />
          <line className="km-axis" x1="110" y1="180" x2="370" y2="180" />
          <line className="km-axis" x1="240" y1="50" x2="240" y2="310" />
          <line className="km-accent-line" x1="240" y1="180" x2="318" y2="102" />
          <circle className="km-dot" cx="318" cy="102" r="5" />
          <path className="km-arc" d="M290 180 A50 50 0 0 0 275 138" />
          <line className="km-soft-stroke" x1="318" y1="102" x2="318" y2="180" />
          <line className="km-soft-stroke" x1="318" y1="102" x2="240" y2="102" />
          <text className="km-vtx" x="286" y="202">α</text>
          <text className="km-vtx" x="326" y="92">P</text>
          <text className="km-formula" x="318" y="200" textAnchor="middle">cosα</text>
          <text className="km-formula" x="230" y="96" textAnchor="end">sinα</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">P(cosα, sinα)</text>
        </Frame>
      );
    case "unit-sym":
      return (
        <Frame>
          <circle className="km-stroke" cx="240" cy="180" r="110" />
          <line className="km-axis" x1="110" y1="180" x2="370" y2="180" />
          <line className="km-axis" x1="240" y1="50" x2="240" y2="310" />
          <line className="km-accent-line" x1="240" y1="180" x2="318" y2="102" />
          <line className="km-teal-line" x1="240" y1="180" x2="162" y2="102" />
          <circle className="km-dot" cx="318" cy="102" r="5" />
          <circle className="km-dot km-dot-teal" cx="162" cy="102" r="5" />
          <line className="km-soft-stroke" x1="162" y1="102" x2="318" y2="102" />
          <text className="km-vtx" x="326" y="92">P</text>
          <text className="km-vtx" x="128" y="92">P′</text>
          <text className="km-vtx" x="288" y="200">α</text>
          <text className="km-vtx" x="152" y="200">π−α</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">sin(π−α) = sinα（等高）</text>
        </Frame>
      );
    case "vector":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="420" y2="300" />
          <line className="km-axis" x1="80" y1="40" x2="80" y2="320" />
          <Arrow a={[80, 300]} b={[300, 110]} />
          <Arrow a={[80, 300]} b={[250, 300]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <Arrow a={[250, 300]} b={[300, 110]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="196" y="186">a+b</text>
          <text className="km-formula" x="156" y="330">a</text>
          <text className="km-formula" x="290" y="220">b</text>
          <text className="km-vtx" x="72" y="316" textAnchor="end">O</text>
          <text className="km-formula" x="240" y="70" textAnchor="middle">平行四边形法则</text>
        </Frame>
      );
    case "vec-dot":
      return (
        <Frame>
          <Arrow a={[80, 300]} b={[330, 130]} />
          <Arrow a={[80, 300]} b={[350, 280]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <path className="km-arc" d="M150 297 A70 70 0 0 0 138 268" />
          <line className="km-soft-stroke" x1="330" y1="130" x2="330" y2="291" />
          <text className="km-formula" x="170" y="196">a</text>
          <text className="km-formula" x="330" y="262">b</text>
          <text className="km-vtx" x="160" y="292">θ</text>
          <text className="km-formula" x="240" y="72" textAnchor="middle">a·b = |a||b|·cosθ</text>
          <text className="km-formula" x="240" y="102" textAnchor="middle">θ = 90° ⇒ a·b = 0（垂直）</text>
        </Frame>
      );
    case "complex":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="180" x2="440" y2="180" />
          <line className="km-axis" x1="240" y1="40" x2="240" y2="320" />
          <line className="km-accent-line" x1="240" y1="180" x2="340" y2="100" />
          <circle className="km-dot" cx="340" cy="100" r="5" />
          <circle cx="240" cy="180" r="128" className="km-soft-stroke" />
          <line className="km-soft-stroke" x1="340" y1="100" x2="340" y2="180" />
          <line className="km-soft-stroke" x1="340" y1="100" x2="240" y2="100" />
          <text className="km-vtx" x="348" y="92">Z</text>
          <text className="km-formula" x="348" y="176">a</text>
          <text className="km-formula" x="228" y="94" textAnchor="end">b</text>
          <text className="km-formula" x="278" y="132">|z|</text>
          <text className="km-formula" x="56" y="70">z = a + bi</text>
          <text className="km-formula" x="240" y="336" textAnchor="middle">|z| = √(a²+b²)</text>
        </Frame>
      );
    case "cube":
      return accent === "perp" ? perpDemo() : isoBox(1, 1, 1, accent, animate);
    case "cuboid":
      return isoBox(1.38, 0.88, 1, accent, animate);
    case "pyramid":
      return isoPyramid(accent, animate);
    case "prism":
      return isoBox(1.12, 1.18, 0.78, accent, animate);
    case "cylinder":
      return isoCylinder(accent, animate);
    case "cone":
      return isoCone(accent, animate);
    case "sphere":
      return isoSphere(accent, animate);
    case "frustum":
      return isoFrustum(accent, animate);
    case "hist":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="430" y2="300" />
          <rect className="km-fill-a" x="90" y="190" width="48" height="110" />
          <rect className="km-fill-b" x="160" y="140" width="48" height="160" />
          <rect className="km-fill-a" x="230" y="90" width="48" height="210" />
          <rect className="km-fill-b" x="300" y="160" width="48" height="140" />
          <rect className="km-fill-a" x="370" y="220" width="48" height="80" />
          <text className="km-formula" x="240" y="60" textAnchor="middle">矩形高 = 频率 / 组距</text>
          <text className="km-formula" x="114" y="176" textAnchor="middle">高</text>
          <text className="km-vtx" x="114" y="322" textAnchor="middle">组距</text>
          <text className="km-formula" x="240" y="336" textAnchor="middle">各矩形面积之和 = 1</text>
        </Frame>
      );
    case "prob":
      return (
        <Frame>
          <circle className="km-dot" cx="240" cy="70" r="8" />
          <line className="km-stroke-thick" x1="240" y1="78" x2="150" y2="170" />
          <line className="km-stroke-thick" x1="240" y1="78" x2="330" y2="170" />
          <circle className="km-dot" cx="150" cy="178" r="7" />
          <circle className="km-dot km-dot-teal" cx="330" cy="178" r="7" />
          <line className="km-soft-stroke" x1="150" y1="186" x2="100" y2="280" />
          <line className="km-soft-stroke" x1="150" y1="186" x2="200" y2="280" />
          <line className="km-soft-stroke" x1="330" y1="186" x2="280" y2="280" />
          <line className="km-soft-stroke" x1="330" y1="186" x2="380" y2="280" />
          <circle className="km-dot" cx="100" cy="286" r="5" />
          <circle className="km-dot" cx="200" cy="286" r="5" />
          <circle className="km-dot km-dot-teal" cx="280" cy="286" r="5" />
          <circle className="km-dot km-dot-teal" cx="380" cy="286" r="5" />
          <text className="km-vtx" x="150" y="162" textAnchor="middle">红</text>
          <text className="km-vtx" x="330" y="162" textAnchor="middle">白</text>
          <text className="km-vtx" x="100" y="278" textAnchor="middle">红</text>
          <text className="km-vtx" x="200" y="278" textAnchor="middle">白</text>
          <text className="km-vtx" x="280" y="278" textAnchor="middle">红</text>
          <text className="km-vtx" x="380" y="278" textAnchor="middle">白</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">两球都红：P = 3/5 × 2/4</text>
        </Frame>
      );
    case "line-circle":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="300" x2="440" y2="80" />
          <circle cx="260" cy="180" r="88" className="km-stroke" />
          <circle className="km-dot" cx="196" cy="232" r="5" />
          <circle className="km-dot" cx="318" cy="136" r="5" />
          <text className="km-vtx" x="178" y="252">P₁</text>
          <text className="km-vtx" x="326" y="126">P₂</text>
          <text className="km-formula" x="330" y="60">y = kx + b</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">两点求斜率 k = (y₂−y₁)/(x₂−x₁)</text>
        </Frame>
      );
    case "circle-eq":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="240" x2="440" y2="240" />
          <line className="km-axis" x1="200" y1="40" x2="200" y2="330" />
          <circle className="km-stroke" cx="280" cy="150" r="80" />
          <circle className="km-dot" cx="280" cy="150" r="5" />
          <line className="km-accent-line" x1="280" y1="150" x2="360" y2="150" />
          <line className="km-soft-stroke" x1="280" y1="150" x2="280" y2="240" />
          <line className="km-soft-stroke" x1="280" y1="150" x2="200" y2="150" />
          <text className="km-vtx" x="288" y="142">C</text>
          <text className="km-formula" x="322" y="140">r</text>
          <text className="km-formula" x="302" y="234">a</text>
          <text className="km-formula" x="188" y="200" textAnchor="end">b</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">(x−a)² + (y−b)² = r²</text>
        </Frame>
      );
    case "ellipse":
      return (
        <Frame>
          <ellipse cx="240" cy="180" rx="150" ry="88" className="km-stroke" />
          <line className="km-axis" x1="70" y1="180" x2="410" y2="180" />
          <circle className="km-dot" cx="175" cy="180" r="5" />
          <circle className="km-dot" cx="305" cy="180" r="5" />
          <text className="km-vtx" x="240" y="100" textAnchor="middle">a</text>
          <text className="km-vtx" x="252" y="184">b</text>
          <text className="km-vtx" x="168" y="170">F₁</text>
          <text className="km-vtx" x="310" y="170">F₂</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">e = c/a，c² = a²−b²</text>
        </Frame>
      );
    case "hyperbola":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="180" x2="440" y2="180" />
          <line className="km-axis" x1="240" y1="40" x2="240" y2="320" />
          <path className="km-curve km-accent" d="M92 48 C148 88 168 132 168 180 S148 272 92 312" />
          <path className="km-curve km-teal" d="M388 48 C332 88 312 132 312 180 S332 272 388 312" />
          <line className="km-soft-stroke" x1="70" y1="70" x2="410" y2="290" />
          <line className="km-soft-stroke" x1="70" y1="290" x2="410" y2="70" />
          <text className="km-vtx" x="200" y="174" textAnchor="end">a</text>
          <text className="km-vtx" x="252" y="140">b</text>
          <text className="km-vtx" x="120" y="176">F₁</text>
          <text className="km-vtx" x="348" y="176">F₂</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">渐近线 y = ±(b/a)x，c² = a²+b²</text>
        </Frame>
      );
    case "parabola":
      return (
        <Frame>
          <line className="km-axis" x1="240" y1="40" x2="240" y2="320" />
          <path className="km-curve km-accent" d="M90 280 Q240 80 390 280" />
          <line className="km-soft-stroke" x1="80" y1="280" x2="400" y2="280" />
          <circle className="km-dot" cx="240" cy="80" r="5" />
          <line className="km-soft-stroke" x1="240" y1="180" x2="240" y2="80" />
          <line className="km-soft-stroke" x1="240" y1="180" x2="240" y2="280" />
          <text className="km-vtx" x="252" y="86">F（焦点）</text>
          <text className="km-vtx" x="404" y="286">准线 l</text>
          <text className="km-formula" x="252" y="140">等距</text>
          <text className="km-formula" x="56" y="80">y² = 2px</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">顶点到焦点 = 到准线的距离</text>
        </Frame>
      );
    case "ari-seq":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          <line className="km-axis" x1="70" y1="40" x2="70" y2="320" />
          {[80, 150, 220, 290, 360, 430].map((x, i) => (
            <circle key={x} className="km-dot" cx={x} cy={280 - i * 30} r="6" />
          ))}
          <line className="km-soft-stroke" x1="80" y1="280" x2="430" y2="130" />
          <line className="km-accent-line" x1="150" y1="250" x2="150" y2="280" />
          <text className="km-formula" x="162" y="272">d</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">aₙ = a₁+(n−1)d（直线增长）</text>
          <text className="km-vtx" x="80" y="336" textAnchor="middle">1</text>
          <text className="km-vtx" x="430" y="336" textAnchor="middle">n</text>
        </Frame>
      );
    case "geo-seq":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          <line className="km-axis" x1="70" y1="40" x2="70" y2="320" />
          {[[80, 276], [150, 264], [220, 246], [290, 219], [360, 179], [430, 118]].map(([x, y]) => (
            <circle key={x} className="km-dot" cx={x} cy={y} r="6" />
          ))}
          <path className="km-soft-stroke" d="M80 276 C160 266 240 240 300 205 S400 130 430 118" />
          <Arrow a={[150, 268]} b={[150, 248]} />
          <text className="km-formula" x="160" y="262">×q</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">aₙ = a₁·qⁿ⁻¹（指数增长）</text>
          <text className="km-vtx" x="80" y="336" textAnchor="middle">1</text>
          <text className="km-vtx" x="430" y="336" textAnchor="middle">n</text>
        </Frame>
      );
    case "derivative":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <path className="km-curve" d="M60 260 C140 260 180 80 260 140 S380 80 430 70" />
          <line className="km-accent-line" x1="140" y1="230" x2="360" y2="70" />
          <circle className="km-dot" cx="250" cy="148" r="5" />
          <text className="km-vtx" x="258" y="166">P(x₀, f(x₀))</text>
          <text className="km-formula" x="150" y="106">切线斜率 k = f′(x₀)</text>
          <text className="km-formula" x="60" y="72">y = f(x)</text>
        </Frame>
      );
    case "tangent":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <path className="km-curve" d="M80 60 C140 130 180 220 240 220 S340 130 400 60" />
          <line className="km-accent-line" x1="150" y1="143" x2="370" y2="297" />
          <circle className="km-dot" cx="260" cy="220" r="5" />
          <text className="km-vtx" x="262" y="244">P(x₀, f(x₀))</text>
          <text className="km-formula" x="120" y="110">斜率 k = f′(x₀)</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">y − y₀ = f′(x₀)(x − x₀)</text>
        </Frame>
      );
    case "deriv-sign":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <path
            className="km-curve"
            d="M70 250 C110 140 150 80 190 100 S250 240 290 250 S370 140 410 110"
          />
          <circle className="km-dot" cx="190" cy="100" r="5" />
          <circle className="km-dot" cx="290" cy="250" r="5" />
          <text className="km-vtx" x="190" y="86" textAnchor="middle">f′=0（极大）</text>
          <text className="km-vtx" x="290" y="278" textAnchor="middle">f′=0（极小）</text>
          <text className="km-formula" x="106" y="66">f′&gt;0 ↑增</text>
          <text className="km-formula" x="222" y="130">f′&lt;0 ↓减</text>
          <text className="km-formula" x="348" y="96">f′&gt;0 ↑增</text>
        </Frame>
      );
    case "count":
      return (
        <Frame>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              className={i % 2 ? "km-fill-b" : "km-fill-a"}
              x={80 + i * 80}
              y={110}
              width="56"
              height="140"
              rx="8"
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <text key={i} className="km-vtx" x={108 + i * 80} y="186" textAnchor="middle">
              步骤{i + 1}
            </text>
          ))}
          {[140, 220, 300].map((x) => (
            <Arrow key={x} a={[x, 180]} b={[x + 36, 180]} />
          ))}
          <text className="km-formula" x="240" y="70" textAnchor="middle">分步相乘：N = n₁ × n₂ × …</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">分类相加：N = n₁ + n₂ + …</text>
        </Frame>
      );
    case "comb":
      return (
        <Frame>
          {[80, 160, 240, 320, 400].map((x, i) => (
            <circle
              key={x}
              className={i < 3 ? "km-fill-a km-stroke" : "km-fill-b km-stroke"}
              cx={x}
              cy="170"
              r="34"
            />
          ))}
          {[80, 160, 240].map((x) => (
            <text key={x} className="km-vtx" x={x} y="176" textAnchor="middle">✓</text>
          ))}
          <text className="km-formula" x="240" y="70" textAnchor="middle">从 5 人中选 3 人（不管顺序）</text>
          <text className="km-formula" x="240" y="290" textAnchor="middle">C₅³ = 5!/(3!·2!) = 10</text>
        </Frame>
      );
    case "dist":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          <path className="km-curve km-accent" d="M70 300 C140 300 160 60 240 60 S340 300 420 300" />
          <rect className="km-fill-a" x="200" y="160" width="80" height="140" />
          <text className="km-vtx" x="240" y="322" textAnchor="middle">xᵢ</text>
          <text className="km-formula" x="290" y="170">P(X=xᵢ)</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">E(X) = Σxᵢpᵢ，Σpᵢ = 1</text>
        </Frame>
      );
    case "vt":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="430" y2="300" />
          <line className="km-axis" x1="80" y1="40" x2="80" y2="320" />
          <path className="km-accent-line" d="M80 260 L200 120 L380 120" />
          <circle className="km-dot" cx="200" cy="120" r="5" />
          <text className="km-vtx" x="66" y="276" textAnchor="end">v₀</text>
          <text className="km-formula" x="116" y="188">斜率 = a</text>
          <text className="km-formula" x="286" y="102">匀速段</text>
          <text className="km-vtx" x="212" y="320">t₁</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">v = v₀ + at</text>
        </Frame>
      );
    case "st-graph":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="430" y2="300" />
          <line className="km-axis" x1="80" y1="40" x2="80" y2="320" />
          <path className="km-curve km-accent" d="M80 280 Q220 270 360 100" />
          <line className="km-teal-line" x1="170" y1="256" x2="340" y2="152" />
          <circle className="km-dot" cx="248" cy="210" r="5" />
          <text className="km-formula" x="110" y="120">s = v₀t + ½at²</text>
          <text className="km-formula" x="346" y="140">切线斜率 = v</text>
          <text className="km-vtx" x="256" y="230">P</text>
        </Frame>
      );
    case "vt-area":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="430" y2="300" />
          <line className="km-axis" x1="80" y1="40" x2="80" y2="320" />
          <polygon className="km-fill-a" points="80,300 80,260 340,100 340,300" />
          <path className="km-accent-line" d="M80 260 L340 100" />
          <text className="km-formula" x="196" y="236">面积 = 位移 s</text>
          <text className="km-vtx" x="64" y="276" textAnchor="end">v₀</text>
          <text className="km-vtx" x="350" y="102">v</text>
          <text className="km-vtx" x="340" y="322" textAnchor="middle">t</text>
          <text className="km-formula" x="130" y="110">v² = v₀² + 2as</text>
        </Frame>
      );
    case "force":
      return (
        <Frame>
          <rect className="km-fill-a" x="190" y="140" width="100" height="70" rx="6" />
          <Arrow a={[240, 210]} b={[240, 300]} />
          <text className="km-vtx" x="252" y="156">m</text>
          <text className="km-formula" x="252" y="290">G = mg</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">方向竖直向下，g ≈ 9.8 N/kg</text>
        </Frame>
      );
    case "newton2":
      return (
        <Frame>
          <rect className="km-fill-a" x="180" y="150" width="110" height="80" rx="8" />
          <text className="km-vtx" x="235" y="196" textAnchor="middle">m</text>
          <Arrow a={[300, 190]} b={[400, 190]} />
          <text className="km-formula" x="322" y="172">F（合力）</text>
          <Arrow a={[235, 254]} b={[330, 254]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="252" y="282">加速度 a</text>
          <text className="km-formula" x="240" y="80" textAnchor="middle">F = ma</text>
          <text className="km-formula" x="240" y="110" textAnchor="middle">a 与 F 方向相同</text>
        </Frame>
      );
    case "freebody":
      return (
        <Frame>
          <path className="km-fill-b" d="M80 290 L400 290 L400 130 Z" />
          <rect
            className="km-fill-a"
            x="230"
            y="185"
            width="52"
            height="44"
            rx="4"
            transform="rotate(-27 256 207)"
          />
          <Arrow a={[256, 210]} b={[256, 306]} />
          <text className="km-formula" x="264" y="298">G</text>
          <Arrow a={[252, 200]} b={[194, 130]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="176" y="122">N</text>
          <Arrow a={[238, 226]} b={[164, 256]} className="km-stroke-thick" fill="km-arrow-fill-ink" />
          <text className="km-formula" x="138" y="272">f</text>
          <text className="km-formula" x="104" y="312">θ</text>
          <text className="km-formula" x="240" y="70" textAnchor="middle">先重力 → 再弹力 → 最后摩擦力</text>
        </Frame>
      );
    case "energy":
      return (
        <Frame>
          <rect className="km-fill-a" x="170" y="150" width="90" height="80" rx="8" />
          <Arrow a={[110, 190]} b={[170, 190]} />
          <text className="km-formula" x="92" y="174">F</text>
          <line className="km-soft-stroke" x1="215" y1="250" x2="400" y2="250" />
          <Arrow a={[386, 250]} b={[412, 250]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="296" y="274">位移 s</text>
          <text className="km-formula" x="240" y="90" textAnchor="middle">W = F·s·cosθ</text>
          <text className="km-formula" x="240" y="120" textAnchor="middle">θ 是 F 与 s 的夹角</text>
        </Frame>
      );
    case "kinetic":
      return (
        <Frame>
          <line className="km-axis" x1="80" y1="252" x2="420" y2="252" />
          <circle className="km-fill-a" cx="180" cy="206" r="42" />
          <text className="km-vtx" x="180" y="212" textAnchor="middle">m</text>
          <Arrow a={[232, 206]} b={[360, 206]} />
          <text className="km-formula" x="268" y="188">v</text>
          <text className="km-formula" x="240" y="96" textAnchor="middle">Eₖ = ½mv²</text>
          <text className="km-formula" x="240" y="126" textAnchor="middle">速度越大，动能越大</text>
        </Frame>
      );
    case "potential":
      return (
        <Frame>
          <line className="km-axis" x1="80" y1="290" x2="420" y2="290" />
          <rect className="km-fill-a" x="200" y="90" width="80" height="60" rx="6" />
          <text className="km-vtx" x="240" y="126" textAnchor="middle">m</text>
          <Arrow a={[330, 280]} b={[330, 100]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="342" y="192">h</text>
          <text className="km-formula" x="240" y="60" textAnchor="middle">Eₚ = mgh（相对参考面）</text>
          <text className="km-vtx" x="74" y="296" textAnchor="end">参考面</text>
        </Frame>
      );
    case "projectile":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          <path className="km-curve km-accent" d="M70 280 Q240 40 420 280" />
          <Arrow a={[70, 280]} b={[164, 252]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <circle className="km-dot" cx="240" cy="160" r="5" />
          <text className="km-formula" x="96" y="244">v₀ 水平</text>
          <text className="km-formula" x="252" y="148">任意时刻位置</text>
          <text className="km-formula" x="76" y="336">x = v₀t</text>
          <text className="km-formula" x="330" y="336">y = ½gt²</text>
        </Frame>
      );
    case "orbit":
      return (
        <Frame>
          <circle className="km-stroke" cx="240" cy="180" r="130" />
          <circle className="km-dot" cx="240" cy="180" r="14" />
          <circle className="km-dot km-dot-teal" cx="370" cy="180" r="7" />
          <line className="km-soft-stroke" x1="240" y1="180" x2="370" y2="180" />
          <text className="km-formula" x="292" y="168">r</text>
          <Arrow a={[360, 180]} b={[296, 180]} />
          <text className="km-formula" x="296" y="164">F向</text>
          <Arrow a={[370, 170]} b={[370, 96]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="380" y="106">v</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">F = mv²/r（合力指向圆心）</text>
        </Frame>
      );
    case "gravity":
      return (
        <Frame>
          <ellipse className="km-soft-stroke" cx="240" cy="180" rx="160" ry="110" />
          <circle className="km-fill-a" cx="240" cy="180" r="30" />
          <text className="km-vtx" x="240" y="186" textAnchor="middle">M</text>
          <circle className="km-fill-b km-stroke" cx="400" cy="180" r="14" />
          <text className="km-vtx" x="394" y="222">m</text>
          <Arrow a={[382, 180]} b={[292, 180]} />
          <text className="km-formula" x="306" y="164">F</text>
          <line className="km-soft-stroke" x1="240" y1="126" x2="400" y2="126" />
          <text className="km-formula" x="304" y="118">r</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">F = GMm/r²（引力提供向心力）</text>
        </Frame>
      );
    case "charge":
      return (
        <Frame>
          <circle className="km-dot" cx="240" cy="180" r="12" />
          <text className="km-vtx" x="234" y="186">+</text>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                className="km-soft-stroke"
                x1={240 + Math.cos(a) * 28}
                y1={180 + Math.sin(a) * 28}
                x2={240 + Math.cos(a) * 120}
                y2={180 + Math.sin(a) * 120}
              />
            );
          })}
          <circle className="km-dot km-dot-teal" cx="366" cy="180" r="7" />
          <text className="km-formula" x="352" y="152">+q</text>
          <Arrow a={[376, 180]} b={[430, 180]} />
          <text className="km-formula" x="410" y="164">F</text>
          <text className="km-formula" x="286" y="146">E</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">E = F/q（场强定义）</text>
        </Frame>
      );
    case "circuit":
      return (
        <Frame>
          <rect className="km-stroke" x="90" y="90" width="300" height="180" fill="none" />
          <rect className="km-fill-a" x="70" y="160" width="28" height="40" />
          <path className="km-accent-line" d="M220 90 l16 28 -16 28 16 28 -16 28 16 28" />
          <text className="km-vtx" x="84" y="146" textAnchor="end">电源</text>
          <text className="km-formula" x="258" y="152">R</text>
          <Arrow a={[140, 76]} b={[206, 76]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="164" y="64">I</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">U = IR（欧姆定律）</text>
        </Frame>
      );
    case "emw":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="180" x2="440" y2="180" />
          <path
            className="km-curve km-accent"
            d="M40 180 C80 60 120 60 160 180 S240 300 280 180 S360 60 400 180"
          />
          <ellipse className="km-teal-line" cx="100" cy="180" rx="14" ry="44" fill="none" />
          <ellipse className="km-teal-line" cx="200" cy="180" rx="14" ry="44" fill="none" />
          <ellipse className="km-teal-line" cx="300" cy="180" rx="14" ry="44" fill="none" />
          <text className="km-formula" x="150" y="66">E（电场）</text>
          <text className="km-formula" x="46" y="262">B（磁场）</text>
          <Arrow a={[398, 100]} b={[446, 100]} />
          <text className="km-formula" x="410" y="86">c</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">E⊥B⊥传播方向，c = λf</text>
        </Frame>
      );
    case "momentum":
      return (
        <Frame>
          <circle className="km-fill-a" cx="120" cy="180" r="36" />
          <circle className="km-fill-b" cx="320" cy="180" r="50" />
          <Arrow a={[160, 180]} b={[252, 180]} />
          <text className="km-vtx" x="120" y="186" textAnchor="middle">m₁</text>
          <text className="km-vtx" x="320" y="186" textAnchor="middle">m₂</text>
          <text className="km-formula" x="176" y="158">m₁v₁</text>
          <text className="km-formula" x="240" y="300" textAnchor="middle">m₁v₁ + m₂v₂ = 常数（碰撞前后）</text>
        </Frame>
      );
    case "spring":
      return (
        <Frame>
          <line className="km-stroke-thick" x1="80" y1="120" x2="80" y2="240" />
          <path
            className="km-stroke-thick"
            d="M80 180 L110 180 L122 140 L146 220 L170 140 L194 220 L218 140 L242 220 L266 180 L360 180"
          />
          <rect className="km-fill-a" x="360" y="150" width="50" height="60" rx="4" />
          <line className="km-soft-stroke" x1="385" y1="110" x2="385" y2="250" />
          <text className="km-vtx" x="385" y="100" textAnchor="middle">O（平衡位置）</text>
          <Arrow a={[414, 180]} b={[444, 180]} />
          <text className="km-formula" x="416" y="164">x</text>
          <text className="km-formula" x="240" y="70" textAnchor="middle">F = −kx（回复力指向平衡位置）</text>
        </Frame>
      );
    case "mech-wave":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="180" x2="440" y2="180" />
          <path
            className="km-curve km-accent"
            d="M40 180 C80 80 120 80 160 180 S240 280 280 180 S360 80 400 180"
          />
          <line className="km-soft-stroke" x1="100" y1="56" x2="180" y2="56" />
          <text className="km-formula" x="130" y="48">λ</text>
          <circle className="km-dot" cx="240" cy="232" r="5" />
          <Arrow a={[240, 238]} b={[240, 292]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="252" y="290">质点上下振动</text>
          <Arrow a={[396, 120]} b={[446, 120]} />
          <text className="km-formula" x="388" y="106">传播方向</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">质点不随波迁移，v = λf</text>
        </Frame>
      );
    case "lens":
      return (
        <Frame>
          <ellipse cx="240" cy="180" rx="28" ry="110" className="km-fill-b" />
          <line className="km-accent-line" x1="60" y1="120" x2="240" y2="180" />
          <line className="km-accent-line" x1="240" y1="180" x2="400" y2="240" />
          <line className="km-teal-line" x1="60" y1="180" x2="400" y2="180" />
          <text className="km-formula" x="64" y="106">入射光</text>
          <text className="km-formula" x="320" y="262">折射光</text>
          <text className="km-formula" x="406" y="174">法线</text>
          <text className="km-vtx" x="140" y="162">θ₁</text>
          <text className="km-vtx" x="330" y="216">θ₂</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">n₁sinθ₁ = n₂sinθ₂</text>
        </Frame>
      );
    case "lorentz":
      return (
        <Frame>
          <circle cx="240" cy="180" r="100" className="km-stroke" />
          <circle className="km-dot" cx="340" cy="180" r="6" />
          <text className="km-vtx" x="348" y="170">+q</text>
          <Arrow a={[340, 172]} b={[340, 110]} />
          <text className="km-formula" x="350" y="120">v</text>
          <circle className="km-stroke" cx="120" cy="80" r="10" />
          <circle className="km-dot km-dot-teal" cx="120" cy="80" r="3" />
          <text className="km-formula" x="136" y="86">B（垂直纸面向外）</text>
          <Arrow a={[330, 180]} b={[268, 180]} className="km-stroke-thick" fill="km-arrow-fill-ink" />
          <text className="km-formula" x="282" y="164">F</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">F = qvB（匀速圆周运动）</text>
        </Frame>
      );
    case "induction":
      return (
        <Frame>
          <rect className="km-stroke" x="130" y="80" width="220" height="200" fill="none" />
          <line className="km-accent-line" x1="200" y1="80" x2="200" y2="280" />
          <path className="km-teal-line" d="M90 120 C70 180 70 180 90 240" />
          <Arrow a={[90, 226]} b={[90, 252]} className="km-teal-line" fill="km-arrow-fill-teal" />
          <text className="km-formula" x="214" y="186">导体运动</text>
          <text className="km-formula" x="36" y="290">磁场 B</text>
          <text className="km-formula" x="240" y="66" textAnchor="middle">Φ = B·S</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">ε = ΔΦ/Δt（磁通量变化率）</text>
        </Frame>
      );
    case "ac":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="180" x2="440" y2="180" />
          <path
            className="km-curve km-accent"
            d="M50 180 C90 60 130 60 170 180 S250 300 290 180 S370 60 410 180"
          />
          <line className="km-soft-stroke" x1="110" y1="72" x2="110" y2="180" />
          <text className="km-formula" x="120" y="86">Eₘ</text>
          <line className="km-soft-stroke" x1="56" y1="246" x2="284" y2="246" />
          <text className="km-formula" x="146" y="264">一个周期 T</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">e = Eₘsinωt，有效值 = Eₘ/√2</text>
        </Frame>
      );
    case "gas":
      return (
        <Frame>
          <rect className="km-stroke" x="110" y="70" width="260" height="220" fill="none" />
          <circle className="km-dot" cx="180" cy="140" r="6" />
          <circle className="km-dot km-dot-teal" cx="260" cy="180" r="6" />
          <circle className="km-dot" cx="300" cy="230" r="6" />
          <circle className="km-dot km-dot-teal" cx="210" cy="240" r="6" />
          <circle className="km-dot" cx="320" cy="130" r="6" />
          <line className="km-stroke-thick" x1="370" y1="70" x2="370" y2="290" />
          <Arrow a={[434, 180]} b={[380, 180]} />
          <text className="km-formula" x="398" y="164">p</text>
          <text className="km-formula" x="122" y="60">V（体积）</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">pV = nRT（T 为温度）</text>
        </Frame>
      );
    case "atom":
      return (
        <Frame>
          <circle className="km-dot" cx="240" cy="180" r="10" />
          <ellipse cx="240" cy="180" rx="130" ry="50" className="km-stroke" />
          <ellipse cx="240" cy="180" rx="90" ry="120" className="km-soft-stroke" />
          <circle className="km-dot km-dot-teal" cx="370" cy="180" r="5" />
          <text className="km-vtx" x="380" y="172">电子</text>
          <Arrow a={[360, 176]} b={[296, 170]} />
          <text className="km-formula" x="268" y="150">跃迁</text>
          <text className="km-vtx" x="240" y="212" textAnchor="middle">原子核</text>
          <text className="km-formula" x="240" y="330" textAnchor="middle">ΔE = hν（跃迁辐射光子）</text>
        </Frame>
      );
    default:
      return (
        <Frame>
          <path className="km-curve km-accent" d="M70 260 C160 80 300 80 410 240" />
        </Frame>
      );
  }
}

function isoProject(ox, oy, scale, sx, sy, sz) {
  const c = Math.sqrt(3) / 2;
  return (x, y, z) => [
    +(ox + (x * sx - z * sz) * scale * c).toFixed(1),
    +(oy - y * sy * scale + (x * sx + z * sz) * scale * 0.5).toFixed(1),
  ];
}

function poly(pts) {
  return pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ") + " Z";
}

function Seg({ a, b, className }) {
  return <line className={className} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
}

function Vtx({ p, name, dx = 0, dy = 0 }) {
  return (
    <text className="km-vtx" x={p[0] + dx} y={p[1] + dy}>
      {name}
    </text>
  );
}

function isoBox(sx, sy, sz, accent = "", animate = false) {
  const P = isoProject(248, 226, 68, sx, sy, sz);
  const A = P(0, 0, 0);
  const B = P(1, 0, 0);
  const C = P(1, 0, 1);
  const D = P(0, 0, 1);
  const E = P(0, 1, 0);
  const F = P(1, 1, 0);
  const G = P(1, 1, 1);
  const H = P(0, 1, 1);
  const showFace = accent === "face-diag" || accent === "diag";
  const showSpace = accent === "diag";
  const showMetrics = accent === "metrics";
  const showCoord = accent === "coord";

  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="318" rx="128" ry="13" />
      {/* 等轴测：近角 G 可见，远角 A 不可见 */}
      <path className="km-fill-b" d={poly([E, F, G, H])} />
      <path className="km-fill-c" d={poly([B, C, G, F])} />
      <path className="km-fill-a" d={poly([D, C, G, H])} />
      <Seg a={A} b={B} className="km-hidden" />
      <Seg a={A} b={E} className="km-hidden" />
      <Seg a={A} b={D} className="km-hidden" />
      <Seg a={E} b={F} className="km-stroke-thick" />
      <Seg a={F} b={B} className="km-stroke-thick" />
      <Seg a={B} b={C} className="km-stroke-thick" />
      <Seg a={C} b={D} className="km-stroke-thick" />
      <Seg a={D} b={H} className="km-stroke-thick" />
      <Seg a={H} b={E} className="km-stroke-thick" />
      <Seg a={F} b={G} className="km-stroke-thick" />
      <Seg a={C} b={G} className="km-stroke-thick" />
      <Seg a={H} b={G} className="km-stroke-thick" />
      {showFace && <Seg a={A} b={C} className="km-teal-line" />}
      {showSpace && <Seg a={A} b={G} className="km-accent-line km-diag" />}
      {showMetrics && (
        <>
          {/* 三条可见棱上标棱长 a */}
          <text className="km-formula" x={(B[0] + C[0]) / 2 + 10} y={(B[1] + C[1]) / 2}>a</text>
          <text className="km-formula" x={(D[0] + C[0]) / 2 - 16} y={(D[1] + C[1]) / 2}>a</text>
          <text className="km-formula" x={(G[0] + C[0]) / 2 + 12} y={(G[1] + C[1]) / 2 + 4}>a</text>
          <text className="km-formula" x="380" y="60">V = a³</text>
          <text className="km-formula" x="380" y="84">S = 6a²</text>
        </>
      )}
      {showCoord && (
        <>
          {/* 空间直角坐标系：以近下角 C 为原点 */}
          <line className="km-accent-line" x1={C[0]} y1={C[1]} x2="342" y2="242" />
          <line className="km-accent-line" x1={C[0]} y1={C[1]} x2={C[0]} y2="146" />
          <line className="km-accent-line" x1={C[0]} y1={C[1]} x2="148" y2="238" />
          <text className="km-formula" x="350" y="248">x</text>
          <text className="km-formula" x={C[0] + 8} y="146">y</text>
          <text className="km-formula" x="134" y="244">z</text>
          <text className="km-formula" x="398" y="60" textAnchor="end">以 C 为原点建系</text>
        </>
      )}
      <Vtx p={A} name="A" dx={-18} dy={14} />
      <Vtx p={B} name="B" dx={8} dy={14} />
      <Vtx p={C} name="C" dx={10} dy={-2} />
      <Vtx p={D} name="D" dx={-18} dy={4} />
      <Vtx p={E} name="E" dx={-16} dy={-6} />
      <Vtx p={F} name="F" dx={8} dy={-6} />
      <Vtx p={G} name="G" dx={8} dy={-8} />
      <Vtx p={H} name="H" dx={-16} dy={-8} />
    </Frame>
  );
}

/** 线面垂直判定：面内两条相交直线 m、n，l 垂直于它们 ⇒ l⊥α */
function perpDemo() {
  return (
    <Frame>
      <path className="km-fill-b" d="M90 250 L210 190 L400 240 L280 300 Z" />
      <text className="km-formula" x="334" y="292">平面 α</text>
      <line className="km-stroke-thick" x1="120" y1="270" x2="380" y2="228" />
      <line className="km-stroke-thick" x1="160" y1="205" x2="260" y2="285" />
      <circle className="km-dot" cx="215" cy="249" r="4" />
      <line className="km-accent-line" x1="215" y1="249" x2="215" y2="66" />
      <text className="km-vtx" x="222" y="76">l</text>
      <text className="km-formula" x="238" y="120">l⊥m，l⊥n</text>
      <text className="km-formula" x="238" y="150">m∩n = O ⇒ l⊥α</text>
      <text className="km-vtx" x="150" y="270">m</text>
      <text className="km-vtx" x="252" y="286">n</text>
    </Frame>
  );
}

function isoPyramid(accent = "", animate = false) {
  const P = isoProject(246, 250, 72, 1.12, 1.15, 1.12);
  const A = P(0, 0, 0);
  const B = P(1, 0, 0);
  const C = P(1, 0, 1);
  const D = P(0, 0, 1);
  const S = P(0.5, 1, 0.5);
  const O = P(0.5, 0, 0.5);
  const showH = accent === "height" || accent === "diag";
  const hClass = "km-accent-line km-diag";

  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="318" rx="118" ry="12" />
      {/* 可见侧面在近底角 C 两侧；底面朝下不可见，不填色 */}
      <path className="km-fill-c" d={poly([S, B, C])} />
      <path className="km-fill-a" d={poly([S, C, D])} />
      <Seg a={A} b={B} className="km-hidden" />
      <Seg a={A} b={D} className="km-hidden" />
      <Seg a={S} b={B} className="km-stroke-thick" />
      <Seg a={B} b={C} className="km-stroke-thick" />
      <Seg a={C} b={D} className="km-stroke-thick" />
      <Seg a={D} b={S} className="km-stroke-thick" />
      <Seg a={S} b={C} className="km-stroke-thick" />
      {showH && <Seg a={S} b={O} className={hClass} />}
      {showH && <circle className="km-dot" cx={O[0]} cy={O[1]} r="4" />}
      <Vtx p={S} name="S" dx={-4} dy={-8} />
      <Vtx p={A} name="A" dx={-16} dy={16} />
      <Vtx p={B} name="B" dx={8} dy={16} />
      <Vtx p={C} name="C" dx={8} dy={8} />
      <Vtx p={D} name="D" dx={-16} dy={6} />
    </Frame>
  );
}

function isoCylinder(accent = "", animate = false) {
  const showH = accent === "height" || accent === "diag";
  const hClass = "km-accent-line km-diag";
  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="318" rx="122" ry="12" />
      <path className="km-fill-a" d="M148 108 L148 248 A92 30 0 0 0 332 248 L332 108 A92 30 0 0 1 148 108" />
      <ellipse className="km-fill-b" cx="240" cy="108" rx="92" ry="30" />
      <path className="km-hidden" d="M148 248 A92 30 0 0 1 332 248" />
      <path className="km-stroke" d="M148 248 A92 30 0 0 0 332 248" />
      <ellipse className="km-stroke" cx="240" cy="108" rx="92" ry="30" />
      <line className="km-stroke-thick" x1="148" y1="108" x2="148" y2="248" />
      <line className="km-stroke-thick" x1="332" y1="108" x2="332" y2="248" />
      {showH && <line className={hClass} x1="240" y1="108" x2="240" y2="248" />}
      {accent === "radius" || showH ? (
        <line className="km-teal-line" x1="240" y1="108" x2="332" y2="108" />
      ) : null}
      <Vtx p={[240, 108]} name="O" dx={-4} dy={-8} />
      <text className="km-vtx" x="280" y="100" textAnchor="middle">r</text>
      <text className="km-vtx" x="226" y="184" textAnchor="end">h</text>
    </Frame>
  );
}

function isoCone(accent = "", animate = false) {
  const showH = accent === "height" || accent === "diag";
  const hClass = "km-accent-line km-diag";
  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="318" rx="124" ry="12" />
      <path className="km-fill-a" d="M240 68 L128 258 A112 34 0 0 0 352 258 Z" />
      <path className="km-hidden" d="M128 258 A112 34 0 0 1 352 258" />
      <path className="km-stroke" d="M128 258 A112 34 0 0 0 352 258" />
      <line className="km-hidden" x1="240" y1="68" x2="240" y2="258" />
      <line className="km-stroke-thick" x1="240" y1="68" x2="128" y2="258" />
      <line className="km-stroke-thick" x1="240" y1="68" x2="352" y2="258" />
      {showH && <line className={hClass} x1="240" y1="68" x2="240" y2="258" />}
      {showH && <line className="km-teal-line" x1="240" y1="258" x2="352" y2="258" />}
      <Vtx p={[240, 68]} name="S" dx={-4} dy={-8} />
      <Vtx p={[240, 258]} name="O" dx={-4} dy={16} />
      <text className="km-vtx" x="296" y="252" textAnchor="middle">r</text>
      {showH && <text className="km-vtx" x="226" y="168" textAnchor="end">h</text>}
    </Frame>
  );
}

function isoSphere(accent = "", animate = false) {
  const showR = accent === "radius" || accent === "diag" || accent === "height";
  const rClass = "km-accent-line";
  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="308" rx="92" ry="12" />
      <circle className="km-fill-a" cx="240" cy="168" r="102" />
      <ellipse className="km-soft-stroke" cx="240" cy="168" rx="102" ry="38" />
      <path className="km-hidden" d="M240 66 A38 102 0 0 0 240 270" />
      <path className="km-stroke" d="M240 66 A38 102 0 0 1 240 270" />
      <circle className="km-stroke" cx="240" cy="168" r="102" />
      {showR && <line className={rClass} x1="240" y1="168" x2="342" y2="168" />}
      {showR && <circle className="km-dot" cx="240" cy="168" r="4" />}
      <Vtx p={[240, 168]} name="O" dx={-4} dy={-8} />
      {showR && <text className="km-vtx" x="291" y="160" textAnchor="middle">r</text>}
    </Frame>
  );
}

function isoFrustum(accent = "", animate = false) {
  const showH = accent === "height" || accent === "diag";
  const hClass = "km-accent-line km-diag";
  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="318" rx="132" ry="12" />
      <path className="km-fill-a" d="M158 108 L78 250 A122 32 0 0 0 402 250 L322 108 A80 22 0 0 1 158 108" />
      <ellipse className="km-fill-b" cx="240" cy="108" rx="80" ry="22" />
      <path className="km-hidden" d="M78 250 A122 32 0 0 1 402 250" />
      <path className="km-stroke" d="M78 250 A122 32 0 0 0 402 250" />
      <ellipse className="km-stroke" cx="240" cy="108" rx="80" ry="22" />
      <line className="km-stroke-thick" x1="158" y1="108" x2="78" y2="250" />
      <line className="km-stroke-thick" x1="322" y1="108" x2="402" y2="250" />
      {showH && <line className={hClass} x1="240" y1="108" x2="240" y2="250" />}
      {showH && <line className="km-teal-line" x1="240" y1="108" x2="320" y2="108" />}
      {showH && <line className="km-teal-line" x1="240" y1="250" x2="402" y2="250" />}
      <Vtx p={[240, 108]} name="O₁" dx={-4} dy={-8} />
      <Vtx p={[240, 250]} name="O₂" dx={-4} dy={16} />
      {showH && <text className="km-vtx" x="280" y="100" textAnchor="middle">r</text>}
      {showH && <text className="km-vtx" x="321" y="244" textAnchor="middle">R</text>}
      {showH && <text className="km-vtx" x="226" y="184" textAnchor="end">h</text>}
    </Frame>
  );
}

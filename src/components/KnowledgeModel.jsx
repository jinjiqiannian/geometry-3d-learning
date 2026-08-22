/** 知识点专属模型图：无文字堆砌，一种 model 一种构图 */

function Frame({ children, className = "" }) {
  return (
    <svg
      className={`km-svg ${className}`.trim()}
      viewBox="0 0 480 360"
      aria-hidden="true"
    >
      <rect className="km-bg" x="0" y="0" width="480" height="360" />
      {children}
    </svg>
  );
}

export default function KnowledgeModel({ type = "function" }) {
  switch (type) {
    case "venn":
      return (
        <Frame>
          <circle cx="200" cy="180" r="88" className="km-fill-a" />
          <circle cx="280" cy="180" r="88" className="km-fill-b" />
          <circle cx="200" cy="180" r="88" className="km-stroke" />
          <circle cx="280" cy="180" r="88" className="km-stroke" />
        </Frame>
      );
    case "quadratic":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="240" y1="36" x2="240" y2="320" />
          <path className="km-curve" d="M80 80 Q240 420 400 80" />
          <circle className="km-dot" cx="240" cy="250" r="5" />
        </Frame>
      );
    case "function":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="70" y1="36" x2="70" y2="320" />
          <path className="km-curve km-accent" d="M70 260 C140 260 160 80 240 140 S340 280 420 90" />
        </Frame>
      );
    case "explog":
      return (
        <Frame>
          <line className="km-axis" x1="48" y1="300" x2="432" y2="300" />
          <line className="km-axis" x1="90" y1="36" x2="90" y2="320" />
          <path className="km-curve km-accent" d="M90 280 C160 270 200 220 240 160 S340 40 420 28" />
          <path className="km-curve km-teal" d="M110 40 C180 80 220 160 280 230 S380 300 430 310" />
        </Frame>
      );
    case "unit-circle":
      return (
        <Frame>
          <circle cx="240" cy="180" r="110" className="km-stroke" />
          <line className="km-axis" x1="110" y1="180" x2="370" y2="180" />
          <line className="km-axis" x1="240" y1="50" x2="240" y2="310" />
          <line className="km-accent-line" x1="240" y1="180" x2="318" y2="102" />
          <circle className="km-dot" cx="318" cy="102" r="5" />
          <path className="km-arc" d="M290 180 A50 50 0 0 0 275 138" />
        </Frame>
      );
    case "vector":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="420" y2="300" />
          <line className="km-axis" x1="80" y1="40" x2="80" y2="320" />
          <line className="km-accent-line" x1="80" y1="300" x2="300" y2="110" />
          <line className="km-teal-line" x1="80" y1="300" x2="250" y2="300" />
          <line className="km-teal-line" x1="250" y1="300" x2="300" y2="110" />
          <polygon className="km-fill-a" points="300,110 278,128 296,138" />
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
        </Frame>
      );
    case "cube":
      return isoBox(1, 1, 1);
    case "cuboid":
      return isoBox(1.35, 0.85, 1);
    case "pyramid":
      return (
        <Frame>
          <ellipse className="km-shadow" cx="240" cy="300" rx="110" ry="14" />
          <path className="km-fill-a" d="M240 70 L120 280 L360 280 Z" />
          <path className="km-fill-b" d="M240 70 L360 280 L400 250 Z" />
          <path className="km-stroke-thick" d="M240 70 L120 280 L360 280 Z" />
          <line className="km-accent-line" x1="240" y1="70" x2="240" y2="280" />
        </Frame>
      );
    case "prism":
      return isoBox(1.1, 1.2, 0.75);
    case "cylinder":
      return (
        <Frame>
          <ellipse className="km-shadow" cx="240" cy="308" rx="120" ry="14" />
          <ellipse className="km-fill-b" cx="240" cy="250" rx="90" ry="28" />
          <path className="km-fill-a" d="M150 110 L150 250 A90 28 0 0 0 330 250 L330 110" />
          <ellipse className="km-fill-b" cx="240" cy="110" rx="90" ry="28" />
          <ellipse className="km-stroke" cx="240" cy="110" rx="90" ry="28" />
          <ellipse className="km-stroke" cx="240" cy="250" rx="90" ry="28" />
          <line className="km-stroke-thick" x1="150" y1="110" x2="150" y2="250" />
          <line className="km-stroke-thick" x1="330" y1="110" x2="330" y2="250" />
        </Frame>
      );
    case "cone":
      return (
        <Frame>
          <ellipse className="km-shadow" cx="240" cy="300" rx="118" ry="14" />
          <ellipse className="km-fill-b" cx="240" cy="260" rx="110" ry="32" />
          <path className="km-fill-a" d="M240 70 L130 260 L350 260 Z" />
          <ellipse className="km-stroke" cx="240" cy="260" rx="110" ry="32" />
          <line className="km-accent-line" x1="240" y1="70" x2="240" y2="260" />
        </Frame>
      );
    case "sphere":
      return (
        <Frame>
          <ellipse className="km-shadow" cx="240" cy="300" rx="90" ry="12" />
          <circle className="km-fill-a" cx="240" cy="170" r="100" />
          <ellipse className="km-soft-stroke" cx="240" cy="170" rx="100" ry="36" />
          <ellipse className="km-soft-stroke" cx="240" cy="170" rx="36" ry="100" />
          <circle className="km-stroke" cx="240" cy="170" r="100" />
        </Frame>
      );
    case "frustum":
      return (
        <Frame>
          <ellipse className="km-shadow" cx="240" cy="308" rx="130" ry="14" />
          <ellipse className="km-fill-b" cx="240" cy="250" rx="120" ry="30" />
          <path className="km-fill-a" d="M160 110 L80 250 L400 250 L320 110 Z" />
          <ellipse className="km-fill-b" cx="240" cy="110" rx="80" ry="22" />
          <ellipse className="km-stroke" cx="240" cy="110" rx="80" ry="22" />
          <ellipse className="km-stroke" cx="240" cy="250" rx="120" ry="30" />
        </Frame>
      );
    case "hist":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="430" y2="300" />
          <rect className="km-fill-a" x="90" y="190" width="48" height="110" />
          <rect className="km-fill-b" x="160" y="140" width="48" height="160" />
          <rect className="km-fill-a" x="230" y="90" width="48" height="210" />
          <rect className="km-fill-b" x="300" y="160" width="48" height="140" />
          <rect className="km-fill-a" x="370" y="220" width="48" height="80" />
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
        </Frame>
      );
    case "line-circle":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="300" x2="440" y2="80" />
          <circle cx="260" cy="180" r="88" className="km-stroke" />
          <circle className="km-dot" cx="196" cy="232" r="5" />
          <circle className="km-dot" cx="318" cy="136" r="5" />
        </Frame>
      );
    case "ellipse":
      return (
        <Frame>
          <ellipse cx="240" cy="180" rx="150" ry="88" className="km-stroke" />
          <line className="km-axis" x1="70" y1="180" x2="410" y2="180" />
          <circle className="km-dot" cx="175" cy="180" r="5" />
          <circle className="km-dot" cx="305" cy="180" r="5" />
        </Frame>
      );
    case "hyperbola":
      return (
        <Frame>
          <line className="km-axis" x1="40" y1="180" x2="440" y2="180" />
          <line className="km-axis" x1="240" y1="40" x2="240" y2="320" />
          <path className="km-curve km-accent" d="M80 50 C140 140 160 180 240 180" />
          <path className="km-curve km-accent" d="M80 310 C140 220 160 180 240 180" />
          <path className="km-curve km-teal" d="M400 50 C340 140 320 180 240 180" />
          <path className="km-curve km-teal" d="M400 310 C340 220 320 180 240 180" />
        </Frame>
      );
    case "parabola":
      return (
        <Frame>
          <line className="km-axis" x1="240" y1="40" x2="240" y2="320" />
          <path className="km-curve km-accent" d="M90 280 Q240 40 390 280" />
          <line className="km-soft-stroke" x1="80" y1="300" x2="400" y2="300" />
          <circle className="km-dot" cx="240" cy="130" r="5" />
        </Frame>
      );
    case "sequence":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          {[70, 130, 190, 250, 310, 370].map((x, i) => (
            <circle key={x} className="km-dot" cx={x} cy={260 - i * 28} r="6" />
          ))}
          <path className="km-soft-stroke" d="M70 260 L130 232 L190 204 L250 176 L310 148 L370 120" />
        </Frame>
      );
    case "derivative":
      return (
        <Frame>
          <path className="km-curve" d="M60 260 C140 260 180 80 260 140 S380 80 430 70" />
          <line className="km-accent-line" x1="140" y1="230" x2="360" y2="70" />
          <circle className="km-dot" cx="250" cy="148" r="5" />
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
        </Frame>
      );
    case "dist":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          <path className="km-curve km-accent" d="M70 300 C140 300 160 60 240 60 S340 300 420 300" />
          <rect className="km-fill-a" x="200" y="160" width="80" height="140" />
        </Frame>
      );
    case "vt":
      return (
        <Frame>
          <line className="km-axis" x1="60" y1="300" x2="430" y2="300" />
          <line className="km-axis" x1="80" y1="40" x2="80" y2="320" />
          <path className="km-accent-line" d="M80 260 L200 120 L380 120" />
          <circle className="km-dot" cx="200" cy="120" r="5" />
        </Frame>
      );
    case "force":
      return (
        <Frame>
          <rect className="km-fill-a" x="190" y="140" width="100" height="70" rx="6" />
          <line className="km-accent-line" x1="240" y1="140" x2="240" y2="60" />
          <line className="km-teal-line" x1="240" y1="210" x2="240" y2="290" />
          <line className="km-stroke-thick" x1="190" y1="175" x2="110" y2="175" />
          <line className="km-stroke-thick" x1="290" y1="175" x2="370" y2="175" />
        </Frame>
      );
    case "energy":
      return (
        <Frame>
          <path className="km-fill-b" d="M80 80 L400 80 L400 300 L80 300 Z" />
          <rect className="km-fill-a" x="200" y="90" width="28" height="160" />
          <circle className="km-dot" cx="214" cy="90" r="10" />
          <path className="km-soft-stroke" d="M214 100 Q300 160 214 250" />
        </Frame>
      );
    case "projectile":
      return (
        <Frame>
          <line className="km-axis" x1="50" y1="300" x2="440" y2="300" />
          <path className="km-curve km-accent" d="M70 280 Q240 40 420 280" />
          <line className="km-teal-line" x1="70" y1="280" x2="150" y2="180" />
        </Frame>
      );
    case "orbit":
      return (
        <Frame>
          <ellipse cx="240" cy="180" rx="150" ry="90" className="km-stroke" />
          <circle className="km-dot" cx="240" cy="180" r="14" />
          <circle className="km-dot km-dot-teal" cx="380" cy="180" r="7" />
        </Frame>
      );
    case "charge":
      return (
        <Frame>
          <circle className="km-dot" cx="240" cy="180" r="12" />
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
        </Frame>
      );
    case "circuit":
      return (
        <Frame>
          <rect className="km-stroke" x="90" y="90" width="300" height="180" fill="none" />
          <rect className="km-fill-a" x="70" y="160" width="28" height="40" />
          <path className="km-accent-line" d="M220 90 l16 28 -16 28 16 28 -16 28 16 28" />
        </Frame>
      );
    case "wave":
      return (
        <Frame>
          <path
            className="km-curve km-accent"
            d="M40 180 C80 80 120 80 160 180 S240 280 280 180 S360 80 400 180 S460 280 470 180"
          />
        </Frame>
      );
    case "spring":
      return (
        <Frame>
          <path
            className="km-stroke-thick"
            d="M80 180 L110 180 L122 140 L146 220 L170 140 L194 220 L218 140 L242 220 L266 180 L360 180"
          />
          <rect className="km-fill-a" x="360" y="150" width="50" height="60" rx="4" />
        </Frame>
      );
    case "lens":
      return (
        <Frame>
          <ellipse cx="240" cy="180" rx="28" ry="110" className="km-fill-b" />
          <line className="km-accent-line" x1="60" y1="120" x2="240" y2="180" />
          <line className="km-accent-line" x1="240" y1="180" x2="400" y2="240" />
          <line className="km-teal-line" x1="60" y1="180" x2="400" y2="180" />
        </Frame>
      );
    case "lorentz":
      return (
        <Frame>
          <circle cx="240" cy="180" r="100" className="km-stroke" />
          <circle className="km-dot" cx="340" cy="180" r="6" />
          <line className="km-accent-line" x1="340" y1="180" x2="340" y2="110" />
        </Frame>
      );
    case "induction":
      return (
        <Frame>
          <rect className="km-stroke" x="130" y="80" width="220" height="200" fill="none" />
          <line className="km-accent-line" x1="200" y1="80" x2="200" y2="280" />
          <path className="km-teal-line" d="M90 120 C70 180 70 180 90 240" />
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
        </Frame>
      );
    case "atom":
      return (
        <Frame>
          <circle className="km-dot" cx="240" cy="180" r="10" />
          <ellipse cx="240" cy="180" rx="130" ry="50" className="km-stroke" />
          <ellipse cx="240" cy="180" rx="90" ry="120" className="km-soft-stroke" />
          <circle className="km-dot km-dot-teal" cx="370" cy="180" r="5" />
        </Frame>
      );
    case "momentum":
      return (
        <Frame>
          <circle className="km-fill-a" cx="160" cy="180" r="36" />
          <circle className="km-fill-b" cx="300" cy="180" r="50" />
          <line className="km-accent-line" x1="196" y1="180" x2="250" y2="180" />
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

function isoBox(sx, sy, sz) {
  const ox = 240;
  const oy = 250;
  const s = 86;
  const c = Math.sqrt(3) / 2;
  const P = (x, y, z) => [
    ox + (x * sx - z * sz) * s * c,
    oy - y * sy * s + (x * sx + z * sz) * s * 0.5,
  ];
  const A = P(0, 0, 0);
  const B = P(1, 0, 0);
  const C = P(1, 0, 1);
  const E = P(0, 1, 0);
  const F = P(1, 1, 0);
  const G = P(1, 1, 1);
  const H = P(0, 1, 1);
  const poly = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ") + " Z";
  return (
    <Frame>
      <ellipse className="km-shadow" cx="240" cy="310" rx="120" ry="14" />
      <path className="km-fill-b" d={poly([E, F, G, H])} />
      <path className="km-fill-a" d={poly([B, C, G, F])} />
      <path className="km-fill-a" d={poly([A, B, F, E])} />
      <path className="km-stroke-thick" d={poly([E, F, G, H])} />
      <path className="km-stroke-thick" d={`M${A[0]} ${A[1]} L${B[0]} ${B[1]} L${F[0]} ${F[1]} L${E[0]} ${E[1]} Z`} />
    </Frame>
  );
}

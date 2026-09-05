// ═══════════════════════════════════════════════════════
//  knowledgeContent — 每个知识点的专属示意图 + 详细讲解
//  按 knowledge point code 索引，供知识图谱页直接渲染
//  风格：Apple 式克制（细线、单一蓝高亮、灰构造线、清晰标注）
// ═══════════════════════════════════════════════════════
import React from "react";

// ── 配色 ──
const INK = "#1d1d1f"; // 主线
const MUTE = "#86868b"; // 虚线/构造
const BLUE = "#0071e3"; // 高亮（核心概念）
const BLUE_SOFT = "rgba(0,113,227,0.10)";
const FACE = "rgba(29,29,31,0.05)";
const LABEL = "#1d1d1f";

const SW = 1.6; // 主线宽
const HW = 2.2; // 高亮线宽

// ── 统一画框 ──
function Dia({ children }) {
  return (
    <svg
      viewBox="0 0 320 200"
      width="100%"
      height="100%"
      role="img"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

// 文本标签
function L({
  x,
  y,
  children,
  anchor = "middle",
  size = 11,
  color = LABEL,
  bold = false,
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily="-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"
      fontSize={size}
      fontWeight={bold ? 600 : 500}
      fill={color}
    >
      {children}
    </text>
  );
}

// ────────────────────────────────────────────────────
//  1. KP-SG-ROOT 立体几何总览
// ────────────────────────────────────────────────────
function DiaRoot() {
  return (
    <Dia>
      {/* 正方体 */}
      <polygon
        points="30,150 80,150 80,100 30,100"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="30,100 52,78 102,78 80,100"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="80,100 102,78 102,128 80,150"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <L x={66} y={172} size={10}>
        正方体
      </L>
      {/* 棱锥 */}
      <polygon
        points="135,150 185,150 197,138 147,138"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={161} y1={138} x2={161} y2={88} stroke={INK} strokeWidth={SW} />
      <line x1={135} y1={150} x2={161} y2={88} stroke={INK} strokeWidth={SW} />
      <line x1={185} y1={150} x2={161} y2={88} stroke={INK} strokeWidth={SW} />
      <line x1={197} y1={138} x2={161} y2={88} stroke={INK} strokeWidth={SW} />
      <L x={166} y={172} size={10}>
        棱锥
      </L>
      {/* 球 */}
      <circle
        cx={260}
        cy={115}
        r={36}
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <ellipse
        cx={260}
        cy={115}
        rx={36}
        ry={13}
        fill="none"
        stroke={MUTE}
        strokeWidth={1.2}
      />
      <L x={260} y={172} size={10}>
        球
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  2. KP-SG-BASIC 空间几何体的基本元素
// ────────────────────────────────────────────────────
function DiaBasic() {
  return (
    <Dia>
      {/* 立方体 */}
      <polygon
        points="70,150 170,150 170,70 70,70"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="70,70 110,40 210,40 170,70"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="170,70 210,40 210,120 170,150"
        fill={BLUE_SOFT}
        stroke={BLUE}
        strokeWidth={HW}
      />
      {/* 高亮一条棱 */}
      <line x1={170} y1={70} x2={170} y2={150} stroke={BLUE} strokeWidth={HW} />
      {/* 高亮一个顶点 */}
      <circle cx={170} cy={150} r={4} fill={BLUE} />
      {/* 引线标注 */}
      <line x1={174} y1={150} x2={245} y2={165} stroke={MUTE} strokeWidth={1} />
      <L x={278} y={165} size={11} color={BLUE}>
        顶点
      </L>
      <line x1={170} y1={110} x2={250} y2={120} stroke={MUTE} strokeWidth={1} />
      <L x={278} y={120} size={11} color={BLUE}>
        棱
      </L>
      <line x1={190} y1={55} x2={262} y2={48} stroke={MUTE} strokeWidth={1} />
      <L x={278} y={48} size={11} color={BLUE}>
        面
      </L>
      <L x={120} y={185} size={10}>
        面 F · 棱 E · 顶点 V
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  3. KP-SG-BASIC-POLY 多面体
// ────────────────────────────────────────────────────
function DiaPoly() {
  return (
    <Dia>
      {/* 棱柱（三棱柱） */}
      <polygon
        points="30,150 75,150 95,128 50,128"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="30,150 75,150 75,95 30,95"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="50,128 95,128 75,95 30,95"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <L x={62} y={172} size={10}>
        棱柱
      </L>
      {/* 棱锥 */}
      <polygon
        points="125,150 175,150 188,134 138,134"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={125} y1={150} x2={156} y2={92} stroke={INK} strokeWidth={SW} />
      <line x1={175} y1={150} x2={156} y2={92} stroke={INK} strokeWidth={SW} />
      <line x1={188} y1={134} x2={156} y2={92} stroke={INK} strokeWidth={SW} />
      <line x1={138} y1={134} x2={156} y2={92} stroke={INK} strokeWidth={SW} />
      <L x={156} y={172} size={10}>
        棱锥
      </L>
      {/* 棱台 */}
      <polygon
        points="220,150 270,150 282,138 232,138"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="236,138 266,138 274,120 244,120"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={236} y1={138} x2={244} y2={120} stroke={INK} strokeWidth={SW} />
      <line x1={266} y1={138} x2={274} y2={120} stroke={INK} strokeWidth={SW} />
      <L x={251} y={172} size={10}>
        棱台
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  4. KP-SG-BASIC-REV 旋转体
// ────────────────────────────────────────────────────
function DiaRev() {
  return (
    <Dia>
      {/* 圆柱 */}
      <line
        x1={55}
        y1={150}
        x2={55}
        y2={90}
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <ellipse
        cx={55}
        cy={90}
        rx={26}
        ry={8}
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={29} y1={90} x2={29} y2={150} stroke={INK} strokeWidth={SW} />
      <line x1={81} y1={90} x2={81} y2={150} stroke={INK} strokeWidth={SW} />
      <path
        d="M29 150 A26 8 0 0 0 81 150"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <path
        d="M29 150 A26 8 0 0 1 81 150"
        fill="none"
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <L x={55} y={172} size={10}>
        圆柱
      </L>
      {/* 圆锥 */}
      <line
        x1={155}
        y1={150}
        x2={155}
        y2={92}
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <path
        d="M129 150 A26 8 0 0 0 181 150"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <path
        d="M129 150 A26 8 0 0 1 181 150"
        fill="none"
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line x1={129} y1={150} x2={155} y2={92} stroke={INK} strokeWidth={SW} />
      <line x1={181} y1={150} x2={155} y2={92} stroke={INK} strokeWidth={SW} />
      <L x={155} y={172} size={10}>
        圆锥
      </L>
      {/* 球 */}
      <line
        x1={255}
        y1={152}
        x2={255}
        y2={78}
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle
        cx={255}
        cy={115}
        r={34}
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <ellipse
        cx={255}
        cy={115}
        rx={34}
        ry={12}
        fill="none"
        stroke={MUTE}
        strokeWidth={1}
      />
      <L x={255} y={172} size={10}>
        球
      </L>
      <L x={160} y={40} size={10} color={MUTE}>
        虚线为旋转轴
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  5. KP-SG-POS 空间点线面位置关系
// ────────────────────────────────────────────────────
function DiaPos() {
  return (
    <Dia>
      {/* 平面 α（平行四边形） */}
      <polygon
        points="50,150 270,150 250,100 30,100"
        fill={BLUE_SOFT}
        stroke={INK}
        strokeWidth={SW}
      />
      <L x={272} y={148} size={11} color={MUTE}>
        α
      </L>
      {/* 平面内的直线 a */}
      <line x1={70} y1={132} x2={210} y2={132} stroke={BLUE} strokeWidth={HW} />
      <L x={214} y={132} size={11} color={BLUE} anchor="start">
        a
      </L>
      {/* 与平面相交的直线 b */}
      <line x1={120} y1={40} x2={160} y2={150} stroke={INK} strokeWidth={SW} />
      <circle cx={150} cy={116} r={3} fill={INK} />
      <L x={116} y={40} size={11} anchor="end">
        b
      </L>
      {/* 平面外一点 P */}
      <circle cx={220} cy={60} r={3.5} fill={INK} />
      <L x={228} y={58} size={11} anchor="start">
        P
      </L>
      <L x={160} y={185} size={10}>
        点、直线、平面的位置关系
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  6. KP-SG-POS-PARA 平行关系
// ────────────────────────────────────────────────────
function DiaPara() {
  return (
    <Dia>
      {/* 线线平行 */}
      <line x1={20} y1={70} x2={90} y2={70} stroke={BLUE} strokeWidth={HW} />
      <line x1={20} y1={95} x2={90} y2={95} stroke={BLUE} strokeWidth={HW} />
      <L x={55} y={130} size={10}>
        线线平行
      </L>
      {/* 线面平行 */}
      <polygon
        points="120,90 195,90 185,60 110,60"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line
        x1={120}
        y1={120}
        x2={200}
        y2={120}
        stroke={BLUE}
        strokeWidth={HW}
      />
      <L x={155} y={145} size={10}>
        线面平行
      </L>
      {/* 面面平行 */}
      <polygon
        points="225,60 300,60 290,30 215,30"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="240,115 305,115 295,90 230,90"
        fill={BLUE_SOFT}
        stroke={BLUE}
        strokeWidth={HW}
      />
      <L x={260} y={145} size={10}>
        面面平行
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  7. KP-SG-POS-PERP 垂直关系
// ────────────────────────────────────────────────────
function DiaPerp() {
  return (
    <Dia>
      {/* 线线垂直 */}
      <line x1={25} y1={95} x2={90} y2={95} stroke={INK} strokeWidth={SW} />
      <line x1={57} y1={62} x2={57} y2={128} stroke={BLUE} strokeWidth={HW} />
      <path
        d="M57 95 L64 95 L64 102 Z"
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      <L x={57} y={150} size={10}>
        线线垂直
      </L>
      {/* 线面垂直 */}
      <polygon
        points="120,120 195,120 185,90 110,90"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={150} y1={55} x2={150} y2={108} stroke={BLUE} strokeWidth={HW} />
      <path
        d="M150 108 L143 108 L143 101"
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      <path
        d="M143 108 L143 101 L150 101"
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      <L x={150} y={150} size={10}>
        线面垂直
      </L>
      {/* 面面垂直 */}
      <polygon
        points="215,120 290,120 280,90 205,90"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="230,120 280,90 262,90 212,120"
        fill={BLUE_SOFT}
        stroke={BLUE}
        strokeWidth={HW}
      />
      <L x={252} y={150} size={10}>
        面面垂直
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  8. KP-SG-ANGLE 空间角总览
// ────────────────────────────────────────────────────
function DiaAngle() {
  return (
    <Dia>
      {/* 异面直线角 */}
      <line x1={20} y1={95} x2={95} y2={70} stroke={BLUE} strokeWidth={HW} />
      <line
        x1={30}
        y1={120}
        x2={100}
        y2={95}
        stroke={INK}
        strokeWidth={SW}
        strokeDasharray="4 3"
      />
      <path
        d="M62 84 A14 14 0 0 1 70 96"
        fill="none"
        stroke={INK}
        strokeWidth={1.2}
      />
      <L x={57} y={145} size={10}>
        异面直线角
      </L>
      {/* 线面角 */}
      <polygon
        points="120,120 195,120 185,90 110,90"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={130} y1={50} x2={165} y2={108} stroke={BLUE} strokeWidth={HW} />
      <line
        x1={165}
        y1={108}
        x2={130}
        y2={108}
        stroke={INK}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <path
        d="M158 108 A8 8 0 0 0 159 102"
        fill="none"
        stroke={INK}
        strokeWidth={1.2}
      />
      <L x={152} y={145} size={10}>
        线面角
      </L>
      {/* 二面角 */}
      <line x1={225} y1={55} x2={225} y2={130} stroke={INK} strokeWidth={SW} />
      <polygon
        points="225,55 295,70 295,130 225,130"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <polygon
        points="225,55 250,90 250,130 225,130"
        fill={BLUE_SOFT}
        stroke={BLUE}
        strokeWidth={HW}
      />
      <path
        d="M248 92 A10 10 0 0 0 240 100"
        fill="none"
        stroke={INK}
        strokeWidth={1.2}
      />
      <L x={260} y={145} size={10}>
        二面角
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  9. KP-SG-ANGLE-LINE 异面直线夹角
// ────────────────────────────────────────────────────
function DiaAngleLine() {
  return (
    <Dia>
      {/* 直线 a */}
      <line x1={50} y1={140} x2={250} y2={140} stroke={INK} strokeWidth={SW} />
      <L x={256} y={140} size={12} anchor="start">
        a
      </L>
      {/* 异面直线 b（在后方） */}
      <line x1={90} y1={70} x2={230} y2={100} stroke={BLUE} strokeWidth={HW} />
      <L x={234} y={102} size={12} color={BLUE} anchor="start">
        b
      </L>
      {/* 平移 b 到与 a 相交于 O */}
      <line
        x1={140}
        y1={140}
        x2={210}
        y2={108}
        stroke={BLUE}
        strokeWidth={1}
        strokeDasharray="5 3"
      />
      <circle cx={140} cy={140} r={3} fill={INK} />
      <L x={140} y={156} size={12}>
        O
      </L>
      <L x={214} y={108} size={11} color={BLUE} anchor="start">
        b′（平移）
      </L>
      {/* 角 θ */}
      <path
        d="M168 140 A26 26 0 0 1 174 128"
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
      />
      <L x={170} y={126} size={12} color={BLUE} bold>
        θ
      </L>
      <L x={160} y={184} size={11} color={MUTE}>
        将 b 平移至与 a 相交，所成锐角即异面直线夹角
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  10. KP-SG-ANGLE-LINE-PLANE 线面角
// ────────────────────────────────────────────────────
function DiaAngleLinePlane() {
  return (
    <Dia>
      {/* 平面 α */}
      <polygon
        points="50,140 280,140 260,100 30,100"
        fill={BLUE_SOFT}
        stroke={INK}
        strokeWidth={SW}
      />
      <L x={284} y={138} size={12} color={MUTE}>
        α
      </L>
      {/* 斜线 AB（A 在平面上方，B 为斜足 */}
      <line x1={100} y1={40} x2={170} y2={120} stroke={BLUE} strokeWidth={HW} />
      <circle cx={170} cy={120} r={3} fill={INK} />
      <L x={96} y={40} size={12} anchor="end" color={BLUE}>
        A
      </L>
      <L x={178} y={120} size={12} anchor="start">
        B
      </L>
      {/* 射影（B 到 A 的投影） */}
      <line
        x1={170}
        y1={120}
        x2={100}
        y2={120}
        stroke={INK}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <circle cx={100} cy={120} r={3} fill={INK} />
      <L x={92} y={120} size={12} anchor="end">
        A′
      </L>
      <L x={70} y={135} size={10} color={MUTE}>
        射影 BA′
      </L>
      {/* 角 θ */}
      <path
        d="M150 120 A18 18 0 0 0 152 108"
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
      />
      <L x={154} y={110} size={12} color={BLUE} bold>
        θ
      </L>
      <L x={160} y={184} size={11} color={MUTE}>
        斜线与它在平面内的射影所成角，即线面角
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  11. KP-SG-ANGLE-DIHEDRAL 二面角
// ────────────────────────────────────────────────────
function DiaDihedral() {
  return (
    <Dia>
      {/* 棱 l */}
      <line x1={160} y1={40} x2={160} y2={160} stroke={INK} strokeWidth={SW} />
      <L x={160} y={32} size={12}>
        l（棱）
      </L>
      {/* 半平面 α */}
      <polygon
        points="160,40 250,70 250,150 160,160"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <L x={258} y={70} size={12} color={MUTE}>
        α
      </L>
      {/* 半平面 β */}
      <polygon
        points="160,40 90,75 90,150 160,160"
        fill={BLUE_SOFT}
        stroke={BLUE}
        strokeWidth={HW}
      />
      <L x={82} y={75} size={12} color={BLUE} anchor="end">
        β
      </L>
      {/* 在棱上取一点 O，作棱的垂面，得到平面角 */}
      <line x1={160} y1={100} x2={225} y2={118} stroke={INK} strokeWidth={1} />
      <line x1={160} y1={100} x2={108} y2={120} stroke={INK} strokeWidth={1} />
      <circle cx={160} cy={100} r={3} fill={INK} />
      <L x={166} y={96} size={11}>
        O
      </L>
      <path
        d="M180 110 A22 22 0 0 0 150 112"
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
      />
      <L x={165} y={112} size={13} color={BLUE} bold>
        θ
      </L>
      <L x={160} y={184} size={11} color={MUTE}>
        棱上取 O，在两半面内作棱的垂线，其夹角即二面角的平面角
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  12. KP-SG-DIST 空间距离总览
// ────────────────────────────────────────────────────
function DiaDist() {
  return (
    <Dia>
      {/* 点到线 */}
      <line x1={20} y1={75} x2={95} y2={75} stroke={INK} strokeWidth={SW} />
      <circle cx={57} cy={120} r={3} fill={INK} />
      <line x1={57} y1={120} x2={57} y2={75} stroke={BLUE} strokeWidth={HW} />
      <rect
        x={53}
        y={75}
        width={8}
        height={8}
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      <L x={57} y={145} size={10}>
        点到线
      </L>
      {/* 点到面 */}
      <polygon
        points="115,90 190,90 180,60 105,60"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <circle cx={150} cy={120} r={3} fill={INK} />
      <line x1={150} y1={120} x2={150} y2={78} stroke={BLUE} strokeWidth={HW} />
      <L x={150} y={145} size={10}>
        点到面
      </L>
      {/* 异面直线距离 */}
      <line x1={215} y1={60} x2={300} y2={60} stroke={INK} strokeWidth={SW} />
      <line
        x1={225}
        y1={120}
        x2={295}
        y2={120}
        stroke={INK}
        strokeWidth={SW}
        strokeDasharray="4 3"
      />
      <line x1={250} y1={60} x2={250} y2={120} stroke={BLUE} strokeWidth={HW} />
      <L x={258} y={145} size={10}>
        异面直线距离
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  13. KP-SG-DIST-POINT 点到平面的距离
// ────────────────────────────────────────────────────
function DiaDistPoint() {
  return (
    <Dia>
      {/* 平面 α */}
      <polygon
        points="40,150 280,150 255,105 15,105"
        fill={BLUE_SOFT}
        stroke={INK}
        strokeWidth={SW}
      />
      <L x={284} y={148} size={12} color={MUTE}>
        α
      </L>
      {/* 点 P 与垂足 Q */}
      <circle cx={150} cy={50} r={3.5} fill={INK} />
      <L x={158} y={48} size={13} anchor="start">
        P
      </L>
      <line x1={150} y1={50} x2={150} y2={128} stroke={BLUE} strokeWidth={HW} />
      <circle cx={150} cy={128} r={3} fill={INK} />
      <L x={158} y={130} size={12} anchor="start">
        Q
      </L>
      {/* 垂直标记 */}
      <rect
        x={146}
        y={124}
        width={8}
        height={8}
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      {/* 距离 d */}
      <L x={142} y={92} size={13} color={BLUE} bold anchor="end">
        d
      </L>
      <L x={160} y={184} size={11} color={MUTE}>
        P 到 α 的垂线段 PQ 的长，即点 P 到平面 α 的距离
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  14. KP-SG-VOL 体积与表面积
// ────────────────────────────────────────────────────
function DiaVol() {
  return (
    <Dia>
      {/* 柱 */}
      <ellipse
        cx={60}
        cy={70}
        rx={28}
        ry={8}
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <line x1={32} y1={70} x2={32} y2={130} stroke={INK} strokeWidth={SW} />
      <line x1={88} y1={70} x2={88} y2={130} stroke={INK} strokeWidth={SW} />
      <path
        d="M32 130 A28 8 0 0 0 88 130"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <path
        d="M32 130 A28 8 0 0 1 88 130"
        fill="none"
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <L x={60} y={152} size={10}>
        柱 V=Sh
      </L>
      {/* 锥 */}
      <path
        d="M134 130 A28 8 0 0 0 190 130"
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <path
        d="M134 130 A28 8 0 0 1 190 130"
        fill="none"
        stroke={MUTE}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line x1={134} y1={130} x2={162} y2={62} stroke={INK} strokeWidth={SW} />
      <line x1={190} y1={130} x2={162} y2={62} stroke={INK} strokeWidth={SW} />
      <L x={162} y={152} size={10}>
        锥 V=¹⁄₃Sh
      </L>
      {/* 球 */}
      <circle
        cx={260}
        cy={100}
        r={36}
        fill={FACE}
        stroke={INK}
        strokeWidth={SW}
      />
      <ellipse
        cx={260}
        cy={100}
        rx={36}
        ry={12}
        fill="none"
        stroke={MUTE}
        strokeWidth={1}
      />
      <L x={260} y={152} size={10}>
        球 V=⁴⁄₃πr³
      </L>
    </Dia>
  );
}

// ────────────────────────────────────────────────────
//  15. KP-SG-VECTOR 空间向量
// ────────────────────────────────────────────────────
function DiaVector() {
  return (
    <Dia>
      {/* 坐标轴 */}
      <line x1={70} y1={150} x2={260} y2={150} stroke={INK} strokeWidth={1.2} />
      <line x1={70} y1={150} x2={70} y2={40} stroke={INK} strokeWidth={1.2} />
      <line x1={70} y1={150} x2={40} y2={175} stroke={INK} strokeWidth={1.2} />
      <L x={266} y={150} size={11} anchor="start">
        x
      </L>
      <L x={70} y={34} size={11}>
        z
      </L>
      <L x={34} y={182} size={11} anchor="end">
        y
      </L>
      {/* 向量 a */}
      <line
        x1={70}
        y1={150}
        x2={180}
        y2={70}
        stroke={BLUE}
        strokeWidth={HW}
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L7 3 L0 6 Z" fill={BLUE} />
        </marker>
      </defs>
      <circle cx={70} cy={150} r={2.5} fill={INK} />
      <L x={186} y={66} size={12} color={BLUE} bold anchor="start">
        a
      </L>
      {/* 法向量 n 与平面 */}
      <polygon
        points="150,150 235,150 220,115 135,115"
        fill={BLUE_SOFT}
        stroke={MUTE}
        strokeWidth={1}
      />
      <line
        x1={180}
        y1={130}
        x2={200}
        y2={92}
        stroke={BLUE}
        strokeWidth={1.4}
        strokeDasharray="4 3"
      />
      <L x={204} y={90} size={11} color={BLUE} anchor="start">
        n（法向量）
      </L>
      <L x={160} y={184} size={11} color={MUTE}>
        用坐标与法向量把几何问题转化为向量运算
      </L>
    </Dia>
  );
}

// ═══════════════════════════════════════════════════════
//  知识点内容表 —— code → { title, diagram, summary, keyPoints, formula }
// ═══════════════════════════════════════════════════════
export const KNOWLEDGE_CONTENT = {
  "KP-SG-ROOT": {
    title: "立体几何",
    diagram: <DiaRoot />,
    summary:
      "立体几何研究三维空间中几何图形的性质、度量和位置关系。它从认识常见的空间几何体出发，建立点、直线、平面之间的位置关系，进而解决空间角、空间距离、体积与表面积等度量问题，并可借助空间向量统一处理。",
    keyPoints: [
      "核心对象：点、直线、平面以及由它们围成的几何体",
      "两条主线：位置关系（平行 / 垂直）与度量计算（角、距离、体积）",
      "两种方法：综合法（判定定理 + 性质定理）与向量法（坐标化）",
    ],
  },
  "KP-SG-BASIC": {
    title: "空间几何体",
    diagram: <DiaBasic />,
    summary:
      "空间几何体由若干面围成。构成几何体的基本元素是面（F）、棱（E，面与面的交线）和顶点（V，棱与棱的交点）。理解这些元素及其关系是认识任何几何体的起点。",
    keyPoints: [
      "面：围成几何体的平面多边形或曲面",
      "棱：相邻两个面的交线",
      "顶点：棱与棱的公共交点",
      "多面体满足欧拉公式：V − E + F = 2",
    ],
  },
  "KP-SG-BASIC-POLY": {
    title: "多面体",
    diagram: <DiaPoly />,
    summary:
      "多面体是由若干平面多边形围成的几何体。常见的有棱柱（两底面全等且平行）、棱锥（一个底面、一个顶点）和棱台（棱锥被平行于底面的平面截去顶部）。它们是立体几何最基础的几何体。",
    keyPoints: [
      "棱柱：两底面全等且平行，侧棱平行",
      "棱锥：底面是多边形，侧面都是三角形，共一个顶点",
      "棱台：棱锥被平行于底面的平面截去锥顶后剩余部分",
      "正棱柱 / 正棱锥 / 正棱台：底面为正多边形且顶点在底面的射影为底面中心",
    ],
  },
  "KP-SG-BASIC-REV": {
    title: "旋转体",
    diagram: <DiaRev />,
    summary:
      "旋转体是由一个平面图形绕它所在平面内的一条定直线（旋转轴）旋转一周所形成的几何体。常见的有圆柱、圆锥、圆台和球。掌握“母线 + 旋转轴”的生成方式，是理解其性质与公式的关键。",
    keyPoints: [
      "圆柱：矩形绕一边旋转而成，母线 = 高",
      "圆锥：直角三角形绕一直角边旋转而成，母线 l、高 h、底面半径 r 满足 l² = r² + h²",
      "圆台：直角梯形绕垂直于底的腰旋转而成",
      "球：半圆绕直径旋转而成，截面都是圆",
    ],
  },
  "KP-SG-POS": {
    title: "空间点线面位置关系",
    diagram: <DiaPos />,
    summary:
      "在空间中，点、直线、平面之间存在确定的位置关系：点在/不在直线上、点在/不在平面内；直线与直线（相交、平行、异面）、直线与平面（在面内、相交、平行）、平面与平面（相交、平行）。这是所有空间推理的基础。",
    keyPoints: [
      "直线与直线：相交、平行、异面（既不相交也不平行）",
      "直线与平面：直线在平面内、相交、平行",
      "平面与平面：相交、平行",
      "判定位置关系常用公理 1、公理 2（确定平面的条件）及推论",
    ],
  },
  "KP-SG-POS-PARA": {
    title: "平行关系",
    diagram: <DiaPara />,
    summary:
      "空间中的平行关系分三类：线线平行、线面平行、面面平行。它们各有判定定理与性质定理，并能相互转化——这是解决平行证明题的基本套路。",
    keyPoints: [
      "线面平行判定：平面外一条直线与平面内一条直线平行 ⇒ 该直线与平面平行",
      "线面平行性质：若直线与平面平行，则过该直线的平面与已知平面的交线与该直线平行",
      "面面平行判定：一个平面内两相交直线分别平行于另一平面 ⇒ 两面平行",
      "面面平行性质：两面平行 ⇒ 它们的交线（与第三平面）平行",
    ],
  },
  "KP-SG-POS-PERP": {
    title: "垂直关系",
    diagram: <DiaPerp />,
    summary:
      "空间垂直关系分线线垂直、线面垂直、面面垂直三类。线面垂直是核心——它是连接线线垂直与面面垂直的桥梁。掌握判定与性质定理，是证明垂直问题的关键。",
    keyPoints: [
      "线面垂直判定：一条直线与平面内两条相交直线都垂直 ⇒ 该直线垂直于该平面",
      "线面垂直性质：垂直于同一平面的两直线平行；垂线段最短",
      "面面垂直判定：一平面经过另一平面的一条垂线 ⇒ 两面垂直",
      "面面垂直性质：两面垂直，在一个面内垂直于交线的直线垂直于另一平面",
    ],
  },
  "KP-SG-ANGLE": {
    title: "空间角",
    diagram: <DiaAngle />,
    summary:
      "空间角刻画空间中几何对象之间的倾斜程度，主要包括三类：异面直线所成角、直线与平面所成角、二面角。它们的共同思路是“空间角平面化”——把空间角转化为平面上的角来求解。",
    keyPoints: [
      "异面直线角：平移使相交，范围 0° ~ 90°",
      "线面角：斜线与它在平面内射影的夹角，范围 0° ~ 90°",
      "二面角：用它的平面角度量，范围 0° ~ 180°",
      "通用方法：几何法（找/作平面角）或向量法（夹角公式）",
    ],
  },
  "KP-SG-ANGLE-LINE": {
    title: "异面直线夹角",
    diagram: <DiaAngleLine />,
    summary:
      "两条异面直线 a、b 所成角的定义：在空间任取一点 O，把 a、b 分别平移到经过 O，得到两条相交直线 a′、b′，它们所成的锐角（或直角）即为 a、b 的夹角，范围 0° ≤ θ ≤ 90°。平移是求解的核心动作。",
    keyPoints: [
      "平移后“交点”可任选，结果唯一（与 O 位置无关）",
      "范围 0° ~ 90°，取锐角或直角",
      "几何法：常借助平行四边形或中位线完成平移",
      "向量法：cos θ = |a·b| / (|a||b|)，取绝对值保证锐角",
    ],
  },
  "KP-SG-ANGLE-LINE-PLANE": {
    title: "线面角",
    diagram: <DiaAngleLinePlane />,
    summary:
      "直线 AB 与平面 α 所成角：若 AB 是斜线，B 为斜足（AB ∩ α = B），A 在 α 内的射影为 A′，则 ∠ABA′ 即为线面角。它等于斜线与它在平面内射影的夹角，范围 0° ≤ θ ≤ 90°。垂线垂直于平面时为 90°，线在面内或平行时为 0°。",
    keyPoints: [
      "关键是找“斜足 + 射影”，得到直角三角形",
      "射影 = 过线上一点向平面作垂线，连接垂足与斜足",
      "范围 0° ~ 90°",
      "向量法：sin θ = |v·n| / (|v||n|)，n 为平面法向量",
    ],
  },
  "KP-SG-ANGLE-DIHEDRAL": {
    title: "二面角",
    diagram: <DiaDihedral />,
    summary:
      "从一条直线出发的两个半平面所组成的图形叫二面角，这条直线叫二面角的棱。二面角的大小用它的“平面角”度量：在棱上任取一点 O，在两个半平面内分别作棱的垂线，这两条垂线所成的角即为二面角的平面角，范围 0° ≤ θ ≤ 180°。",
    keyPoints: [
      "平面角的两边都垂直于棱，且在同一垂直于棱的截面内",
      "定义法：直接找/作平面角",
      "三垂线法：利用三垂线定理构造平面角",
      "向量法：两半平面法向量夹角，注意与二面角的互补关系",
    ],
  },
  "KP-SG-DIST": {
    title: "空间距离",
    diagram: <DiaDist />,
    summary:
      "空间距离的本质都是“垂线段的长”。常见类型包括：点到直线的距离、点到平面的距离、平行线间距离、异面直线间距离、直线到平面（平行时）的距离、两平行平面间距离。它们都可转化为“点到平面（或直线）的距离”来求。",
    keyPoints: [
      "点到面：垂线段的长",
      "线到面（平行）：线上任一点到平面的距离",
      "面到面（平行）：一个面上任一点到另一面的距离",
      "异面直线距离：公垂线段的长，常用向量法 d = |AB·n| / |n|",
    ],
  },
  "KP-SG-DIST-POINT": {
    title: "点到平面的距离",
    diagram: <DiaDistPoint />,
    summary:
      "点 P 到平面 α 的距离：过 P 作 α 的垂线，垂足为 Q，则线段 PQ 的长即为距离。常用两种求法：① 直接法，找到垂足构造直角三角形；② 等体积法，利用三棱锥体积相等列方程反求高（即距离）。",
    keyPoints: [
      "直接法：找/作 P 到平面的垂线段",
      "等体积法：V = ¹⁄₃ S h 中换底换高，反求距离",
      "向量法：d = |PQ⃗·n| / |n|，n 为平面法向量",
      "点到面的距离 = 以该点为顶点、该面为底面的棱锥的高",
    ],
  },
  "KP-SG-VOL": {
    title: "体积与表面积",
    diagram: <DiaVol />,
    summary:
      "度量几何体的体积与表面积是立体几何的核心应用。柱体体积 V = Sh，锥体体积 V = ¹⁄₃Sh（锥是柱的三分之一），球体 V = ⁴⁄₃πr³、S = 4πr²。把握“柱—锥—台”的统一公式与割补、等积变换是关键。",
    keyPoints: [
      "柱：V = Sh（S 底面积，h 高）",
      "锥：V = ¹⁄₃Sh",
      "台：V = ¹⁄₃h(S₁ + S₂ + √(S₁S₂))，是柱与锥的统一公式",
      "球：V = ⁴⁄₃πr³，S = 4πr²",
      "常用技巧：割补法、等体积变换（同底等高体积相等）",
    ],
  },
  "KP-SG-VECTOR": {
    title: "空间向量",
    diagram: <DiaVector />,
    summary:
      "空间向量是解决立体几何问题的代数化工具。建立空间直角坐标系后，点、直线、平面都可用坐标与向量表示，于是平行、垂直、角、距离等问题都转化为向量运算（点乘、叉乘），从而避开复杂的几何作图。",
    keyPoints: [
      "坐标化：建系 → 写出点坐标 → 得到方向向量 / 法向量",
      "线线角：cos θ = |a·b| / (|a||b|)",
      "线面角：sin θ = |v·n| / (|v||n|)",
      "点到面距离：d = |PQ⃗·n| / |n|",
      "法向量是处理“面”相关问题的核心工具",
    ],
  },
};

// 兜底用的知识点种子数据（与 content/knowledge-graph/solid-geometry-seed.json 一致）
// 当后端 API 不可用时，知识图谱页用此渲染树形结构
export const KNOWLEDGE_SEED = [
  {
    id: "KP-SG-ROOT",
    code: "KP-SG-ROOT",
    name: "立体几何",
    category: "立体几何",
    sub_category: null,
    description: "立体几何是研究三维空间中几何图形的性质、度量和位置关系的分支",
    importance: 5,
    lft: 1,
    rgt: 28,
    depth: 0,
  },
  {
    id: "KP-SG-BASIC",
    code: "KP-SG-BASIC",
    name: "空间几何体",
    category: "立体几何",
    sub_category: "基础概念",
    description: "认识常见的空间几何体及其基本元素",
    importance: 4,
    lft: 2,
    rgt: 7,
    depth: 1,
  },
  {
    id: "KP-SG-BASIC-POLY",
    code: "KP-SG-BASIC-POLY",
    name: "多面体",
    category: "立体几何",
    sub_category: "基础概念",
    description: "棱柱、棱锥、棱台等由平面多边形围成的几何体",
    importance: 4,
    lft: 3,
    rgt: 4,
    depth: 2,
  },
  {
    id: "KP-SG-BASIC-REV",
    code: "KP-SG-BASIC-REV",
    name: "旋转体",
    category: "立体几何",
    sub_category: "基础概念",
    description: "圆柱、圆锥、圆台、球等由平面图形绕轴旋转形成的几何体",
    importance: 4,
    lft: 5,
    rgt: 6,
    depth: 2,
  },
  {
    id: "KP-SG-POS",
    code: "KP-SG-POS",
    name: "空间点线面位置关系",
    category: "立体几何",
    sub_category: "位置关系",
    description: "空间中点、直线、平面之间的平行、垂直、相交等位置关系",
    importance: 5,
    lft: 8,
    rgt: 13,
    depth: 1,
  },
  {
    id: "KP-SG-POS-PARA",
    code: "KP-SG-POS-PARA",
    name: "平行关系",
    category: "立体几何",
    sub_category: "位置关系",
    description: "线线平行、线面平行、面面平行的判定与性质",
    importance: 5,
    lft: 9,
    rgt: 10,
    depth: 2,
  },
  {
    id: "KP-SG-POS-PERP",
    code: "KP-SG-POS-PERP",
    name: "垂直关系",
    category: "立体几何",
    sub_category: "位置关系",
    description: "线线垂直、线面垂直、面面垂直的判定与性质",
    importance: 5,
    lft: 11,
    rgt: 12,
    depth: 2,
  },
  {
    id: "KP-SG-ANGLE",
    code: "KP-SG-ANGLE",
    name: "空间角",
    category: "立体几何",
    sub_category: "度量计算",
    description: "空间中线与线、线与面、面与面之间夹角的计算",
    importance: 5,
    lft: 14,
    rgt: 19,
    depth: 1,
  },
  {
    id: "KP-SG-ANGLE-LINE",
    code: "KP-SG-ANGLE-LINE",
    name: "异面直线夹角",
    category: "立体几何",
    sub_category: "度量计算",
    description: "通过平移法或向量法计算异面直线所成的角",
    importance: 5,
    lft: 15,
    rgt: 16,
    depth: 2,
  },
  {
    id: "KP-SG-ANGLE-LINE-PLANE",
    code: "KP-SG-ANGLE-LINE-PLANE",
    name: "线面角",
    category: "立体几何",
    sub_category: "度量计算",
    description: "直线与平面所成角的定义与计算（斜线与射影的夹角）",
    importance: 5,
    lft: 17,
    rgt: 18,
    depth: 2,
  },
  {
    id: "KP-SG-ANGLE-DIHEDRAL",
    code: "KP-SG-ANGLE-DIHEDRAL",
    name: "二面角",
    category: "立体几何",
    sub_category: "度量计算",
    description:
      "两个平面所成二面角的定义、平面角求法（定义法/三垂线法/向量法）",
    importance: 5,
    lft: 19,
    rgt: 20,
    depth: 2,
  },
  {
    id: "KP-SG-DIST",
    code: "KP-SG-DIST",
    name: "空间距离",
    category: "立体几何",
    sub_category: "度量计算",
    description: "空间中点到线、点到面、线到面、面到面的距离计算",
    importance: 4,
    lft: 21,
    rgt: 24,
    depth: 1,
  },
  {
    id: "KP-SG-DIST-POINT",
    code: "KP-SG-DIST-POINT",
    name: "点到平面的距离",
    category: "立体几何",
    sub_category: "度量计算",
    description: "用垂线法或等体积法求点到平面的距离",
    importance: 4,
    lft: 22,
    rgt: 23,
    depth: 2,
  },
  {
    id: "KP-SG-VOL",
    code: "KP-SG-VOL",
    name: "体积与表面积",
    category: "立体几何",
    sub_category: "度量计算",
    description: "常见几何体的体积公式和表面积公式",
    importance: 4,
    lft: 25,
    rgt: 26,
    depth: 1,
  },
  {
    id: "KP-SG-VECTOR",
    code: "KP-SG-VECTOR",
    name: "空间向量",
    category: "立体几何",
    sub_category: "向量法",
    description: "用空间向量解决立体几何问题（坐标法、法向量等）",
    importance: 5,
    lft: 27,
    rgt: 28,
    depth: 1,
  },
];

// 前置关系（与种子一致）
export const KNOWLEDGE_PREREQ = [
  { knowledge: "KP-SG-POS-PARA", prerequisite: "KP-SG-BASIC" },
  { knowledge: "KP-SG-POS-PERP", prerequisite: "KP-SG-BASIC" },
  { knowledge: "KP-SG-ANGLE-LINE", prerequisite: "KP-SG-POS-PARA" },
  { knowledge: "KP-SG-ANGLE-LINE", prerequisite: "KP-SG-POS-PERP" },
  { knowledge: "KP-SG-ANGLE-LINE-PLANE", prerequisite: "KP-SG-ANGLE-LINE" },
  { knowledge: "KP-SG-ANGLE-DIHEDRAL", prerequisite: "KP-SG-ANGLE-LINE-PLANE" },
  { knowledge: "KP-SG-DIST-POINT", prerequisite: "KP-SG-POS-PERP" },
  { knowledge: "KP-SG-VOL", prerequisite: "KP-SG-BASIC" },
  { knowledge: "KP-SG-VECTOR", prerequisite: "KP-SG-ANGLE-LINE" },
  { knowledge: "KP-SG-VECTOR", prerequisite: "KP-SG-DIST-POINT" },
];

// 获取某知识点的内容（含前置与子节点，用于详情面板）
export function getKnowledgeContent(id) {
  const point = KNOWLEDGE_SEED.find((n) => n.id === id || n.code === id);
  const content = KNOWLEDGE_CONTENT[id];
  if (!point && !content) return null;
  const prerequisites = KNOWLEDGE_PREREQ.filter((r) => r.knowledge === id)
    .map((r) => KNOWLEDGE_SEED.find((n) => n.id === r.prerequisite))
    .filter(Boolean);
  const children = KNOWLEDGE_SEED.filter((n) => {
    const parent = KNOWLEDGE_SEED.find((p) => p.id === id);
    if (!parent) return false;
    return (
      n.lft > parent.lft && n.rgt < parent.rgt && n.depth === parent.depth + 1
    );
  });
  return {
    point: point || {
      id,
      code: id,
      name: content?.title || id,
      description: content?.summary || "",
    },
    content,
    prerequisites,
    children,
  };
}

export default KNOWLEDGE_CONTENT;

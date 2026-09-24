/**
 * 探索台 —— 知识点「立体几何·长方体」的实时交互页（§5.1 探索台 · 实时模式）。
 *
 * 与拍题侧的关系：这里零 AI 调用。页面的每一条读数都来自原语的 derived 声明，
 * 由引擎求值；3D 画面走 AnimationRenderer 的实时模式（无时钟，改参数即重画）。
 *
 * 铁律仍在：IR 必须先过 validateAnimationIR 才能到渲染器 —— 哪怕这条 IR 是
 * 本地按滑块拼出来的、根本不含 AI 产物（§8.7 / §9.1：离线来源照样过闸门）。
 *
 * 探索台是一条静态快照（duration 0、无 tracks、无 overlays），所以它拿到的是
 * PASS；这里不打算播时间轴，播放控制因此关掉。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §5.1 两种形态 / §9.1 可测的断言
 */

import { useCallback, useMemo, useState } from 'react';
import { ANIMATION_IR_VERSION, getPrimitive } from '../engines/animationIR/schema';
import { validateAnimationIR } from '../engines/animationIR/validate';
import { physicsGate } from '../engines/animationIR/physicsGate';
import { computeReadouts, formatNumber } from '../engines/animationIR/readouts';
import { CUBOID_LESSON_IR } from '../features/animation/cuboidLessonIR';
import { CUBOID_EXAMPLES } from '../features/animation/cuboidExamplesIR';
import AnimationRenderer from '../features/animation/AnimationRenderer';
import './ExplorePage.css';

const SCENE_ID = 'cuboid';
const SLIDER_STEP = 0.1;

/** 出题人挑的默认尺寸：3×4×5 三个维度互不相等，一眼能看出长宽高各是谁。 */
const DEFAULT_PARAMS = { a: 3, b: 4, c: 5 };

/** 读数/公式的展示名。derived 的 key 由原语定，这里只负责翻译成教材叫法。 */
const READOUT_META = {
  V: { label: '体积', symbol: 'V', unit: 'cm³' },
  S: { label: '表面积', symbol: 'S', unit: 'cm²' },
  diagonal: { label: '体对角线', symbol: 'd', unit: 'cm' },
};

function metaOf(key) {
  return READOUT_META[key] || { label: key, symbol: key, unit: '' };
}

/** 把原语里的表达式写成学生在课本上看到的样子（只做符号美化，不改算式）。 */
export function prettyFormula(expr) {
  return String(expr)
    .replace(/sqrt\(([^)]*)\)/g, '√($1)')
    .replace(/\s*\*\s*/g, ' × ')
    .replace(/\s*\/\s*/g, ' ÷ ');
}

/** 与 WorkspacePage 同一套探测写法：拿不到 WebGL 就不挂 Canvas。 */
function detectWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * 页面上屏前必须跑完的两道闸门（§4.2）。离线固化的人签字 IR 也一样，
 * 人审是加在闸门之后的签字，不是豁免它（§8.7 / §9.1）。
 */
function gateCheck(ir) {
  const structure = validateAnimationIR(ir);
  if (!structure.ok) {
    return { ok: false, reason: `结构校验未通过（${structure.code}）` };
  }
  const physics = physicsGate(ir);
  if (!physics.ok) {
    return { ok: false, reason: `物理复算未通过（${physics.code}）` };
  }
  return { ok: true, reason: null };
}

export default function ExplorePage() {
  const primitive = useMemo(() => getPrimitive(SCENE_ID), []);
  const slotKeys = useMemo(
    () => (primitive ? Object.keys(primitive.slots) : []),
    [primitive],
  );

  const [values, setValues] = useState(() => {
    const initial = {};
    if (primitive) {
      for (const key of Object.keys(primitive.slots)) {
        const slot = primitive.slots[key];
        initial[key] = DEFAULT_PARAMS[key] ?? (slot.min + slot.max) / 2;
      }
    }
    return initial;
  });

  const hasWebGL = useState(detectWebGL)[0];

  const handleSlotChange = useCallback((key, raw) => {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    setValues((prev) => ({ ...prev, [key]: next }));
  }, []);

  // 静态快照 IR：只有 params，没有时间轴。改滑块 → 换 params → 重新过闸门。
  const ir = useMemo(
    () => ({
      version: ANIMATION_IR_VERSION,
      scene: SCENE_ID,
      params: { ...values },
      duration: 0,
      tracks: [],
      overlays: [],
    }),
    [values],
  );

  const validation = useMemo(() => validateAnimationIR(ir), [ir]);
  const readouts = useMemo(() => computeReadouts(primitive, values), [primitive, values]);

  // 手写示范 IR 也不能直接进渲染器：当场再跑一遍同样的两道闸门（§8.7 / §9.1）。
  const lessonCheck = useMemo(() => gateCheck(CUBOID_LESSON_IR), []);

  // 教材例题同理：离线签过字，也只意味着「已经过了闸门」，不是「不用再过」。
  const exampleChecks = useMemo(
    () => CUBOID_EXAMPLES.map((example) => ({ ...example, check: gateCheck(example.ir) })),
    [],
  );

  let stage;
  if (!primitive) {
    stage = <p className="explore-stage-note">原语「{SCENE_ID}」未注册，无法渲染。</p>;
  } else if (!hasWebGL) {
    stage = (
      <p className="explore-stage-note">
        此设备暂不支持 3D 预览。
        <br />
        右侧读数与公式不受影响，照常可用。
      </p>
    );
  } else if (!validation.ok) {
    stage = (
      <p className="explore-stage-note">
        当前参数组合无法渲染（{validation.code}）。
        <br />
        右侧读数与公式不受影响，照常可用。
      </p>
    );
  } else {
    stage = (
      <AnimationRenderer
        ir={ir}
        mode="realtime"
        params={values}
        showControls={false}
        height="100%"
      />
    );
  }

  return (
    <div className="explore-page">
      <header className="explore-head">
        <p className="explore-kicker">知识点 · 立体几何</p>
        <h1 className="explore-title">长方体探索台</h1>
        <p className="explore-sub">
          拖动长、宽、高，实时看体积、表面积与体对角线怎么变。
        </p>
      </header>

      <div className="explore-body">
        <section className="explore-stage" aria-label="长方体 3D 预览">
          {stage}
        </section>

        <aside className="explore-panel">
          <section className="explore-block">
            <h2 className="explore-block-title">调参数</h2>
            {slotKeys.map((key) => {
              const slot = primitive.slots[key];
              const name = slot.label || key;
              return (
                <label className="explore-slider" key={key}>
                  <span className="explore-slider-head">
                    <span className="explore-slider-name">{name}</span>
                    <span className="explore-slider-value">
                      {formatNumber(values[key], 1)} {slot.unit}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={slot.min}
                    max={slot.max}
                    step={SLIDER_STEP}
                    value={values[key]}
                    aria-label={`${name}（${slot.unit}）`}
                    onChange={(event) => handleSlotChange(key, event.target.value)}
                  />
                </label>
              );
            })}
            <p className="explore-tip">试试把长、宽、高都调成 2 倍，看体积变成几倍。</p>
          </section>

          <section className="explore-block">
            <h2 className="explore-block-title">读数表</h2>
            {readouts.error ? (
              <p className="explore-note">{readouts.error}</p>
            ) : (
              <ul className="explore-readouts">
                {Object.keys(readouts.formulas).map((key) => {
                  const meta = metaOf(key);
                  const failed = readouts.failures.some((item) => item.key === key);
                  return (
                    <li className="explore-readout" key={key}>
                      <span className="explore-readout-name">
                        {meta.label} {meta.symbol}
                      </span>
                      <span
                        className={`explore-readout-value${failed ? ' is-failed' : ''}`}
                      >
                        {failed ? '算不出' : formatNumber(readouts.values[key])}
                        {!failed && meta.unit ? (
                          <em className="explore-readout-unit">{meta.unit}</em>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="explore-block">
            <h2 className="explore-block-title">公式面板</h2>
            <ul className="explore-formulas">
              {Object.entries(readouts.formulas).map(([key, formula]) => (
                <li className="explore-formula" key={key}>
                  <code className="explore-formula-body">
                    {metaOf(key).symbol} = {prettyFormula(formula)}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="explore-demo" aria-label="示范动画">
        <div className="explore-demo-head">
          <h2 className="explore-demo-title">示范动画：体积随长、宽、高变化</h2>
          <p className="explore-demo-sub">
            长 2→4、宽 2→3、高 2→5 依次展开，体积从 8 涨到 60。
          </p>
        </div>
        <div className="explore-demo-stage">
          {lessonCheck.ok && hasWebGL ? (
            <AnimationRenderer ir={CUBOID_LESSON_IR} mode="timeline" height="100%" />
          ) : (
            <p className="explore-stage-note">
              {hasWebGL
                ? `示范动画暂时无法播放（${lessonCheck.reason}）。`
                : '此设备暂不支持 3D 预览。'}
            </p>
          )}
        </div>
      </section>

      <section className="explore-demo" aria-label="教材例题">
        <div className="explore-demo-head">
          <h2 className="explore-demo-title">教材例题</h2>
          <p className="explore-demo-sub">
            两道例题各自挂一条人手写、人签字的 IR，上屏前照样过同一套闸门。
          </p>
        </div>
      </section>

      {exampleChecks.map((example) => (
        <section className="explore-demo" key={example.id} aria-label={example.title}>
          <div className="explore-demo-head">
            <h3 className="explore-demo-title">{example.title}</h3>
            <p className="explore-demo-sub">{example.summary}</p>
          </div>
          <div className="explore-demo-stage">
            {example.check.ok && hasWebGL ? (
              <AnimationRenderer ir={example.ir} mode="timeline" height="100%" />
            ) : (
              <p className="explore-stage-note">
                {hasWebGL
                  ? `例题动画暂时无法播放（${example.check.reason}）。`
                  : '此设备暂不支持 3D 预览。'}
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

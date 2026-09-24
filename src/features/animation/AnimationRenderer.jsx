import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import { sampleAnimationIR } from '../../engines/animationController';
import {
  advanceClock,
  createClockState,
  seekClock,
  setClockPlaying,
  setClockRate,
} from '../../engines/animationIR/clock';
import { getPrimitiveComponent } from './primitives';

const RATE_OPTIONS = [0.5, 1, 1.5, 2];
const BACKGROUND = '#f4f6f8';
const LABEL_INK = '#1f2430';
const LABEL_HALO = '#f4f6f8';

const ROOT_STYLE = { position: 'relative', width: '100%', overflow: 'hidden' };
const CANVAS_STYLE = { width: '100%', height: '100%' };
const BAR_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.86)',
  backdropFilter: 'blur(6px)',
  borderTop: '1px solid rgba(31, 36, 48, 0.1)',
  font: '13px/1.4 system-ui, sans-serif',
  color: LABEL_INK,
};
const BUTTON_STYLE = {
  minWidth: '64px',
  padding: '6px 12px',
  border: '1px solid rgba(31, 36, 48, 0.18)',
  borderRadius: '6px',
  background: '#fff',
  color: LABEL_INK,
  cursor: 'pointer',
};
const RANGE_STYLE = { flex: 1, minWidth: '80px', accentColor: '#4D6BFE' };
const READOUT_STYLE = {
  minWidth: '104px',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  color: 'rgba(31, 36, 48, 0.72)',
};

/** IR 里出现的最大尺寸（含关键帧极值）—— 用于一次性取景，不逐帧动相机。 */
function maxDimension(ir) {
  let max = 0;
  const consider = (value) => {
    const n = Number(value);
    if (Number.isFinite(n)) max = Math.max(max, Math.abs(n));
  };
  Object.values(ir?.params || {}).forEach(consider);
  for (const track of ir?.tracks || []) {
    for (const key of track?.keys || []) consider(key?.v);
  }
  return max;
}

/** 只在尺寸基准变化时把相机摆到等轴测位置；绝不逐帧覆盖用户手动旋转。 */
function CameraRig({ view }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(view * 1.3, view * 1.3, view * 2.0);
    camera.lookAt(0, 0, 0);
  }, [camera, view]);
  return null;
}

function AnimationScene({
  ir, mode, boundParams, overlays, duration, view,
  clockRef, primitiveRef, overlayRefs, progressRefs, onStopped,
}) {
  const Primitive = getPrimitiveComponent(ir.scene);

  // 唯一的绘制路径：把某一帧的参数与时间落到原语与标注上。
  // 时间轴模式由 useFrame 每帧调用；实时模式由参数变化触发一次。
  const paint = useCallback((sampled, time) => {
    const primitive = primitiveRef.current;
    if (primitive) primitive.applyParams(sampled);

    const lift = view * 0.04;
    overlays.forEach((overlay, index) => {
      const group = overlayRefs.current.get(index);
      if (!group) return;
      const pos = primitive ? primitive.resolveAnchor(overlay.anchor) : null;
      if (!pos) {
        group.visible = false;
        return;
      }
      // 沿「原点 → 锚点」方向轻微外移，避免压在几何体表面上
      group.position.set(pos[0] * 1.12, pos[1] * 1.12 + lift, pos[2] * 1.12);
      const from = Number.isFinite(overlay.from) ? overlay.from : -Infinity;
      const to = Number.isFinite(overlay.to) ? overlay.to : Infinity;
      group.visible = time >= from && time <= to;
    });

    // 读数与进度条命令式写入，不走 React state（否则播放时每帧重渲染）
    const rangeEl = progressRefs.range?.current;
    if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = String(time);
    const timeEl = progressRefs.time?.current;
    if (timeEl) timeEl.textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`;
  }, [overlays, primitiveRef, overlayRefs, progressRefs, duration, view]);

  useFrame((_, delta) => {
    if (mode !== 'timeline') return;
    const before = clockRef.current;
    const next = advanceClock(before, delta);
    clockRef.current = next;
    if (before.playing && !next.playing) onStopped();
    const { params: sampled } = sampleAnimationIR(ir, next.time);
    paint(sampled, next.time);
  });

  // 实时模式：无时钟，参数一变就重画
  useEffect(() => {
    if (mode !== 'realtime') return;
    paint(boundParams, 0);
  }, [mode, boundParams, paint]);

  if (!Primitive) return null;

  const fontSize = Math.max(view * 0.09, 0.12);

  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 6]} intensity={1.05} />
      <directionalLight position={[-6, -4, -5]} intensity={0.35} />
      <CameraRig view={view} />

      <Primitive ref={primitiveRef} params={boundParams} />

      {overlays.map((overlay, index) => (
        <group
          key={`overlay-${index}`}
          ref={(el) => {
            if (el) {
              el.visible = false;
              overlayRefs.current.set(index, el);
            } else {
              overlayRefs.current.delete(index);
            }
          }}
        >
          <Billboard follow>
            <Text
              fontSize={fontSize}
              color={LABEL_INK}
              anchorX="center"
              anchorY="middle"
              outlineWidth={fontSize * 0.08}
              outlineColor={LABEL_HALO}
              depthTest={false}
              transparent
            >
              {overlay.text}
            </Text>
          </Billboard>
        </group>
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        zoomSpeed={0.8}
        minDistance={view * 0.8}
        maxDistance={view * 10}
      />
    </>
  );
}

/**
 * 可信渲染器 —— 同一套原语、同一条采样管道，两种模式：
 *   时间轴模式：读 IR 的 tracks，由内部唯一时钟（useFrame 的 delta 累加）驱动。
 *   实时模式  ：无时钟，直接绑定 params（探索台用），改参数即重画。
 * 渲染器是纯函数：同一 IR + 同一 t 永远画出同一帧。
 *
 * 调用方须先让 IR 通过 validateAnimationIR；本组件不再做校验。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §3.3 两种模式 / §3.4
 */
const AnimationRenderer = memo(function AnimationRenderer({
  ir,
  mode = 'timeline',
  params,
  autoPlay = true,
  loop = true,
  showControls = true,
  height = 420,
}) {
  const isTimeline = mode === 'timeline';
  const duration = Number.isFinite(ir?.duration) ? Math.max(ir.duration, 0) : 0;

  const clockRef = useRef(null);
  if (clockRef.current === null) {
    clockRef.current = createClockState(duration, { playing: isTimeline && autoPlay, loop });
  }

  const [playing, setPlaying] = useState(isTimeline && autoPlay);
  const [rate, setRate] = useState(1);

  const primitiveRef = useRef(null);
  const overlayRefs = useRef(new Map());
  const rangeRef = useRef(null);
  const timeRef = useRef(null);
  const progressRefs = useMemo(() => ({ range: rangeRef, time: timeRef }), []);

  // 换题（ir 或时长变化）时重置时钟并回到起点
  useEffect(() => {
    if (!isTimeline) return;
    clockRef.current = createClockState(duration, { playing: autoPlay, rate: clockRef.current.rate, loop });
    setPlaying(autoPlay);
    if (rangeRef.current) rangeRef.current.value = '0';
  }, [duration, ir, isTimeline, autoPlay, loop]);

  const overlays = useMemo(
    () => (Array.isArray(ir?.overlays) ? ir.overlays.filter((o) => o && typeof o.text === 'string') : []),
    [ir],
  );

  const baseParams = useMemo(() => ({ ...(ir?.params || {}) }), [ir]);
  const boundParams = useMemo(
    () => (isTimeline ? baseParams : { ...baseParams, ...(params || {}) }),
    [isTimeline, baseParams, params],
  );

  const view = useMemo(() => {
    const max = maxDimension(ir);
    return max > 0 ? max : 2;
  }, [ir]);

  const togglePlaying = useCallback(() => {
    const next = !clockRef.current.playing;
    clockRef.current = setClockPlaying(clockRef.current, next);
    setPlaying(next);
  }, []);

  const handleSeek = useCallback((event) => {
    clockRef.current = seekClock(clockRef.current, Number(event.target.value));
  }, []);

  const handleRate = useCallback((event) => {
    const next = Number(event.target.value);
    clockRef.current = setClockRate(clockRef.current, next);
    setRate(next);
  }, []);

  const handleStopped = useCallback(() => setPlaying(false), []);

  if (!ir) {
    return <div style={{ ...ROOT_STYLE, height }} />;
  }

  return (
    <div style={{ ...ROOT_STYLE, height }}>
      <Canvas
        style={CANVAS_STYLE}
        camera={{ position: [4, 4, 6], fov: 50 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <AnimationScene
          ir={ir}
          mode={mode}
          boundParams={boundParams}
          overlays={overlays}
          duration={duration}
          view={view}
          clockRef={clockRef}
          primitiveRef={primitiveRef}
          overlayRefs={overlayRefs}
          progressRefs={progressRefs}
          onStopped={handleStopped}
        />
      </Canvas>

      {isTimeline && showControls && (
        <div style={BAR_STYLE}>
          <button type="button" style={BUTTON_STYLE} onClick={togglePlaying}>
            {playing ? '暂停' : '播放'}
          </button>
          <input
            ref={rangeRef}
            type="range"
            min={0}
            max={duration}
            step={0.01}
            defaultValue={0}
            style={RANGE_STYLE}
            aria-label="动画进度"
            onChange={handleSeek}
          />
          <span ref={timeRef} style={READOUT_STYLE}>{`0.00 / ${duration.toFixed(2)} s`}</span>
          <select value={rate} onChange={handleRate} aria-label="播放速度" style={BUTTON_STYLE}>
            {RATE_OPTIONS.map((option) => (
              <option key={option} value={option}>{`${option}×`}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
});

export default AnimationRenderer;

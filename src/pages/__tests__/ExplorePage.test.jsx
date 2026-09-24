import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExplorePage from '../ExplorePage.jsx';

// 渲染器本身依赖 three / @react-three/fiber，jsdom 里跑不动也没必要跑。
// 这里只关心 ExplorePage 把什么交给了渲染器、以及读数/公式算得对不对。
vi.mock('../../features/animation/AnimationRenderer', () => ({
  default: ({ ir, mode, showControls, height }) => (
    <div
      data-testid="renderer"
      data-mode={mode}
      data-scene={ir?.scene}
      data-duration={ir?.duration}
      data-tracks={ir?.tracks?.length}
      data-overlays={ir?.overlays?.length}
      data-controls={String(showControls)}
      data-height={height}
    />
  ),
}));

/** 让 WebGL 探测通过，从而走到「挂渲染器」那条分支。 */
let getContextSpy;

beforeEach(() => {
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({});
});

afterEach(() => {
  getContextSpy.mockRestore();
});

function renderPage() {
  return render(<ExplorePage />);
}

function readoutValues(container) {
  return Array.from(container.querySelectorAll('.explore-readout-value')).map(
    (el) => el.textContent,
  );
}

describe('ExplorePage · §5.1 探索台（实时模式）', () => {
  it('按原语槽位生成三个滑块，标着教材叫法', () => {
    renderPage();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
    expect(screen.getByLabelText('长（cm）')).toBeInTheDocument();
    expect(screen.getByLabelText('宽（cm）')).toBeInTheDocument();
    expect(screen.getByLabelText('高（cm）')).toBeInTheDocument();
  });

  it('读数表来自 derived：3×4×5 → V 60 / S 94 / d 7.07', () => {
    const { container } = renderPage();
    const values = readoutValues(container);
    expect(values[0]).toContain('60');
    expect(values[0]).toContain('cm³');
    expect(values[1]).toContain('94');
    expect(values[1]).toContain('cm²');
    expect(values[2]).toContain('7.07');
    expect(container.textContent).not.toContain('算不出');
  });

  it('公式面板显示的是原语声明，只做符号美化', () => {
    const { container } = renderPage();
    const text = container.textContent;
    expect(text).toContain('V = a × b × c');
    expect(text).toContain('S = 2 × (a × b + b × c + a × c)');
    expect(text).toContain('d = √(a × a + b × b + c × c)');
  });

  it('拖滑块即时改读数：长 3 → 6，V 立刻变 120', () => {
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText('长（cm）'), { target: { value: '6' } });
    expect(readoutValues(container)[0]).toContain('120');
  });

  it('交给渲染器的是一条 duration 0、无 tracks、无 overlays 的静态快照', () => {
    const { container } = renderPage();
    const stage = container.querySelectorAll('[data-testid="renderer"]')[0];
    expect(stage.dataset.mode).toBe('realtime');
    expect(stage.dataset.duration).toBe('0');
    expect(stage.dataset.tracks).toBe('0');
    expect(stage.dataset.overlays).toBe('0');
    expect(stage.dataset.controls).toBe('false');
    expect(stage.dataset.height).toBe('100%');
  });
});

describe('ExplorePage · §5.1 示范动画（时间轴模式）', () => {
  it('示范 IR 过完两道闸门才上屏，且以 timeline 模式交给渲染器', () => {
    const { container } = renderPage();
    const demo = container.querySelectorAll('[data-testid="renderer"]')[1];
    expect(demo).toBeTruthy();
    expect(demo.dataset.mode).toBe('timeline');
    expect(demo.dataset.scene).toBe('cuboid');
    expect(demo.dataset.duration).toBe('6');
    expect(container.textContent).toContain('示范动画');
    expect(container.textContent).not.toContain('示范动画暂时无法播放');
  });

  it('示范区文案交代了主线的起止体积', () => {
    const { container } = renderPage();
    expect(container.textContent).toContain('体积从 8 涨到 60');
  });
});

describe('ExplorePage · §5.1 / §5.2 下挂教材例题', () => {
  it('两道例题各自以 timeline 模式上屏，场景/时长/轨道/标注都对得上', () => {
    const { container } = renderPage();
    const renderers = container.querySelectorAll('[data-testid="renderer"]');
    // 探索台 + 示范动画 + 例题一 + 例题二
    expect(renderers).toHaveLength(4);
    for (const el of [renderers[2], renderers[3]]) {
      expect(el.dataset.mode).toBe('timeline');
      expect(el.dataset.scene).toBe('cuboid');
      expect(el.dataset.duration).toBe('4');
      expect(el.dataset.tracks).toBe('3');
      expect(el.dataset.overlays).toBe('4');
    }
  });

  it('分区标题与两道题面都摆在页面上', () => {
    const { container } = renderPage();
    expect(container.textContent).toContain('教材例题');
    expect(container.textContent).toContain('例题一：求体积');
    expect(container.textContent).toContain('例题二：求体对角线');
    expect(container.textContent).toContain('体积从 1 涨到 60');
    expect(container.textContent).toContain('体对角线恰好是 7');
  });

  it('例题过完闸门才上屏：没有一条落在降级提示语上', () => {
    const { container } = renderPage();
    expect(container.textContent).not.toContain('例题动画暂时无法播放');
  });

  it('无 WebGL 时两道例题也退成提示语，不静默换成别的动画', () => {
    getContextSpy.mockReturnValue(null);
    const { container } = renderPage();
    expect(container.querySelectorAll('[data-testid="renderer"]')).toHaveLength(0);
    expect(screen.getAllByText('此设备暂不支持 3D 预览。')).toHaveLength(3);
  });
});

describe('ExplorePage · §4.3 失败降级，不做静默替换', () => {
  it('拿不到 WebGL 时退成提示语，读数与公式照常可用', () => {
    getContextSpy.mockReturnValue(null);
    const { container } = renderPage();
    expect(container.querySelectorAll('[data-testid="renderer"]')).toHaveLength(0);
    expect(container.textContent).toContain('此设备暂不支持 3D 预览');
    expect(container.textContent).toContain('右侧读数与公式不受影响');
    expect(readoutValues(container)[0]).toContain('60');
  });
});

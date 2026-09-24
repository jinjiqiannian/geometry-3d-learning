import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANIMATE_CODE, requestAnimation, reportWrongAnimation } from '../animatePipeline';
import {
  __resetCacheBackend,
  clearAnimationCache,
  makeCacheKey,
  readCache,
  setInvalidateThreshold,
  writeCache,
} from '../animationCache';

const TEXT = '正方体棱长为 2，求体积';

const SCENE_IR = { scene: 'cuboid', params: { a: 2, b: 2, c: 2 }, size: 2 };

const VALID_IR = {
  version: 1,
  scene: 'cuboid',
  params: { a: 2, b: 2, c: 2 },
  duration: 4,
  tracks: [{ slot: 'a', keys: [{ t: 0, v: 2 }, { t: 4, v: 4 }] }],
  overlays: [{ kind: 'label', text: 'V = a*b*c', anchor: 'center', from: 0, to: 4 }],
};

const KEY = makeCacheKey(TEXT, SCENE_IR.params);

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function aiReturning(ir) {
  return vi.fn(async () => jsonResponse({ success: true, ir }));
}

function baseOptions(extra = {}) {
  return {
    text: TEXT,
    sceneIR: SCENE_IR,
    explainIR: { steps: [] },
    baseUrl: 'http://test',
    ...extra,
  };
}

beforeEach(async () => {
  __resetCacheBackend();
  await clearAnimationCache();
  setInvalidateThreshold(3);
});

describe('requestAnimation — 缓存优先', () => {
  it('命中缓存则 0 次 AI 调用', async () => {
    await writeCache(KEY, VALID_IR);
    const fetchImpl = vi.fn(async () => {
      throw new Error('不应该被调用');
    });

    const res = await requestAnimation(baseOptions({ fetchImpl }));
    expect(res.ok).toBe(true);
    expect(res.source).toBe('cache');
    expect(res.ir).toEqual(VALID_IR);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('未命中缓存才调 AI，并把通过双闸门的 IR 写回缓存', async () => {
    const fetchImpl = aiReturning(VALID_IR);

    const res = await requestAnimation(baseOptions({ fetchImpl }));
    expect(res.ok).toBe(true);
    expect(res.source).toBe('ai');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const hit = await readCache(KEY);
    expect(hit?.ir).toEqual(VALID_IR);

    const second = await requestAnimation(baseOptions({ fetchImpl }));
    expect(second.source).toBe('cache');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('requestAnimation — 降级分支（绝不交出 ir）', () => {
  it('未注册原语 → NO_PRIMITIVE，不发请求', async () => {
    const fetchImpl = vi.fn();
    const res = await requestAnimation(
      baseOptions({ fetchImpl, sceneIR: { scene: 'capacitor', params: {} } })
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe(ANIMATE_CODE.NO_PRIMITIVE);
    expect(res.ir).toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('HTTP 非 2xx → NETWORK', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'boom' }, { ok: false, status: 500 }));
    const res = await requestAnimation(baseOptions({ fetchImpl }));
    expect(res.ok).toBe(false);
    expect(res.code).toBe(ANIMATE_CODE.NETWORK);
    expect(res.reason).toBe('boom');
    expect(await readCache(KEY)).toBeNull();
  });

  it('网络抛错 → NETWORK', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const res = await requestAnimation(baseOptions({ fetchImpl }));
    expect(res.code).toBe(ANIMATE_CODE.NETWORK);
    expect(res.reason).toBe('offline');
  });

  it('服务端 success:false → UNPARSEABLE（§4.3 第一行）', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false, error: '动画 IR 生成返回不可解析内容' }));
    const res = await requestAnimation(baseOptions({ fetchImpl }));
    expect(res.code).toBe(ANIMATE_CODE.UNPARSEABLE);
    expect(await readCache(KEY)).toBeNull();
  });

  it('结构校验不过 → BAD_STRUCTURE，且不写缓存（§9：唯一通路）', async () => {
    const badIR = { ...VALID_IR, tracks: [{ slot: 'z', keys: [{ t: 0, v: 1 }, { t: 1, v: 2 }] }] };
    const res = await requestAnimation(baseOptions({ fetchImpl: aiReturning(badIR) }));
    expect(res.ok).toBe(false);
    expect(res.code).toBe(ANIMATE_CODE.BAD_STRUCTURE);
    expect(res.gatewayCode).toBe('UNKNOWN_SLOT');
    expect(res.ir).toBeUndefined();
    expect(await readCache(KEY)).toBeNull();
  });

  it('物理复算不一致 → PHYSICS，带出不一致的具体量', async () => {
    const res = await requestAnimation(
      baseOptions({
        fetchImpl: aiReturning(VALID_IR),
        relations: [{ dependent: 'V', drivers: ['a'], direction: 'opposite' }],
      })
    );
    expect(res.ok).toBe(false);
    expect(res.code).toBe(ANIMATE_CODE.PHYSICS);
    expect(res.gatewayCode).toBe('RELATION_VIOLATED');
    expect(Array.isArray(res.mismatches)).toBe(true);
    expect(res.mismatches.length).toBeGreaterThan(0);
    expect(await readCache(KEY)).toBeNull();
  });

  it('AbortError 原样抛出，不吞成降级', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchImpl = vi.fn(async () => {
      throw abortErr;
    });
    await expect(requestAnimation(baseOptions({ fetchImpl }))).rejects.toThrow('aborted');
  });

  it('环境无 fetch 时 → NETWORK（不崩）', async () => {
    const saved = globalThis.fetch;
    globalThis.fetch = undefined;
    try {
      const res = await requestAnimation(baseOptions());
      expect(res.ok).toBe(false);
      expect(res.code).toBe(ANIMATE_CODE.NETWORK);
    } finally {
      globalThis.fetch = saved;
    }
  });
});

describe('reportWrongAnimation（共用反馈入口）', () => {
  it('达阈值后条目作废，下次请求重新走 AI', async () => {
    setInvalidateThreshold(1);
    const fetchImpl = aiReturning(VALID_IR);

    const first = await requestAnimation(baseOptions({ fetchImpl }));
    expect(first.source).toBe('ai');

    const feedback = await reportWrongAnimation(KEY, '画得不对');
    expect(feedback.invalidated).toBe(true);

    const second = await requestAnimation(baseOptions({ fetchImpl }));
    expect(second.source).toBe('ai');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

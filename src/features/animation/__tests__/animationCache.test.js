import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetCacheBackend,
  clearAnimationCache,
  getInvalidateThreshold,
  inspectCache,
  makeCacheKey,
  makeParamFingerprint,
  normalizeText,
  readCache,
  reportInvalidation,
  rollbackCache,
  setInvalidateThreshold,
  writeCache,
} from '../animationCache';

const IR_A = { version: 1, scene: 'cuboid', params: { a: 2, b: 2, c: 2 }, duration: 6, tracks: [] };
const IR_B = { version: 1, scene: 'cuboid', params: { a: 3, b: 3, c: 3 }, duration: 6, tracks: [] };

beforeEach(async () => {
  __resetCacheBackend();
  await clearAnimationCache();
  setInvalidateThreshold(3);
});

describe('normalizeText', () => {
  it('全角转半角、去空白、去标点、转小写', () => {
    expect(normalizeText('  正方体 棱长２ 求体积！ ')).toBe('正方体棱长2求体积');
    expect(normalizeText('Hello, World!')).toBe('helloworld');
  });

  it('空值安全', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('makeParamFingerprint / makeCacheKey', () => {
  it('键顺序不影响指纹', () => {
    expect(makeParamFingerprint({ a: 2, b: 3 })).toBe(makeParamFingerprint({ b: 3, a: 2 }));
  });

  it('参数不同则指纹不同', () => {
    expect(makeParamFingerprint({ a: 2 })).not.toBe(makeParamFingerprint({ a: 3 }));
  });

  it('非对象参数返回空串', () => {
    expect(makeParamFingerprint(null)).toBe('');
    expect(makeParamFingerprint('x')).toBe('');
  });

  it('同文本不同写法得到同一个 key', () => {
    const k1 = makeCacheKey('正方体棱长为 2，求体积', { a: 2 });
    const k2 = makeCacheKey(' 正方体棱长为２，求体积！', { a: 2 });
    expect(k1).toBe(k2);
  });

  it('参数不同则 key 不同', () => {
    expect(makeCacheKey('求体积', { a: 2 })).not.toBe(makeCacheKey('求体积', { a: 3 }));
  });
});

describe('readCache / writeCache', () => {
  it('未写入时读为 null', async () => {
    expect(await readCache(makeCacheKey('求体积', { a: 2 }))).toBeNull();
  });

  it('写入后可读回，且返回 version/key', async () => {
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    const hit = await readCache(key);
    expect(hit).not.toBeNull();
    expect(hit.ir).toEqual(IR_A);
    expect(hit.version).toBe(1);
    expect(hit.key).toBe(key);
  });

  it('缺 key 或 ir 时 writeCache 抛错', async () => {
    await expect(writeCache('', IR_A)).rejects.toThrow();
    await expect(writeCache('k', null)).rejects.toThrow();
  });

  it('重复写入版本递增，旧版进 history', async () => {
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    await writeCache(key, IR_B, { reason: 'regenerated' });
    const hit = await readCache(key);
    expect(hit.version).toBe(2);
    expect(hit.ir).toEqual(IR_B);

    const raw = await inspectCache(key);
    expect(raw.history).toHaveLength(1);
    expect(raw.history[0].version).toBe(1);
    expect(raw.history[0].ir).toEqual(IR_A);
  });
});

describe('reportInvalidation（先记日志，再作废）', () => {
  it('未达阈值时不作废，但计数与日志留存', async () => {
    setInvalidateThreshold(3);
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);

    const r1 = await reportInvalidation(key, '画错了');
    expect(r1.invalidated).toBe(false);
    expect(r1.rejectCount).toBe(1);
    expect(r1.threshold).toBe(3);

    const raw = await inspectCache(key);
    expect(raw.status).toBe('active');
    expect(raw.rejectLog).toHaveLength(1);
    expect(raw.rejectLog[0].reason).toBe('画错了');

    expect(await readCache(key)).not.toBeNull();
  });

  it('达到阈值即作废，且作废后读为未命中', async () => {
    setInvalidateThreshold(2);
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);

    await reportInvalidation(key, '第一次');
    const r2 = await reportInvalidation(key, '第二次');
    expect(r2.invalidated).toBe(true);

    const raw = await inspectCache(key);
    expect(raw.status).toBe('invalidated');
    expect(raw.rejectLog).toHaveLength(2);

    expect(await readCache(key)).toBeNull();
  });

  it('已作废条目继续反馈只记日志、不再叠加计数', async () => {
    setInvalidateThreshold(1);
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    await reportInvalidation(key, '作废');

    const r = await reportInvalidation(key, '再点一次');
    expect(r.invalidated).toBe(true);
    expect(r.rejectCount).toBe(1);

    const raw = await inspectCache(key);
    expect(raw.rejectLog).toHaveLength(2);
  });

  it('缺 key 或条目不存在返回 null', async () => {
    expect(await reportInvalidation('', 'x')).toBeNull();
    expect(await reportInvalidation('不存在', 'x')).toBeNull();
  });

  it('作废后重新生成可恢复为 active', async () => {
    setInvalidateThreshold(1);
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    await reportInvalidation(key, '作废');
    expect(await readCache(key)).toBeNull();

    await writeCache(key, IR_B);
    const hit = await readCache(key);
    expect(hit).not.toBeNull();
    expect(hit.ir).toEqual(IR_B);
    expect((await inspectCache(key)).status).toBe('active');
  });
});

describe('rollbackCache', () => {
  it('回滚到上一版本', async () => {
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    await writeCache(key, IR_B);

    const rolled = await rollbackCache(key);
    expect(rolled.version).toBe(1);
    expect(rolled.ir).toEqual(IR_A);

    const hit = await readCache(key);
    expect(hit.ir).toEqual(IR_A);
  });

  it('回滚后仍可再次回滚（历史保留）', async () => {
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    await writeCache(key, IR_B);
    await rollbackCache(key);

    const again = await rollbackCache(key);
    expect(again.version).toBe(2);
    expect(again.ir).toEqual(IR_B);
  });

  it('无可回滚版本时返回 null', async () => {
    const key = makeCacheKey('求体积', { a: 2 });
    await writeCache(key, IR_A);
    expect(await rollbackCache(key)).toBeNull();
    expect(await rollbackCache('不存在')).toBeNull();
  });
});

describe('阈值配置', () => {
  it('setInvalidateThreshold 只接受 >=1 的有限数', () => {
    expect(setInvalidateThreshold(5)).toBe(5);
    expect(getInvalidateThreshold()).toBe(5);
    expect(setInvalidateThreshold(0)).toBe(5);
    expect(setInvalidateThreshold(-1)).toBe(5);
    expect(setInvalidateThreshold('abc')).toBe(5);
    expect(setInvalidateThreshold(2.7)).toBe(2);
  });
});

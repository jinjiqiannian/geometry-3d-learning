/**
 * 动画 IR 缓存 —— 设计 §4.4。
 *
 * key = 小题文本归一化 + 参数指纹；存 IndexedDB；命中则第二次播放 0 次 AI 调用。
 * 环境不支持 IndexedDB（SSR / jsdom）时自动降级为进程内 Map，接口不变。
 *
 * 作废机制（§4.4，代码由人写）：
 *   - 「这画得不对」反馈按条目独立计数，阈值可配置；
 *   - 先记日志，再作废：条目进入 invalidated 状态而非删除，保留原 IR 与原因；
 *   - 重新生成写为新版本，旧版本进 history，可回滚。
 */

const DB_NAME = 'geometry-animation-cache';
const DB_VERSION = 1;
const STORE_NAME = 'animations';

/** 占位初值，待首批真实反馈数据标定（§4.4 明确不预设数字）。 */
let invalidateThreshold = 3;

export function getInvalidateThreshold() {
  return invalidateThreshold;
}

export function setInvalidateThreshold(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1) invalidateThreshold = Math.floor(n);
  return invalidateThreshold;
}

/** 归一化小题文本：去空白 / 去标点 / 全角转半角 / 小写。 */
export function normalizeText(text) {
  return String(text || '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .replace(/[，。；：、！？,.;:!?'"“”‘’()（）【】\[\]{}]/g, '')
    .toLowerCase();
}

/** 参数指纹：键排序后拼串，保证同一组参数得到同一指纹。 */
export function makeParamFingerprint(params) {
  if (!params || typeof params !== 'object') return '';
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join('&');
}

export function makeCacheKey(text, params) {
  return `${normalizeText(text)}::${makeParamFingerprint(params)}`;
}

// ── 存储后端 ──────────────────────────────────────

function createMemoryBackend() {
  const map = new Map();
  return {
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    async clear() {
      map.clear();
    },
  };
}

function createIndexedDBBackend() {
  let dbPromise = null;
  const open = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  };

  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE_NAME, mode);
      const store = t.objectStore(STORE_NAME);
      const req = fn(store);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };

  return {
    get: (key) => tx('readonly', (s) => s.get(key)),
    put: (key, value) => tx('readwrite', (s) => s.put(value)),
    delete: (key) => tx('readwrite', (s) => s.delete(key)),
    clear: () => tx('readwrite', (s) => s.clear()),
  };
}

let backend = null;

function getBackend() {
  if (backend) return backend;
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) {
      backend = createIndexedDBBackend();
      return backend;
    }
  } catch {
    /* fallthrough */
  }
  backend = createMemoryBackend();
  return backend;
}

/** 仅供测试：重置后端与内存状态。 */
export function __resetCacheBackend(nextBackend) {
  backend = nextBackend || null;
}

// ── 读写 ──────────────────────────────────────────

function normalizeEntry(raw) {
  if (!raw) return null;
  const entry = { ...raw };
  if (!Array.isArray(entry.history)) entry.history = [];
  if (!Array.isArray(entry.rejectLog)) entry.rejectLog = [];
  if (typeof entry.rejectCount !== 'number') entry.rejectCount = 0;
  if (typeof entry.version !== 'number') entry.version = 1;
  if (!entry.status) entry.status = 'active';
  return entry;
}

/**
 * 读缓存。作废条目视同未命中（返回 null），以触发重新生成。
 * @returns {Promise<{ir:Object, version:number, key:string}|null>}
 */
export async function readCache(key) {
  if (!key) return null;
  const entry = normalizeEntry(await getBackend().get(key));
  if (!entry || entry.status !== 'active' || !entry.ir) return null;
  return { ir: entry.ir, version: entry.version, key: entry.key };
}

/**
 * 写入（或重新生成）一条缓存。旧版本进 history，状态重置为 active。
 */
export async function writeCache(key, ir, meta = {}) {
  if (!key || !ir) throw new Error('writeCache 需要 key 与 ir');
  const old = normalizeEntry(await getBackend().get(key));
  const now = Date.now();

  const history = old ? [...old.history] : [];
  if (old && old.ir) {
    history.push({
      version: old.version,
      ir: old.ir,
      createdAt: old.updatedAt || old.createdAt || now,
      reason: meta.reason || 'regenerated',
    });
  }

  const entry = {
    key,
    ir,
    version: old ? old.version + 1 : 1,
    status: 'active',
    rejectCount: 0,
    rejectLog: old ? old.rejectLog : [],
    subtitle: meta.subtitle ?? old?.subtitle ?? '',
    fingerprint: meta.fingerprint ?? old?.fingerprint ?? '',
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
    history,
  };
  await getBackend().put(key, entry);
  return entry;
}

/**
 * 「这画得不对」反馈：先记日志，再（达阈值时）作废。
 * @returns {Promise<{rejectCount:number, invalidated:boolean, threshold:number}|null>}
 */
export async function reportInvalidation(key, reason = '') {
  if (!key) return null;
  const entry = normalizeEntry(await getBackend().get(key));
  if (!entry) return null;

  const now = Date.now();
  // 1) 先记日志（无论是否作废都留痕，供复盘）
  entry.rejectLog.push({ reason, at: now });

  if (entry.status === 'invalidated') {
    await getBackend().put(key, entry);
    return { rejectCount: entry.rejectCount, invalidated: true, threshold: invalidateThreshold };
  }

  // 2) 再判阈值
  entry.rejectCount += 1;
  const invalidated = entry.rejectCount >= invalidateThreshold;
  if (invalidated) entry.status = 'invalidated';
  entry.updatedAt = now;
  await getBackend().put(key, entry);

  return { rejectCount: entry.rejectCount, invalidated, threshold: invalidateThreshold };
}

/**
 * 回滚到上一个版本（§4.4 可回滚）。无可回滚版本时返回 null。
 */
export async function rollbackCache(key) {
  if (!key) return null;
  const entry = normalizeEntry(await getBackend().get(key));
  if (!entry || entry.history.length === 0) return null;

  const history = [...entry.history];
  const previous = history.pop();
  history.push({
    version: entry.version,
    ir: entry.ir,
    createdAt: entry.updatedAt,
    reason: 'rolled-back-from',
  });

  entry.ir = previous.ir;
  entry.version = previous.version;
  entry.history = history;
  entry.status = 'active';
  entry.updatedAt = Date.now();
  await getBackend().put(key, entry);
  return entry;
}

/** 读原始条目（含 invalidated / rejectLog），用于诊断与运营侧计数。 */
export async function inspectCache(key) {
  return normalizeEntry(await getBackend().get(key));
}

export async function clearAnimationCache() {
  await getBackend().clear();
}

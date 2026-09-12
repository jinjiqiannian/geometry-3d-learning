/**
 * 埋点采集（前端）
 *
 * 隐私边界：只在浏览器本地生成随机匿名 ID，不采集 IP、不关联账号、
 * 不跨站追踪、不引任何第三方 SDK。记录内容仅「匿名用户做了什么动作」。
 *
 * 可靠性原则：这里任何异常都不得影响主流程 —— 所有入口都是 try/catch，
 * 失败静默。埋点坏掉时产品必须照常可用。
 */

const ANON_KEY = 'jidong_anon_id'
const SESS_KEY = 'jidong_session_id'
const UTM_KEY = 'jidong_utm'
const ENDPOINT = '/api/track'

function rand() {
  try {
    return (
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36).slice(-5)
    )
  } catch {
    return 'anon'
  }
}

/** localStorage 可能被隐私模式禁用，全部包起来 */
function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key)
    localStorage.setItem(key, value)
    return value
  } catch {
    return null
  }
}

function sessionStore(key, value) {
  try {
    if (value === undefined) return sessionStorage.getItem(key)
    sessionStorage.setItem(key, value)
    return value
  } catch {
    return null
  }
}

function getAnonId() {
  let id = store(ANON_KEY)
  if (!id) id = store(ANON_KEY, rand())
  return id || 'anon'
}

function getSessionId() {
  let id = sessionStore(SESS_KEY)
  if (!id) id = sessionStore(SESS_KEY, rand())
  return id || 'sess'
}

/**
 * 抓 UTM。注意站点用的是 hash 路由，带参数的链接有两种写法：
 *   jiheweidu.cn/?utm_source=bilibili#/search
 *   jiheweidu.cn/#/search?utm_source=bilibili
 * 两种都要认，否则你发出去的链接有一半统计不到。
 */
function readUtm() {
  try {
    const fromSearch = new URLSearchParams(window.location.search)
    const hash = window.location.hash || ''
    const fromHash = new URLSearchParams(
      hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '',
    )
    const pick = (k) => fromSearch.get(k) || fromHash.get(k)
    const found = {
      source: pick('utm_source'),
      medium: pick('utm_medium'),
      campaign: pick('utm_campaign'),
    }
    if (found.source || found.campaign) {
      sessionStore(UTM_KEY, JSON.stringify(found))
      return found
    }
    // 站内跳转会丢掉 query，所以存一份到 session 里续用
    const saved = sessionStore(UTM_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

let utm = null

function payload(event, props) {
  let mobile = null
  let screen = null
  try {
    mobile = window.matchMedia('(max-width: 767px)').matches
    screen = `${window.screen.width}x${window.screen.height}`
  } catch {
    /* ignore */
  }
  if (!utm) utm = readUtm()
  return {
    anonId: getAnonId(),
    sessionId: getSessionId(),
    event,
    path: (window.location.hash || window.location.pathname || '').slice(0, 200),
    referrer: (document.referrer || '').slice(0, 300) || null,
    utm,
    props: props || null,
    isMobile: mobile,
    screen,
  }
}

/**
 * 记一个事件。永不抛错、永不 await、永不阻塞渲染。
 * @param {string} event 事件名（白名单见 api/track.js）
 * @param {object} [props] 附加信息
 */
export function track(event, props) {
  try {
    const body = JSON.stringify(payload(event, props))
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(ENDPOINT, blob)) return
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* 埋点失败静默 */
  }
}

/** 当前归因信息，供调试查看 */
export function currentAttribution() {
  if (!utm) utm = readUtm()
  return { ...utm, anonId: getAnonId() }
}

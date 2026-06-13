// ═══════════════════════════════════════════════════════
//  ShareUtils — 3D 场景分享链接编解码
//  URL-safe base64, no external dependencies
// ═══════════════════════════════════════════════════════

/**
 * 将场景数据编码为分享链接参数
 * @param {Object} data — { text, geometry, steps, parsedData }
 * @returns {string} URL query param value
 */
export function encodeShare(data) {
  try {
    const json = JSON.stringify(data)
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } catch {
    return ''
  }
}

/**
 * 安全验证解码后的分享数据结构
 * 防止恶意构造的超大数据或非预期类型
 */
function validateShareData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const sanitized = {}

  // text: 字符串，限制 5000 字符
  if (typeof data.text === 'string' && data.text.length <= 5000) {
    sanitized.text = data.text.trim()
  }

  // geometry: 对象，限制基本结构
  if (data.geometry && typeof data.geometry === 'object' && !Array.isArray(data.geometry)) {
    sanitized.geometry = sanitizeGeometry(data.geometry)
  }

  // steps: 数组，最多 50 步
  if (Array.isArray(data.steps) && data.steps.length <= 50) {
    sanitized.steps = data.steps.slice(0, 50).map(s => {
      if (typeof s === 'object' && s) return {
        title: String(s.title || '').slice(0, 200),
        content: String(s.content || '').slice(0, 5000),
        geometry: s.geometry ? sanitizeGeometry(s.geometry) : undefined,
      }
      return null
    }).filter(Boolean)
  }

  // parsedData: 对象
  if (data.parsedData && typeof data.parsedData === 'object' && !Array.isArray(data.parsedData)) {
    sanitized.parsedData = sanitizeParsedData(data.parsedData)
  }

  // 至少需要有 text 或 geometry
  if (!sanitized.text && !sanitized.geometry) return null

  return sanitized
}

function sanitizeGeometry(geo) {
  const clean = {}
  // 只保留已知的安全字段类型
  for (const [key, value] of Object.entries(geo)) {
    if (typeof value === 'string') clean[key] = value.slice(0, 1000)
    else if (typeof value === 'number' && isFinite(value)) clean[key] = value
    else if (typeof value === 'boolean') clean[key] = value
    else if (Array.isArray(value) && value.length <= 100) {
      clean[key] = value.filter(v =>
        typeof v === 'number' && isFinite(v)
      ).slice(0, 100)
    }
    // 忽略函数、嵌套对象、Symbol 等
  }
  return clean
}

function sanitizeParsedData(data) {
  const clean = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') clean[key] = value.slice(0, 2000)
    else if (typeof value === 'number' && isFinite(value)) clean[key] = value
    else if (typeof value === 'boolean') clean[key] = value
    // 忽略其他类型
  }
  return clean
}

/**
 * 从 URL 参数解码场景数据（含安全验证）
 * @param {string} encoded — base64url 编码的字符串
 * @returns {Object|null} 场景数据
 */
export function decodeShare(encoded) {
  try {
    // 长度限制：防止巨型 payload
    if (typeof encoded !== 'string' || encoded.length > 50000) return null

    // 还原 base64url → base64
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // 补全 padding
    while (b64.length % 4) b64 += '='
    const json = decodeURIComponent(escape(atob(b64)))
    const data = JSON.parse(json)

    return validateShareData(data)
  } catch {
    return null
  }
}

/**
 * 生成完整分享链接
 * @param {Object} data
 * @returns {string}
 */
export function generateShareUrl(data) {
  const encoded = encodeShare(data)
  if (!encoded) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jiheweidu.cn'
  // Hash routing: /#/workspace?share=xxx
  return `${origin}/#/workspace?share=${encoded}`
}

/**
 * 从当前 URL 检测分享参数（支持 hash 路由）
 * @returns {string|null} 分享编码
 */
export function detectShareParam() {
  if (typeof window === 'undefined') return null
  // Hash routing: search params are inside the hash fragment
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  if (qIndex === -1) return null
  const params = new URLSearchParams(hash.slice(qIndex + 1))
  return params.get('share') || null
}

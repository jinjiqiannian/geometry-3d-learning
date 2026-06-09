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
 * 从 URL 参数解码场景数据
 * @param {string} encoded — base64url 编码的字符串
 * @returns {Object|null} 场景数据
 */
export function decodeShare(encoded) {
  try {
    // 还原 base64url → base64
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // 补全 padding
    while (b64.length % 4) b64 += '='
    const json = decodeURIComponent(escape(atob(b64)))
    const data = JSON.parse(json)
    // 基本验证
    if (data && (data.text || data.geometry)) return data
    return null
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
  return `${origin}/workspace?share=${encoded}`
}

/**
 * 从当前 URL 检测分享参数
 * @returns {string|null} 分享编码
 */
export function detectShareParam() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('share') || null
}

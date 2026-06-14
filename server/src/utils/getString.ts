// ═══════════════════════════════════════════════════════
//  类型安全的参数提取 — 收口 Express 5 string|string[]
// ═══════════════════════════════════════════════════════

export function getString(value: unknown): string {
  if (Array.isArray(value)) return value[0] ?? ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export function getParam(req: { params: Record<string, unknown> }, name: string): string {
  return getString(req.params[name])
}

export function getQuery(req: { query: Record<string, unknown> }, name: string): string {
  return getString(req.query[name])
}

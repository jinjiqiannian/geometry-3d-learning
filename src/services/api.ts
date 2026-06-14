// ═══════════════════════════════════════════════════════
//  几何维度 API Client — 统一前端API调用层
//  自动附加 JWT token，处理 401 跳转
// ═══════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── Token management ───────────────────────────────

function getToken(): string | null {
  try {
    return localStorage.getItem('mathviz_token')
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem('mathviz_token', token)
  } catch { /* */ }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem('mathviz_refresh_token', token)
  } catch { /* */ }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem('mathviz_token')
    localStorage.removeItem('mathviz_refresh_token')
  } catch { /* */ }
}

// ── Core fetch wrapper ─────────────────────────────

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean  // default: true
  rawResponse?: boolean  // return Response object
}

async function request<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, rawResponse = false } = options

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (auth) {
    const token = getToken()
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const config: RequestInit = {
    method,
    headers: reqHeaders,
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, config)

  // Handle 401 — redirect to login
  if (response.status === 401 && auth) {
    clearTokens()
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('mathviz:unauthorized'))
    throw new Error('登录已过期，请重新登录')
  }

  if (rawResponse) {
    return response as T
  }

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error || `Request failed (${response.status})`)
  }

  return json
}

// ═══════════════════════════════════════════════════════
//  Auth API
// ═══════════════════════════════════════════════════════

export const authAPI = {
  async register(email: string, password: string, name?: string) {
    const res = await request<ApiResponse<{ user: any; token: string; refreshToken: string }>>(
      '/api/auth/register',
      { method: 'POST', body: { email, password, name }, auth: false }
    )
    if (res.data?.token) {
      setToken(res.data.token)
      setRefreshToken(res.data.refreshToken)
    }
    return res
  },

  async login(email: string, password: string) {
    const res = await request<ApiResponse<{ user: any; token: string; refreshToken: string }>>(
      '/api/auth/login',
      { method: 'POST', body: { email, password }, auth: false }
    )
    if (res.data?.token) {
      setToken(res.data.token)
      setRefreshToken(res.data.refreshToken)
    }
    return res
  },

  async getMe() {
    return request<ApiResponse<{ id: string; email: string; plan: string; role: string }>>(
      '/api/auth/me'
    )
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('mathviz_refresh_token')
    if (!refreshToken) throw new Error('No refresh token')
    const res = await request<ApiResponse<{ token: string; refreshToken: string }>>(
      '/api/auth/refresh',
      { method: 'POST', body: { refreshToken }, auth: false }
    )
    if (res.data?.token) {
      setToken(res.data.token)
      setRefreshToken(res.data.refreshToken)
    }
    return res
  },
}

// ═══════════════════════════════════════════════════════
//  AI API
// ═══════════════════════════════════════════════════════

export const aiAPI = {
  async parse(problemText: string, imageBase64?: string) {
    return request<ApiResponse<any>>('/api/ai/parse', {
      method: 'POST',
      body: { problemText, imageBase64 },
    })
  },

  async reason(problemText: string, parsedData: any) {
    return request<ApiResponse<any[]>>('/api/ai/reason', {
      method: 'POST',
      body: { problemText, parsedData },
    })
  },

  async solve(problemText: string) {
    return request<ApiResponse<{
      parsed: any
      steps: any[]
      matchedModel?: {
        id: string
        title: string
        category: string
        difficulty: number
        confidence: 'high' | 'medium' | 'low'
      }
    }>>('/api/ai/solve', {
      method: 'POST',
      body: { problemText },
    })
  },

  async narrate(workspaceId: string) {
    return request<ApiResponse<any[]>>('/api/ai/narrate', {
      method: 'POST',
      body: { workspaceId },
    })
  },
}

// ═══════════════════════════════════════════════════════
//  Workspace API
// ═══════════════════════════════════════════════════════

export const workspaceAPI = {
  async create(problemText: string, parsedData?: any, steps?: any[], geometry?: any) {
    return request<ApiResponse<any>>('/api/workspace', {
      method: 'POST',
      body: { problemText, parsedData, steps, geometry },
    })
  },

  async get(id: string) {
    return request<ApiResponse<any>>(`/api/workspace/${id}`)
  },

  async list(page = 1, limit = 20, search?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    return request<ApiResponse<any>>(`/api/workspace?${params}`)
  },

  async update(id: string, updates: any) {
    return request<ApiResponse<any>>(`/api/workspace/${id}`, {
      method: 'PATCH',
      body: updates,
    })
  },

  async delete(id: string) {
    return request<ApiResponse<any>>(`/api/workspace/${id}`, {
      method: 'DELETE',
    })
  },

  async fork(id: string) {
    return request<ApiResponse<any>>(`/api/workspace/${id}/fork`, {
      method: 'POST',
    })
  },

  async publish(id: string) {
    return request<ApiResponse<{ shareUrl: string }>>(`/api/workspace/${id}/publish`, {
      method: 'POST',
    })
  },

  /**
   * SSE replay stream — returns the raw Response for event streaming
   */
  async replay(id: string, fromStep = 0): Promise<Response> {
    return request<Response>(`/api/workspace/${id}/replay`, {
      method: 'POST',
      body: { fromStep },
      rawResponse: true,
    })
  },
}

// ═══════════════════════════════════════════════════════
//  Export API
// ═══════════════════════════════════════════════════════

export const exportAPI = {
  async ppt(options: {
    workspaceId: string
    screenshotBase64?: string
    template?: 'default' | 'classroom'
    teacherName?: string
    schoolName?: string
    includeNarration?: boolean
  }): Promise<Blob> {
    const response = await request<Response>('/api/export/ppt', {
      method: 'POST',
      body: options,
      rawResponse: true,
    })
    return response.blob()
  },

  async image(workspaceId: string, imageBase64: string, stepIdx?: number) {
    return request<ApiResponse<{ url: string }>>('/api/export/image', {
      method: 'POST',
      body: { workspaceId, imageBase64, stepIdx },
    })
  },

  async shareLink(workspaceId: string) {
    return request<ApiResponse<{ url: string }>>('/api/export/share-link', {
      method: 'POST',
      body: { workspaceId },
    })
  },
}

// ═══════════════════════════════════════════════════════
//  Billing API
// ═══════════════════════════════════════════════════════

export const billingAPI = {
  async createCheckout(plan: 'pro' | 'teacher', interval: 'monthly' | 'yearly' = 'monthly') {
    return request<ApiResponse<{ url: string }>>('/api/billing/create-checkout', {
      method: 'POST',
      body: { plan, interval },
    })
  },

  async getStatus() {
    return request<ApiResponse<{
      plan: string
      status: string
      daily_usage: number
      daily_limit: number
      remaining: number
    }>>('/api/billing/status')
  },

  async openPortal() {
    return request<ApiResponse<{ url: string }>>('/api/billing/portal', {
      method: 'POST',
    })
  },
}

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ── Listen for unauthorized events ─────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('mathviz:unauthorized', () => {
    // Could redirect to login page
    console.warn('Session expired — please log in again')
  })
}

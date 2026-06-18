// ═══════════════════════════════════════════════════════
//  EduMind API Client
// ═══════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  try {
    return localStorage.getItem('mathviz_token')
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const { method = 'GET', body, auth = true } = options
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = { method, headers }
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, config)

  if (response.status === 401 && auth) {
    try { localStorage.removeItem('mathviz_token') } catch {}
    window.dispatchEvent(new CustomEvent('mathviz:unauthorized'))
    throw new Error('登录已过期，请重新登录')
  }

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error || `请求失败 (${response.status})`)
  }
  return json
}

export const edumindAPI = {
  // ── 考试管理 ──
  createExam(data) {
    return request('/api/edumind/exams', { method: 'POST', body: data })
  },
  listExams(page = 1, limit = 20) {
    return request(`/api/edumind/exams?page=${page}&limit=${limit}`)
  },
  getExam(id) {
    return request(`/api/edumind/exams/${id}`)
  },
  updateExam(id, data) {
    return request(`/api/edumind/exams/${id}`, { method: 'PATCH', body: data })
  },
  deleteExam(id) {
    return request(`/api/edumind/exams/${id}`, { method: 'DELETE' })
  },

  // ── AI 分析 ──
  analyze(examId) {
    return request('/api/edumind/analyze', { method: 'POST', body: { examId } })
  },
  getAnalysis(examId) {
    return request(`/api/edumind/analyze/${examId}`)
  },

  // ── 诊断 ──
  getDiagnosis() {
    return request('/api/edumind/diagnosis')
  },

  // ── 学习计划 ──
  generatePlan(examId, durationDays, goal) {
    return request('/api/edumind/plan/generate', {
      method: 'POST',
      body: { examId, durationDays, goal },
    })
  },
  getActivePlan() {
    return request('/api/edumind/plan')
  },
  updatePlanProgress(id, progress) {
    return request(`/api/edumind/plan/${id}`, {
      method: 'PATCH',
      body: { progress },
    })
  },

  // ── AI 教练 ──
  askCoach(question, examId) {
    return request('/api/edumind/coach/ask', {
      method: 'POST',
      body: { question, examId },
    })
  },
  getCoachHistory(limit = 20) {
    return request(`/api/edumind/coach/history?limit=${limit}`)
  },
  getDailyReminder() {
    return request('/api/edumind/coach/daily')
  },
  acknowledgeReminder(reminderId) {
    return request('/api/edumind/coach/acknowledge', {
      method: 'POST',
      body: { reminderId },
    })
  },
}

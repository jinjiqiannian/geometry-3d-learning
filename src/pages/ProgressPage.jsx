// ═══════════════════════════════════════════════════════
//  ProgressPage — 学习进度
//  极简版本：每种模型三种状态 (未学/学习中/已掌握)
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './ProgressPage.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const CATEGORY_LABELS = {
  'geometry-3d': '立体几何',
  function: '函数',
  derivative: '导数',
  sequence: '数列',
  conic: '圆锥曲线',
}

const CATEGORY_ORDER = ['geometry-3d', 'function', 'derivative', 'sequence', 'conic']

function getStatus(mastery) {
  if (!mastery || mastery.mastery === 0) return 'not_started'
  if (mastery.mastery < 0.8) return 'learning'
  return 'mastered'
}

const STATUS_CONFIG = {
  not_started: { label: '未学', className: 'ps-not-started', icon: '○' },
  learning: { label: '学习中', className: 'ps-learning', icon: '◐' },
  mastered: { label: '已掌握', className: 'ps-mastered', icon: '●' },
}

export default function ProgressPage() {
  const [models, setModels] = useState([])
  const [mastery, setMastery] = useState({})
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('mathviz_token')
    if (saved) setToken(saved)
  }, [])

  useEffect(() => {
    if (!token) { setLoading(false); return }

    Promise.all([
      fetch(`${API_BASE}/api/models`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${API_BASE}/api/training/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({ data: { mastery: [] } })),
    ]).then(([modelsRes, progressRes]) => {
      if (modelsRes.success) setModels(modelsRes.data || [])
      const masteryMap = {}
      const masteryList = progressRes.data?.mastery || []
      masteryList.forEach(m => { masteryMap[m.model_id] = m })
      setMastery(masteryMap)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const grouped = {}
  for (const model of models) {
    const cat = model.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(model)
  }

  const total = models.length
  const done = models.filter(m => getStatus(mastery[m.id]) === 'mastered').length
  const inProgress = models.filter(m => getStatus(mastery[m.id]) === 'learning').length

  if (!token) {
    return (
      <div className="ps-page">
        <div className="ps-empty">
          <div className="ps-empty-icon">📊</div>
          <h2>请先登录</h2>
          <p>登录后查看学习进度</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ps-page">
      <div className="ps-header">
        <h1>学习进度</h1>
        <p className="ps-subtitle">跟踪每个模型的掌握程度</p>
      </div>

      {/* 概览 */}
      <div className="ps-overview">
        <div className="ps-overview-item">
          <span className="ps-ov-value">{total}</span>
          <span className="ps-ov-label">总模型</span>
        </div>
        <div className="ps-overview-item learning">
          <span className="ps-ov-value">{inProgress}</span>
          <span className="ps-ov-label">学习中</span>
        </div>
        <div className="ps-overview-item mastered">
          <span className="ps-ov-value">{done}</span>
          <span className="ps-ov-label">已掌握</span>
        </div>
        <div className="ps-overview-item">
          <span className="ps-ov-value">{total ? Math.round(done / total * 100) : 0}%</span>
          <span className="ps-ov-label">掌握率</span>
        </div>
      </div>

      {loading ? (
        <div className="ps-loading">加载中...</div>
      ) : models.length === 0 ? (
        <div className="ps-empty">
          <div className="ps-empty-icon">📚</div>
          <h2>暂无模型数据</h2>
          <p>做题后进度会自动更新</p>
          <Link to="/workspace" className="ps-goto-btn">去做题</Link>
        </div>
      ) : (
        CATEGORY_ORDER.map(cat => {
          const items = grouped[cat]
          if (!items || items.length === 0) return null
          return (
            <div key={cat} className="ps-category">
              <h3 className="ps-category-title">{CATEGORY_LABELS[cat] || cat}</h3>
              <div className="ps-grid">
                {items.map(model => {
                  const status = getStatus(mastery[model.id])
                  const config = STATUS_CONFIG[status]
                  const m = mastery[model.id]
                  return (
                    <div key={model.id} className={`ps-card ${config.className}`}>
                      <div className="ps-card-icon">{config.icon}</div>
                      <div className="ps-card-body">
                        <div className="ps-card-title">{model.title}</div>
                        <div className="ps-card-meta">
                          <span className="ps-card-diff">{'★'.repeat(model.difficulty || 1)}</span>
                          <span className={`ps-card-status ${config.className}`}>{config.label}</span>
                        </div>
                        {m && (
                          <div className="ps-card-progress">
                            <div className="ps-card-bar">
                              <div
                                className="ps-card-fill"
                                style={{ width: `${Math.round((m.mastery || 0) * 100)}%` }}
                              />
                            </div>
                            <span className="ps-card-pct">{Math.round((m.mastery || 0) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

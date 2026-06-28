import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import { EXAMPLES, GEOMETRY_NAMES, SUBJECTS, CROSS_SUBJECT_RECOMMENDATIONS } from '../constants'
import { recommendProblems } from '../engines/difficultyEngine'
import CameraCapture from '../features/solid-geometry/CameraCapture'
import './LandingPage.css'

function GeometryLogo({ size = 32 }) {
  return (
    <svg className="landing-logo-svg" viewBox="0 0 32 32" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: size, height: size }}>
      <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
      <path d="M3 9l13 7 13-7" />
      <path d="M16 23V9" />
      <path d="M8 13.5l8 4 8-4" />
      <path d="M8 18.5l8 4 8-4" />
    </svg>
  )
}

function SubjectIcon({ type, size = 24 }) {
  const icons = {
    math: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <path d="M16 2L3 9v14l13 7 13-7V9L16 2z" />
        <path d="M3 9l13 7 13-7" />
        <path d="M16 23V9" />
      </svg>
    ),
    physics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
    chemistry: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <circle cx="12" cy="8" r="3" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 11L12 13" />
        <path d="M12 13L8 13" />
        <path d="M12 13L16 13" />
      </svg>
    ),
    biology: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
        <ellipse cx="12" cy="12" rx="8" ry="10" />
        <path d="M12 4L12 20" />
        <path d="M6 8L18 8" />
        <path d="M6 12L18 12" />
        <path d="M6 16L18 16" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  }
  return icons[type] || icons.math
}

const FEATURE_ICONS = {
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 2.21-1.79 4-4 4" />
      <path d="M8 10a4 4 0 0 0-4 4c0 2.21 1.79 4 4 4h.5" />
      <path d="M16 14h.5a4 4 0 0 1 4 4c0 2.21-1.79 4-4 4" />
      <path d="M12 8v12" />
      <path d="M8 18l4 4 4-4" />
    </svg>
  ),
  threeD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </svg>
  ),
  teacher: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M6 8h12M6 11h8" />
    </svg>
  ),
  notebook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h6M9 11h5" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  ),
  ppt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h3M8 17h6" />
    </svg>
  ),
}

const FEATURES = [
  {
    id: 'ai',
    title: 'AI 解析',
    desc: '智能识别题目，自动生成完整解题步骤与答案',
    icon: FEATURE_ICONS.ai,
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    id: '3d',
    title: '3D 动态讲解',
    desc: '交互式三维模型，自由旋转缩放，直观理解空间关系',
    icon: FEATURE_ICONS.threeD,
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  {
    id: 'teacher',
    title: '教师模式',
    desc: '详细的板书式分步讲解，适合课堂教学与备课',
    icon: FEATURE_ICONS.teacher,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  {
    id: 'notebook',
    title: '错题本',
    desc: '自动记录错题，分类整理，针对性巩固薄弱知识点',
    icon: FEATURE_ICONS.notebook,
    gradient: 'linear-gradient(135deg, #ef4444, #f97316)',
  },
  {
    id: 'report',
    title: '学习报告',
    desc: '追踪学习进度，分析知识点掌握情况，可视化成长曲线',
    icon: FEATURE_ICONS.report,
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
  },
  {
    id: 'ppt',
    title: 'PPT 导出',
    desc: '一键导出解题过程与3D视图为课件，方便分享教学',
    icon: FEATURE_ICONS.ppt,
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  },
]

const HOT_TAGS = [
  { label: '正方体', text: '正方体ABCD-A₁B₁C₁D₁棱长为2，求异面直线A₁B与B₁C所成角余弦值' },
  { label: '三棱锥', text: '正三棱锥S-ABC底面边长为4，高为3，求侧棱与底面所成角' },
  { label: '球体', text: '球O半径为5，求球面上A、B两点间的最短距离' },
  { label: '二面角', text: '长方体ABCD-A₁B₁C₁D₁中AB=3, AD=4, AA₁=2，求二面角A₁-BD-C₁' },
  { label: '异面直线', text: '正方体棱长为1，求异面直线AC与BD₁的距离' },
]

const ALL_CATEGORIES = ['全部', ...new Set(EXAMPLES.map(e => e.category))]
const ALL_GEOMETRY_TYPES = [...new Set(EXAMPLES.map(e => e.geometryType))]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isPro } = useSubscription()

  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const cameraApiKey = useRef('')
  useEffect(() => {
    try { cameraApiKey.current = localStorage.getItem('mathviz_deepseek_key') || localStorage.getItem('mathviz_openai_key') || '' }
    catch { /* */ }
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [activeGeoType, setActiveGeoType] = useState(null)

  const [history, setHistory] = useState([])
  const [recommended, setRecommended] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
      setHistory(saved.slice(0, 5))
      if (saved.length > 0) {
        const recs = recommendProblems(saved)
        setRecommended(recs)
      }
    } catch { /* */ }
  }, [])

  const filteredExamples = useMemo(() => {
    let results = EXAMPLES
    if (activeCategory !== '全部') {
      results = results.filter(e => e.category === activeCategory)
    }
    if (activeGeoType) {
      results = results.filter(e => e.geometryType === activeGeoType)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      results = results.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.text.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (GEOMETRY_NAMES[e.geometryType] || '').includes(q)
      )
    }
    return results
  }, [searchQuery, activeCategory, activeGeoType])

  const handleGenerate = useCallback(async (text) => {
    const trimmed = text.trim()
    if (trimmed.length < 3) return
    setLoading(true)
    setError(null)
    navigate(`/workspace?q=${encodeURIComponent(trimmed)}`)
  }, [navigate])

  const handleSubmit = () => handleGenerate(input)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExample = (text) => {
    setInput(text)
    handleGenerate(text)
  }

  const handleHotTag = (text) => {
    setInput(text)
  }

  const handleContinue = (item) => {
    if (item.steps && item.steps.length > 0) {
      try {
        sessionStorage.setItem('mathviz_replay_steps', JSON.stringify(item.steps))
        sessionStorage.setItem('mathviz_replay_parsed', JSON.stringify(item.parsedData || null))
      } catch { /* */ }
      navigate(`/workspace?q=${encodeURIComponent(item.text)}&replay=1`)
    } else {
      navigate(`/workspace?q=${encodeURIComponent(item.text)}`)
    }
  }

  const handleGeometryRecognized = useCallback((result) => {
    const desc = result?.explanation || result?.text || ''
    if (desc) setInput(prev => prev ? `${prev}\n${desc}` : desc)
    setShowCamera(false)
  }, [])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const getSubjectIconComponent = (iconName) => {
    return <SubjectIcon type={iconName} size={20} />
  }

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-logo">
            <GeometryLogo size={44} />
            <span className="landing-hero-brand">几何维度</span>
          </div>

          <h1 className="landing-hero-title">
            AI 多学科学习平台
          </h1>
          <p className="landing-hero-subtitle">
            数学、物理、化学、生物，一站式智能学习助手
          </p>

          <div className={`landing-hero-input-wrap ${focused ? 'focused' : ''}`}>
            <textarea
              className="landing-hero-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="输入一道题目，如：正方体ABCD-A₁B₁C₁D₁棱长为2，求异面直线A₁B与B₁C所成角余弦值"
              rows={3}
              spellCheck={false}
            />
            <div className="landing-hero-input-footer">
              <span className="landing-hero-input-hint">
                {loading ? '解析中…' : '按 Enter 开始解析'}
              </span>
              <div className="landing-hero-input-actions">
                <button
                  className="landing-hero-camera-btn"
                  onClick={() => setShowCamera(v => !v)}
                  title="拍照识别"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 13V5a1 1 0 0 0-1-1h-2.17a1 1 0 0 1-.83-.44L10.17 2.5a1 1 0 0 0-.83-.44H6.66a1 1 0 0 0-.83.44L5 3.56a1 1 0 0 1-.83.44H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z" />
                    <circle cx="8" cy="8.75" r="2.5" />
                  </svg>
                </button>
                <button
                  className="landing-hero-submit"
                  onClick={handleSubmit}
                  disabled={input.trim().length < 3 || loading}
                >
                  {loading ? '解析中…' : '开始解析'}
                  <span className="landing-hero-submit-shortcut">↵</span>
                </button>
              </div>
            </div>
          </div>

          {error && <div className="landing-hero-error">{error}</div>}

          {showCamera && (
            <div className="landing-hero-camera">
              <CameraCapture
                apiKey={cameraApiKey.current}
                onGeometryGenerated={handleGeometryRecognized}
              />
            </div>
          )}

          <div className="landing-hero-tags">
            {HOT_TAGS.map(tag => (
              <button
                key={tag.label}
                className="landing-hero-tag"
                onClick={() => handleHotTag(tag.text)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-subjects">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <h2 className="landing-section-title">选择学科</h2>
            <p className="landing-section-subtitle">探索多学科学习资源</p>
          </div>

          <div className="landing-subjects-grid">
            {SUBJECTS.map(subject => (
              <button
                key={subject.id}
                className="landing-subject-card"
                onClick={() => navigate(subject.path)}
              >
                <div className="landing-subject-card-bg" style={{ background: subject.gradient }} />
                <div className="landing-subject-card-content">
                  <div className="landing-subject-icon" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                    <SubjectIcon type={subject.icon} size={28} />
                  </div>
                  <h3 className="landing-subject-name">{subject.name}</h3>
                  <p className="landing-subject-desc">{subject.description}</p>
                  <div className="landing-subject-features">
                    {subject.features.slice(0, 3).map((feature, i) => (
                      <span key={i} className="landing-subject-feature">{feature}</span>
                    ))}
                  </div>
                </div>
                <div className="landing-subject-card-decoration">
                  <span className="landing-subject-short-name">{subject.shortName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cross-subject">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <h2 className="landing-section-title">跨学科推荐</h2>
            <p className="landing-section-subtitle">知识融会贯通，举一反三</p>
          </div>

          <div className="landing-cross-subject-grid">
            {CROSS_SUBJECT_RECOMMENDATIONS.map(item => (
              <div key={item.id} className="landing-cross-subject-card">
                <div className="landing-cross-subject-icon">
                  {item.subjects.map((subId, i) => {
                    const subject = SUBJECTS.find(s => s.id === subId)
                    return (
                      <div key={i} className="landing-cross-subject-badge" style={{ backgroundColor: `${subject?.color}20`, color: subject?.color }}>
                        {getSubjectIconComponent(subId)}
                      </div>
                    )
                  })}
                </div>
                <h3 className="landing-cross-subject-title">{item.title}</h3>
                <p className="landing-cross-subject-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-examples">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <h2 className="landing-section-title">数学例题</h2>
            <p className="landing-section-subtitle">精选高频立体几何题目</p>
          </div>

          <div className="landing-filter-bar">
            <div className="landing-search-wrap">
              <svg className="landing-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5.5" />
                <line x1="11" y1="11" x2="14" y2="14" />
              </svg>
              <input
                className="landing-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索例题…"
                spellCheck={false}
              />
              {searchQuery && (
                <button className="landing-search-clear" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>

            <div className="landing-filter-row">
              <div className="landing-filter-tabs">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`landing-filter-tab ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="landing-filter-tags">
                <button
                  className={`landing-filter-tag ${!activeGeoType ? 'active' : ''}`}
                  onClick={() => setActiveGeoType(null)}
                >
                  全部类型
                </button>
                {ALL_GEOMETRY_TYPES.map(gt => (
                  <button
                    key={gt}
                    className={`landing-filter-tag ${activeGeoType === gt ? 'active' : ''}`}
                    onClick={() => setActiveGeoType(activeGeoType === gt ? null : gt)}
                  >
                    {GEOMETRY_NAMES[gt] || gt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredExamples.length > 0 ? (
            <div className="landing-examples-grid">
              {filteredExamples.map((ex) => (
                <button
                  key={ex.id}
                  className="landing-example-card"
                  onClick={() => handleExample(ex.text)}
                >
                  <span className="landing-example-category">{ex.category}</span>
                  <span className="landing-example-title">
                    {searchQuery ? highlightMatch(ex.title, searchQuery) : ex.title}
                  </span>
                  <span className="landing-example-desc">
                    {ex.text.slice(0, 50)}{ex.text.length > 50 ? '…' : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="landing-no-results">
              <p>没有匹配的例题</p>
              <button className="landing-reset-filter" onClick={() => { setSearchQuery(''); setActiveCategory('全部'); setActiveGeoType(null); }}>
                清除筛选
              </button>
            </div>
          )}

          {recommended && recommended.recommendations?.length > 0 && (
            <div className="landing-subsection">
              <div className="landing-subsection-header">
                <h3 className="landing-subsection-title">为你推荐</h3>
                <span className="landing-subsection-hint">{recommended.reason}</span>
              </div>
              <div className="landing-examples-grid">
                {recommended.recommendations.map((rec, i) => (
                  <button
                    key={`rec-${i}`}
                    className="landing-example-card"
                    onClick={() => handleExample(rec.text)}
                  >
                    <span className="landing-example-category">
                      {rec.difficulty === 'easy' ? '入门' : rec.difficulty === 'medium' ? '进阶' : '挑战'}
                    </span>
                    <span className="landing-example-title">{rec.title}</span>
                    <span className="landing-example-desc">{rec.text.slice(0, 40)}…</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="landing-subsection">
              <div className="landing-subsection-header">
                <h3 className="landing-subsection-title">最近学习</h3>
              </div>
              <div className="landing-history-list">
                {history.map((item, i) => (
                  <button
                    key={i}
                    className="landing-history-item"
                    onClick={() => handleContinue(item)}
                  >
                    <span className="landing-history-date">{formatDate(item.date)}</span>
                    <span className="landing-history-text">{item.text.slice(0, 60)}{item.text.length > 60 ? '…' : ''}</span>
                    <span className="landing-history-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <h2 className="landing-section-title">核心功能</h2>
            <p className="landing-section-subtitle">多学科通用，覆盖学习全流程</p>
          </div>

          <div className="landing-features-grid">
            {FEATURES.map(feature => (
              <div key={feature.id} className="landing-feature-card">
                <div
                  className="landing-feature-icon"
                  style={{ background: feature.gradient }}
                >
                  {feature.icon}
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-plans">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <h2 className="landing-section-title">会员计划</h2>
            <p className="landing-section-subtitle">选择适合你的学习方式</p>
          </div>

          <div className="landing-plans-grid">
            <div className="landing-plan-card">
              <div className="landing-plan-header">
                <h3 className="landing-plan-name">免费版</h3>
                <p className="landing-plan-price">
                  <span className="landing-plan-amount">¥0</span>
                  <span className="landing-plan-period">/月</span>
                </p>
              </div>
              <ul className="landing-plan-features">
                <li>每日 50 次解析</li>
                <li>基础 3D 视图</li>
                <li>例题浏览</li>
                <li>拍照识别</li>
              </ul>
              <button
                className="landing-plan-btn landing-plan-btn--outline"
                onClick={() => handleGenerate(input || EXAMPLES[0].text)}
              >
                开始使用
              </button>
            </div>

            <div className={`landing-plan-card ${isPro ? 'landing-plan-card--current' : ''}`}>
              {isPro && <span className="landing-plan-badge">当前方案</span>}
              <div className="landing-plan-header">
                <h3 className="landing-plan-name">Pro</h3>
                <p className="landing-plan-price">
                  <span className="landing-plan-amount">¥19</span>
                  <span className="landing-plan-period">/月</span>
                </p>
              </div>
              <ul className="landing-plan-features">
                <li>无限次解析</li>
                <li>高级 3D 交互</li>
                <li>教师模式</li>
                <li>错题本</li>
                <li>学习报告</li>
                <li>PPT 导出</li>
              </ul>
              <button
                className="landing-plan-btn landing-plan-btn--primary"
                onClick={() => {
                  if (!isPro) {
                    document.dispatchEvent(new CustomEvent('mathviz:show-paywall'))
                  }
                }}
                disabled={isPro}
              >
                {isPro ? '已是 Pro' : '升级 Pro'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <GeometryLogo size={18} />
            <span>几何维度</span>
          </div>
          <p>AI 驱动的多学科学习工具 · 三步学会一道题</p>
        </div>
      </footer>
    </div>
  )
}

function highlightMatch(text, query) {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="landing-highlight">{part}</mark>
      : part
  )
}
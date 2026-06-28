// ═══════════════════════════════════════════════════════
//  ProfilePage — 学生画像
//  掌握度 + 错误模式 + 学习趋势
//  迁移自 standalone exammind
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSupabase } from '../../contexts/SupabaseContext'
import AppNavigation from '../../components/AppNavigation'
import MobileBottomNav from '../../components/MobileBottomNav'
import './ProfilePage.css'

const MISTYPE_LABEL = {
  CALCULATION_ERROR: '计算错误',
  READING_ERROR: '审题错误',
  CONCEPT_ERROR: '知识漏洞',
  REASONING_ERROR: '推理错误',
  CARELESS_ERROR: '粗心错误',
}

export default function ProfilePage() {
  const supabase = useSupabase()
  const [profile, setProfile] = useState(null)
  const [mastery, setMastery] = useState([])
  const [mistakes, setMistakes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return

    // Get user from auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      const userId = user.id
      Promise.allSettled([
        supabase.from('knowledge_mastery').select('*').eq('user_id', userId)
          .then(({ data }) => {
            const masteryMap = {}
            const strengths = []
            const weaknesses = []
            for (const m of data || []) {
              masteryMap[m.knowledge_point] = m.mastery
              if (m.mastery >= 0.7) strengths.push(m.knowledge_point)
              else if (m.mastery < 0.5) weaknesses.push(m.knowledge_point)
            }
            supabase.from('exams').select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .then(({ count }) => {
                setProfile({
                  examCount: count || 0,
                  strengths,
                  weaknesses,
                  learningStyle: 'practice',
                  recentTrend: strengths.length > weaknesses.length ? 'improving' : 'stable',
                })
              })
          }),

        supabase.from('knowledge_mastery').select('*').eq('user_id', userId)
          .order('mastery', { ascending: true })
          .then(({ data }) => setMastery(data || [])),

        supabase.from('mistakes').select('type').eq('user_id', userId)
          .then(({ data }) => {
            const counts = {}
            for (const m of data || []) counts[m.type] = (counts[m.type] || 0) + 1
            setMistakes(Object.entries(counts).map(([type, count]) => ({ type, count })))
          }),
      ]).finally(() => setLoading(false))
    }).catch(() => setLoading(false))
  }, [supabase])

  if (loading) {
    return (
      <div className="page-container">
        <AppNavigation />
        <div className="page-content"><div className="ed-profile-loading">加载中...</div></div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="page-container">
      <AppNavigation />
      <div className="page-content">
        <div className="ed-profile">
          <Link to="/" className="ed-profile-back">← 返回首页</Link>
          <h1 className="ed-profile-title">学生画像</h1>

          {profile && (
            <div className="ed-profile-stats">
              <div className="ed-profile-stat">
                <div className="ed-profile-stat-label">考试次数</div>
                <div className="ed-profile-stat-value">{profile.examCount}</div>
              </div>
              <div className="ed-profile-stat">
                <div className="ed-profile-stat-label">学习风格</div>
                <div className="ed-profile-stat-value">
                  {profile.learningStyle === 'visual' ? '视觉型' : profile.learningStyle === 'logical' ? '逻辑型' : '练习型'}
                </div>
              </div>
              <div className="ed-profile-stat">
                <div className="ed-profile-stat-label">趋势</div>
                <div className="ed-profile-stat-value">
                  {profile.recentTrend === 'improving' ? '↑ 进步中' : profile.recentTrend === 'declining' ? '↓ 需关注' : '→ 稳定'}
                </div>
              </div>
              <div className="ed-profile-stat">
                <div className="ed-profile-stat-label">优势/薄弱</div>
                <div className="ed-profile-stat-value">
                  <span className="ed-profile-stat-green">{profile.strengths.length}</span>
                  <span className="ed-profile-stat-sep"> / </span>
                  <span className="ed-profile-stat-red">{profile.weaknesses.length}</span>
                </div>
              </div>
            </div>
          )}

          {profile?.strengths?.length > 0 && (
            <section className="ed-profile-section">
              <h2 className="ed-profile-section-title">💪 优势知识点</h2>
              <div className="ed-profile-tags">
                {profile.strengths.map(s => <span key={s} className="ed-profile-tag ed-profile-tag-green">{s}</span>)}
              </div>
            </section>
          )}

          {profile?.weaknesses?.length > 0 && (
            <section className="ed-profile-section">
              <h2 className="ed-profile-section-title">⚠️ 薄弱知识点</h2>
              <div className="ed-profile-tags">
                {profile.weaknesses.map(s => <span key={s} className="ed-profile-tag ed-profile-tag-red">{s}</span>)}
              </div>
            </section>
          )}

          {mastery.length > 0 && (
            <section className="ed-profile-section">
              <h2 className="ed-profile-section-title">📊 掌握度详情</h2>
              <div className="ed-profile-mastery-list">
                {mastery.map(k => (
                  <div key={k.knowledge_point} className="ed-profile-mastery-item">
                    <div className="ed-profile-mastery-header">
                      <span className="ed-profile-mastery-name">{k.knowledge_point}</span>
                      <span className="ed-profile-mastery-pct">{(k.mastery * 100).toFixed(0)}%</span>
                    </div>
                    <div className="ed-profile-mastery-bar-bg">
                      <div className={`ed-profile-mastery-bar-fill ${k.mastery >= 0.7 ? 'fill-green' : k.mastery >= 0.4 ? 'fill-yellow' : 'fill-red'}`}
                        style={{ width: `${k.mastery * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {mistakes.length > 0 && (
            <section className="ed-profile-section">
              <h2 className="ed-profile-section-title">🎯 错误模式</h2>
              <div className="ed-profile-mistake-list">
                {mistakes.map(m => (
                  <div key={m.type} className="ed-profile-mistake-item">
                    <span className="ed-profile-mistake-name">{MISTYPE_LABEL[m.type] || m.type}</span>
                    <span className="ed-profile-mistake-count">{m.count} 次</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!profile && !loading && (
            <div className="ed-profile-empty">暂无数据，上传试卷后生成</div>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}

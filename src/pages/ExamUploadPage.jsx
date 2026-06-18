// ═══════════════════════════════════════════════════════
//  ExamUploadPage — 上传成绩单/添加考试
// ═══════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

const EMPTY_QUESTION = () => ({
  index: 1,
  content: '',
  type: 'calculation',
  score: 10,
  earned: 0,
  difficulty: 3,
  knowledge_points: [],
  error_type: null,
})

export default function ExamUploadPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('数学')
  const [totalScore, setTotalScore] = useState(150)
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState(120)
  const [questions, setQuestions] = useState([EMPTY_QUESTION()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function addQuestion() {
    setQuestions([...questions, { ...EMPTY_QUESTION(), index: questions.length + 1 }])
  }

  function removeQuestion(idx) {
    if (questions.length <= 1) return
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, index: i + 1 }))
    setQuestions(updated)
  }

  function updateQuestion(idx, field, value) {
    const updated = questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    setQuestions(updated)
  }

  function updateKp(idx, value) {
    const kpList = value.split(',').map(s => s.trim()).filter(Boolean)
    updateQuestion(idx, 'knowledge_points', kpList)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setError('请输入考试标题')
      return
    }

    const score = questions.reduce((sum, q) => sum + (q.earned || 0), 0)
    const computedTotal = questions.reduce((sum, q) => sum + (q.score || 0), 0)

    setSaving(true)
    setError(null)

    try {
      const res = await edumindAPI.createExam({
        title: title.trim(),
        subject,
        exam_date: examDate,
        total_score: totalScore || computedTotal,
        score,
        duration_min: duration || null,
        question_count: questions.length,
        questions: questions.map(q => ({
          index: q.index,
          content: q.content,
          type: q.type,
          score: q.score,
          earned: q.earned,
          difficulty: q.difficulty,
          knowledge_points: q.knowledge_points,
          error_type: q.error_type || null,
        })),
      })

      // 触发 AI 分析
      const examId = res.data.id
      try {
        await edumindAPI.analyze(examId)
      } catch (analysisErr) {
        // 分析失败不阻止跳转
        console.warn('AI 分析启动失败:', analysisErr)
      }

      navigate(`/edumind/report/${examId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="edumind-page">
      <header className="edumind-header">
        <h1>📝 上传成绩单</h1>
      </header>

      {error && <div className="edumind-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edumind-card" style={{ marginBottom: '16px' }}>
          <h3>考试信息</h3>
          <div className="edumind-form-group">
            <label>考试名称 *</label>
            <input
              className="edumind-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="如：2024 期中考试、单元测验 03"
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="edumind-form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label>科目</label>
              <select className="edumind-select" value={subject} onChange={e => setSubject(e.target.value)}>
                <option>数学</option>
                <option>物理</option>
                <option>化学</option>
                <option>英语</option>
              </select>
            </div>
            <div className="edumind-form-group" style={{ flex: 1, minWidth: '120px' }}>
              <label>考试日期</label>
              <input className="edumind-input" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
            <div className="edumind-form-group" style={{ flex: 1, minWidth: '100px' }}>
              <label>满分</label>
              <input className="edumind-input" type="number" value={totalScore} onChange={e => setTotalScore(Number(e.target.value))} min={1} />
            </div>
            <div className="edumind-form-group" style={{ flex: 1, minWidth: '100px' }}>
              <label>时长(分钟)</label>
              <input className="edumind-input" type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={1} />
            </div>
          </div>
        </div>

        {/* 题目列表 */}
        <div className="edumind-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>题目列表</h3>
            <button type="button" className="edumind-btn-primary" onClick={addQuestion} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              + 添加题目
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="edumind-question-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>题目内容</th>
                  <th style={{ width: '70px' }}>类型</th>
                  <th style={{ width: '50px' }}>分值</th>
                  <th style={{ width: '50px' }}>得分</th>
                  <th style={{ width: '60px' }}>难度</th>
                  <th style={{ width: '120px' }}>知识点</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <input
                        className="edumind-input"
                        value={q.content}
                        onChange={e => updateQuestion(idx, 'content', e.target.value)}
                        placeholder="题目简述"
                        style={{ minWidth: '120px' }}
                      />
                    </td>
                    <td>
                      <select className="edumind-select" value={q.type} onChange={e => updateQuestion(idx, 'type', e.target.value)}>
                        <option value="choice">选择</option>
                        <option value="fill">填空</option>
                        <option value="calculation">计算</option>
                        <option value="proof">证明</option>
                      </select>
                    </td>
                    <td>
                      <input className="edumind-input edumind-input-short" type="number" value={q.score} onChange={e => updateQuestion(idx, 'score', Number(e.target.value))} min={0} />
                    </td>
                    <td>
                      <input className="edumind-input edumind-input-short" type="number" value={q.earned} onChange={e => updateQuestion(idx, 'earned', Number(e.target.value))} min={0} />
                    </td>
                    <td>
                      <select className="edumind-select" value={q.difficulty} onChange={e => updateQuestion(idx, 'difficulty', Number(e.target.value))}>
                        {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        className="edumind-input"
                        value={(q.knowledge_points || []).join(', ')}
                        onChange={e => updateKp(idx, e.target.value)}
                        placeholder="逗号分隔"
                        style={{ minWidth: '100px' }}
                      />
                    </td>
                    <td>
                      {questions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '12px', color: 'var(--edumind-text-secondary)', fontSize: '0.85rem' }}>
            已添加 {questions.length} 道题
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="edumind-btn-primary"
            style={{ background: 'transparent', border: '1px solid var(--edumind-border)' }}
            onClick={() => navigate('/edumind')}
          >
            取消
          </button>
          <button type="submit" className="edumind-btn-primary" disabled={saving}>
            {saving ? '保存中...' : '保存并分析'}
          </button>
        </div>
      </form>
    </div>
  )
}

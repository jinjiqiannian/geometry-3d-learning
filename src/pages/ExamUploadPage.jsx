// ═══════════════════════════════════════════════════════
//  ExamUploadPage — 上传成绩单/添加考试
//  来源: archive UploadPage.tsx → JSX + edumind.css
// ═══════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { edumindAPI } from '../services/edumind.js'
import './EduMindPage.css'

export default function ExamUploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('math')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) { setError('请选择文件'); return }
    if (!title.trim()) { setError('请输入考试名称'); return }

    setUploading(true)
    setError('')

    try {
      const examRes = await edumindAPI.createExam({ title: title.trim(), subject })
      const examId = examRes.data?.id
      if (!examId) throw new Error('创建考试失败')

      await edumindAPI.uploadFile(examId, file)
      await edumindAPI.analyze(examId)

      navigate(`/edumind/report/${examId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="edumind-page">
      <header className="edumind-header">
        <h1>上传试卷</h1>
      </header>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.9rem', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="edumind-card" style={{ maxWidth: '480px' }}>
        {/* 考试名称 */}
        <div className="edumind-form-group">
          <label>考试名称</label>
          <input
            className="edumind-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="如：2024 期中考试"
          />
        </div>

        {/* 科目 */}
        <div className="edumind-form-group">
          <label>科目</label>
          <select className="edumind-select" style={{ width: '100%' }} value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="math">数学</option>
            <option value="physics">物理</option>
            <option value="chemistry">化学</option>
            <option value="biology">生物</option>
            <option value="english">英语</option>
            <option value="chinese">语文</option>
          </select>
        </div>

        {/* Drop Zone */}
        <div
          style={{ border: '2px dashed var(--edumind-border)', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📄</div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{file.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)', marginTop: '4px' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </div>
              <button
                style={{ fontSize: '0.8rem', color: 'var(--edumind-primary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}
                onClick={e => { e.stopPropagation(); setFile(null) }}
              >
                重新选择
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📤</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--edumind-text-secondary)' }}>点击选择文件</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--edumind-text-secondary)', marginTop: '4px' }}>支持 JPG、PNG、PDF</div>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="edumind-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {uploading ? '上传分析中...' : '上传并分析'}
        </button>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { parseProblem, EXAMPLE_PROBLEMS } from '../engines/problemParser'
import './ProblemInput.css'

export default function ProblemInput({ apiKey, onGeometryGenerated }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const textareaRef = useRef(null)

  // ── 生成图形 ──
  const handleGenerate = async () => {
    const text = input.trim()
    if (text.length < 3) {
      setError('请输入至少3个字的题目描述')
      return
    }
    if (!apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await parseProblem(text, apiKey)
      setSuccess(`已识别：${result.explanation || '几何体'}`)
      onGeometryGenerated?.(result)
    } catch (e) {
      setError(e.message || '解析失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // ── 点击示例 ──
  const handleExample = (example) => {
    setInput(example.text)
    setError('')
    setSuccess('')
    textareaRef.current?.focus()
  }

  // ── 键盘提交 ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="problem-input">
      <h3 className="pi-title">📝 题目输入</h3>

      {/* 文字输入 */}
      <textarea
        ref={textareaRef}
        className="pi-textarea"
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(''); setSuccess('') }}
        onKeyDown={handleKeyDown}
        placeholder="输入几何题目，如：正方体ABCD-EFGH棱长为2，求体对角线AG的长"
        rows={4}
        spellCheck={false}
      />

      {/* 操作按钮 */}
      <div className="pi-actions">
        <button
          className="pi-btn pi-btn-primary"
          onClick={handleGenerate}
          disabled={loading || input.trim().length < 3}
        >
          {loading ? '⏳ 解析中...' : '🧠 生成图形'}
        </button>
        <span className="pi-hint">Ctrl+Enter 快捷提交</span>
      </div>

      {/* 消息提示 */}
      {error && <div className="pi-message pi-error">{error}</div>}
      {success && <div className="pi-message pi-success">{success}</div>}

      {/* 预设示例 */}
      <div className="pi-examples">
        <h4>💡 试试这些例子：</h4>
        <div className="pi-example-list">
          {EXAMPLE_PROBLEMS.map((ex, i) => (
            <button
              key={i}
              className="pi-example-btn"
              onClick={() => handleExample(ex)}
              title={ex.text}
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { parseImageToGeometry } from '../../engines/problemParser'
import './CameraCapture.css'

export default function CameraCapture({ apiKey, onGeometryGenerated }) {
  const [capturedImage, setCapturedImage] = useState(null)   // { data, mediaType }
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')  // 状态文字
  const fileInputRef = useRef(null)

  // ── 拍照/选图 ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setStatus('')

    // 检查文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('图片太大，请选择 10MB 以内的图片')
      return
    }

    // 预览
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // 转 base64
    const reader = new FileReader()
    reader.onload = () => {
      const fullDataUrl = reader.result
      // 提取纯 base64（去掉 data:xxx;base64, 前缀）
      const base64 = fullDataUrl.split(',')[1]
      setCapturedImage({
        data: base64,
        mediaType: file.type || 'image/jpeg',
      })
      setStatus('图片已就绪，点击"识别题目"开始')
    }
    reader.onerror = () => {
      setError('图片读取失败，请重试')
    }
    reader.readAsDataURL(file)

    // 清空 input 以便重复选择同一文件
    e.target.value = ''
  }

  // ── 识别题目 ──
  const handleRecognize = async () => {
    if (!capturedImage) {
      setError('请先拍照或选择图片')
      return
    }
    if (!apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }

    setLoading(true)
    setError('')
    setStatus('正在识别图片中的题目...')

    try {
      const result = await parseImageToGeometry(
        capturedImage.data,
        capturedImage.mediaType,
        apiKey
      )
      setStatus(`识别完成：${result.explanation || ''}`)
      onGeometryGenerated?.(result)
    } catch (e) {
      setError(e.message || '识别失败，请重试')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  // ── 清除 ──
  const handleClear = () => {
    setCapturedImage(null)
    setPreviewUrl(null)
    setError('')
    setStatus('')
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  return (
    <div className="camera-capture">
      <h3 className="cc-title">📷 拍照识别</h3>

      {/* 预览区域 */}
      {previewUrl ? (
        <div className="cc-preview">
          <img src={previewUrl} alt="拍摄的题目" className="cc-preview-img" />
          <div className="cc-preview-actions">
            <button
              className="cc-btn cc-btn-primary"
              onClick={handleRecognize}
              disabled={loading}
            >
              {loading ? '⏳ 识别中...' : '🔍 识别题目'}
            </button>
            <button className="cc-btn cc-btn-ghost" onClick={handleClear} disabled={loading}>
              重拍
            </button>
          </div>
        </div>
      ) : (
        <div className="cc-capture-area">
          <button
            className="cc-capture-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="cc-capture-icon">📸</span>
            <span className="cc-capture-text">拍照或选择图片</span>
            <span className="cc-capture-hint">支持 JPG/PNG，最大 10MB</span>
          </button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 消息 */}
      {error && <div className="cc-message cc-error">{error}</div>}
      {status && !error && <div className="cc-message cc-status">{status}</div>}
    </div>
  )
}

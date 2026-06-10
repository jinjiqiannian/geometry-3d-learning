import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import Canvas3D from '../features/solid-geometry/Canvas3D'
import GeometryMiniControls from '../components/GeometryMiniControls'
import ExplanationPanel from '../components/ExplanationPanel'
import TeacherModePanel from '../components/TeacherModePanel'
import { getLineDefinitions } from '../engines/lineDefinitions'
import { isPolyhedral } from '../engines/geometryEngine'
import { computeVerticesFromParams } from '../engines/constraintSolver'
import { aiAPI } from '../services/api'
import { computeVisualIntent } from '../engines/visualIntent'
import { createLabelMap, INTERNAL_LABELS } from '../engines/labelMapper'
import { generateShareUrl, detectShareParam, decodeShare } from '../engines/shareUtils'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTeacher } from '../contexts/TeacherContext'
import './WorkspacePage.css'

// ── Default constraint params ─────────────────────
function defaultConstraintParams(type) {
  if (type === 'cuboid') {
    return { constraintMode: 'cuboid', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
  }
  return { constraintMode: 'cube', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
}

export default function WorkspacePage() {
  const { checkCanGenerate, recordUsage, remaining, isPro, triggerPaywall } = useSubscription()
  const { setNarration, setCurrentPhrase } = useTeacher()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef(null)

  // ── Geometry state (from SolidGeometryPage) ──────
  const [geometry, setGeometry] = useState({
    type: 'cube',
    params: { size: 2 },
    ...defaultConstraintParams('cube'),
  })
  const [showFaces, setShowFaces] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [visibleLines, setVisibleLines] = useState(() => new Set())
  const [hoveredLine, setHoveredLine] = useState(null)
  const [customLines, setCustomLines] = useState([])
  const [shownLengthLabels, setShownLengthLabels] = useState(() => new Set())
  const [searchedLine, setSearchedLine] = useState('')
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [edgeColorOverrides, setEdgeColorOverrides] = useState({})

  // ── Workspace state ──────────────────────────────
  const [problemText, setProblemText] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('idle') // idle|parsing|reasoning|visualizing|done
  const [error, setError] = useState(null)
  const [pptLoading, setPptLoading] = useState(false)
  const [quickInput, setQuickInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [followUpAnswer, setFollowUpAnswer] = useState(null)
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const playTimerRef = useRef(null)
  const [shareToast, setShareToast] = useState('')

  // ── Mobile ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767)
  const [show3D, setShow3D] = useState(true)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 767)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Auto-parse from URL query / share link ────────
  useEffect(() => {
    const q = searchParams.get('q')
    const replay = searchParams.get('replay')
    const shareParam = detectShareParam()

    // 分享链接加载
    if (shareParam && !q) {
      const shared = decodeShare(shareParam)
      if (shared) {
        setProblemText(shared.text || '')
        if (shared.geometry) {
          setGeometry({
            type: shared.geometry.type || 'cube',
            params: { size: shared.geometry.size || shared.geometry.params?.size || 2 },
            ...defaultConstraintParams(shared.geometry.type || 'cube'),
          })
        }
        if (shared.steps) {
          setSteps(shared.steps)
          setParsedData(shared.parsedData || null)
          setCurrentStep(0)
          setLoadingStage('done')
        } else if (shared.text) {
          handleParseProblem(shared.text)
        }
        setShareToast('已加载分享的几何场景')
        setTimeout(() => setShareToast(''), 2500)
        return
      }
    }

    if (q && q.trim()) {
      // 检查是否有历史回放数据（sessionStorage）
      if (replay === '1') {
        try {
          const savedSteps = sessionStorage.getItem('mathviz_replay_steps')
          const savedParsed = sessionStorage.getItem('mathviz_replay_parsed')
          if (savedSteps) {
            const steps = JSON.parse(savedSteps)
            const parsed = savedParsed ? JSON.parse(savedParsed) : null
            setProblemText(q.trim())
            setSteps(steps)
            setParsedData(parsed)
            setCurrentStep(0)
            if (parsed) {
              setGeometry({
                type: parsed.type || 'cube',
                params: { size: parsed.size || 2 },
                ...defaultConstraintParams(parsed.type || 'cube'),
              })
            }
            setLoadingStage('done')
            // 清除回放数据
            sessionStorage.removeItem('mathviz_replay_steps')
            sessionStorage.removeItem('mathviz_replay_parsed')
            return
          }
        } catch { /* fall through to normal parse */ }
      }
      handleParseProblem(q.trim())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Custom vertices (free mode) ──────────────────
  const customVertices = useMemo(() => {
    if (!isPolyhedral(geometry.type)) return null
    if (geometry.constraintMode === 'free') {
      const modeParams = {
        size: geometry.params.size ?? 2,
        freeEdgeLengths: geometry.freeEdgeLengths || {},
      }
      return computeVerticesFromParams(geometry.type, 'free', modeParams)
    }
    return null
  }, [geometry.type, geometry.constraintMode, geometry.params.size, geometry.freeEdgeLengths])

  // ── Reset on geometry type change ────────────────
  useEffect(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
    const defaults = new Set(
      lines
        .filter(l => ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) && !l.dashed)
        .map(l => `${l.id}|${l.category}`)
    )
    setVisibleLines(defaults)
    setHoveredLine(null)
    setCustomLines([])
    setShownLengthLabels(new Set())
    setSearchedLine('')
    setSelectedEdge(null)
    setEdgeColorOverrides({})
  }, [geometry.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Parse problem with AI backend ──
  const handleParseProblem = useCallback(async (text) => {
    if (!checkCanGenerate()) return
    if (loading) return  // 防止重复提交

    setProblemText(text)
    setLoading(true)
    setLoadingStage('parsing')
    setError(null)

    try {
      // Stage 1: Call AI solve endpoint
      setLoadingStage('reasoning')
      const result = await aiAPI.solve(text)

      if (result?.data) {
        const { parsed, steps, visualStates } = result.data
        setParsedData(parsed)

        const mergedSteps = steps.map((step, i) => ({
          ...step,
          sceneState: visualStates?.[i] || null,
        }))
        setSteps(mergedSteps)
        setCurrentStep(0)
        setLoadingStage('visualizing')

        // Stage 2: Set up geometry
        setGeometry({
          type: parsed?.type || 'cube',
          params: { size: parsed?.size || 2 },
          ...defaultConstraintParams(parsed?.type || 'cube'),
        })

        // Handle highlight lines from AI
        if (parsed?.highlightLines?.length > 0) {
          const { lines: predefinedLines } = getLineDefinitions(parsed.type || 'cube', { size: parsed.size || 2 })
          const newCustomLines = []
          parsed.highlightLines.forEach(hl => {
            const exists = predefinedLines.some(l => l.id === hl.label && l.category === 'AI高亮')
            if (!exists) {
              newCustomLines.push({
                id: hl.label || `${hl.from}${hl.to}`,
                category: 'AI高亮',
                from: hl.from,
                to: hl.to,
                dashed: false,
                custom: true,
              })
            }
          })
          if (newCustomLines.length > 0) {
            setCustomLines(newCustomLines)
            setVisibleLines(prev => {
              const next = new Set(prev)
              newCustomLines.forEach(l => next.add(`${l.id}|${l.category}`))
              return next
            })
          }
        }
      }

      await recordUsage('generate', text)

      // 保存到学习记录（含步骤，支持历史回放）
      try {
        const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
        saved.unshift({
          date: new Date().toISOString(),
          text,
          type: parsed?.type || 'cube',
          steps: mergedSteps,  // 保存步骤避免重复AI请求
          parsedData: parsed,  // 保存解析结果
        })
        // 最多保存 50 条
        if (saved.length > 50) saved.length = 50
        localStorage.setItem('mathviz_history', JSON.stringify(saved))
      } catch { /* */ }

      // 短暂延迟让"构建3D可视化"阶段真实可见
      await new Promise(r => setTimeout(r, 350))
      setLoadingStage('done')
    } catch (err) {
      // 错误分类：区分网络问题 / AI超时 / 题目无法识别
      const msg = err.message || ''
      let userError = '解析失败，请重试'
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
        userError = '网络连接失败，请检查网络后重试'
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        userError = 'AI 响应超时，请尝试简化题目描述'
      } else if (msg.includes('401') || msg.includes('403')) {
        userError = 'API 密钥无效，请在设置中更新'
      } else if (msg.includes('429')) {
        userError = '请求过于频繁，请稍后重试'
      } else if (msg) {
        userError = msg
      }
      setError(userError)
      // Fallback: local template
      try {
        const { quickMatch } = await import('../engines/problemParser')
        const { generateLocalSteps } = await import('../engines/explanationEngine')
        const parsed = quickMatch(text) || { type: 'cube', size: 2, labels: [], highlightLines: [], explanation: '' }
        setParsedData(parsed)
        const fallbackSteps = generateLocalSteps(text, parsed)
        setSteps(fallbackSteps)
        setCurrentStep(0)
        setGeometry({
          type: parsed.type || 'cube',
          params: { size: parsed.size || 2 },
          ...defaultConstraintParams(parsed.type || 'cube'),
        })
        setError(null)

        // 保存到学习记录（本地回退也保存）
        try {
          const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
          saved.unshift({
            date: new Date().toISOString(),
            text,
            type: parsed?.type || 'cube',
            steps: fallbackSteps,
            parsedData: parsed,
          })
          if (saved.length > 50) saved.length = 50
          localStorage.setItem('mathviz_history', JSON.stringify(saved))
        } catch { /* */ }
      } catch { /* */ }
    } finally {
      setLoading(false)
      setLoadingStage('idle')
    }
  }, [checkCanGenerate, recordUsage])

  // ── Geometry change (from GeometryMiniControls) ──

  const handleGeometryChange = useCallback((type, params) => {
    setGeometry({
      type,
      params: { size: params?.size ?? 2 },
      ...defaultConstraintParams(type),
    })
  }, [])

  const polyhedral = isPolyhedral(geometry.type)

  // ═══════════════════════════════════════════════════════
  //  以下变量严格按照依赖顺序声明 —— 前面的变量不能引用后面的变量
  // ═══════════════════════════════════════════════════════

  // ── (1) labelMap — 题目标签 → 内部索引映射 ─────────
  //  依赖: parsedData
  const labelMap = useMemo(() => {
    if (!parsedData?.vertices && !parsedData?.labels) return null
    const userLabels = parsedData.vertices || parsedData.labels || null
    const internalLabels = INTERNAL_LABELS[parsedData.type] || INTERNAL_LABELS.cube
    return createLabelMap(userLabels, internalLabels)
  }, [parsedData])

  // ── (2) vertexLabels — 自定义顶点标签（从题目解析）──
  //  依赖: labelMap
  const vertexLabels = useMemo(() => {
    if (!labelMap) return null
    return labelMap.displayLabels
  }, [labelMap])

  // ── (3) visualIntent — Step→3D deterministic mapping ──
  //  依赖: steps, parsedData, problemText, labelMap
  const visualIntent = useMemo(() => {
    const step = steps[currentStep]
    if (!step || !parsedData) return null
    return computeVisualIntent(step, parsedData, problemText, labelMap)
  }, [currentStep, steps, parsedData, problemText, labelMap])

  // ── (4) mergedLines — 合并的边定义 ─────────────────
  //  依赖: geometry, customVertices, vertexLabels, customLines, edgeColorOverrides
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices, vertexLabels)
    const merged = [...lines, ...customLines]
    if (Object.keys(edgeColorOverrides).length > 0) {
      return merged.map(l => {
        const key = `${l.id}|${l.category}`
        return edgeColorOverrides[key] ? { ...l, colorOverride: edgeColorOverrides[key] } : l
      })
    }
    return merged
  }, [geometry.type, geometry.params.size, customLines, edgeColorOverrides, customVertices, vertexLabels])

  // ── (5) selectedEdgeData — 选中边的详细信息 ─────────
  //  依赖: selectedEdge, geometry, vertexLabels, customLines
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdge) return null
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices, vertexLabels)
    return [...lines, ...customLines].find(l => `${l.id}|${l.category}` === selectedEdge) || null
  }, [selectedEdge, geometry.type, geometry.params, customLines, customVertices, vertexLabels])

  // ── Step navigation ──────────────────────────────
  const handleStepClick = useCallback((index) => {
    setCurrentStep(index)
  }, [])

  const handleNextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // ── Quick input submit (workspace empty state) ──
  const handleQuickSubmit = useCallback(() => {
    const trimmed = quickInput.trim()
    if (trimmed.length < 3 || loading) return
    handleParseProblem(trimmed)
  }, [quickInput, loading, handleParseProblem])

  const handleQuickKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuickSubmit()
    }
  }, [handleQuickSubmit])

  // ── 生成教师讲稿（从步骤内容） ─────────────────
  useEffect(() => {
    if (steps.length === 0) return
    const narration = steps.map((s, i) => ({
      step: i,
      text: `${s.title}。${s.content}`,
      delay: Math.max(3000, s.content.length * 40),
    }))
    setNarration(narration)
    setCurrentPhrase(narration[0]?.text || '')
  }, [steps, setNarration, setCurrentPhrase])

  // 当前步骤切换时更新字幕
  useEffect(() => {
    if (steps.length === 0) return
    const phrase = `${steps[currentStep]?.title || ''}。${steps[currentStep]?.content || ''}`
    setCurrentPhrase(phrase)
  }, [currentStep, steps, setCurrentPhrase])

  // ── PPT 导出 ───────────────────────────────────
  const handleExportPPT = useCallback(async () => {
    if (!canvasRef.current) return
    setPptLoading(true)
    try {
      const { generatePPT } = await import('../engines/pptExporter')
      await generatePPT(
        { problemText, steps, parsedData, geometry },
        canvasRef.current
      )
    } catch (err) {
      console.error('PPT export failed:', err)
    } finally {
      setPptLoading(false)
    }
  }, [problemText, steps, parsedData, geometry])

  // ── 追问 AI ──
  const handleAskFollowUp = useCallback(async (question) => {
    setFollowUpLoading(true)
    setFollowUpAnswer(null)
    try {
      const currentStepData = steps[currentStep]
      const contextPrompt = `原题：${problemText}\n当前步骤（第${currentStep + 1}步）：${currentStepData?.title || ''}\n${currentStepData?.content || ''}\n\n学生追问：${question}\n\n请针对这个追问给出简洁的解答（2-4句话），用中文。`
      const result = await aiAPI.solve(contextPrompt)
      if (result?.data?.steps?.length > 0) {
        setFollowUpAnswer(result.data.steps[0].content || result.data.steps[0].title || '抱歉，无法回答这个问题。')
      } else if (result?.data?.parsed?.explanation) {
        setFollowUpAnswer(result.data.parsed.explanation)
      } else {
        setFollowUpAnswer('抱歉，无法回答这个问题，请尝试换一种方式提问。')
      }
    } catch {
      setFollowUpAnswer('追问失败，请检查网络后重试。')
    } finally {
      setFollowUpLoading(false)
    }
  }, [problemText, steps, currentStep])

  // ── 重置视角 ──
  const handleResetCamera = useCallback(() => {
    setCameraResetKey(k => k + 1)
  }, [])

  // ── 自动回放 ──
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => {
      if (prev) {
        // 停止
        if (playTimerRef.current) clearTimeout(playTimerRef.current)
        return false
      }
      return true
    })
  }, [])

  useEffect(() => {
    if (!isPlaying || steps.length === 0) return
    const advance = () => {
      setCurrentStep(prev => {
        const next = prev + 1
        if (next >= steps.length) {
          setIsPlaying(false)
          return prev
        }
        playTimerRef.current = setTimeout(advance, 3500)
        return next
      })
    }
    playTimerRef.current = setTimeout(advance, 2000)
    return () => { if (playTimerRef.current) clearTimeout(playTimerRef.current) }
  }, [isPlaying, steps.length])

  // ── 重试 ──
  const handleRetry = useCallback(() => {
    if (!problemText || loading) return
    setError(null)
    setLoadingStage('idle')
    handleParseProblem(problemText)
  }, [problemText, loading, handleParseProblem])

  // ── 截图导出 ──
  const handleScreenshot = useCallback(async () => {
    if (!canvasRef.current) return
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        backgroundColor: '#f8f9fb',
      })
      const link = document.createElement('a')
      link.download = `几何维度-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // Fallback: canvas.toDataURL
      const canvas = canvasRef.current?.querySelector('canvas')
      if (canvas) {
        const link = document.createElement('a')
        link.download = `几何维度-${new Date().toISOString().slice(0, 10)}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    }
  }, [])

  // ── 分享链接 ──
  const handleShare = useCallback(async () => {
    const shareData = {
      text: problemText,
      geometry: { type: geometry.type, params: geometry.params },
      steps: steps.length > 0 ? steps : undefined,
      parsedData: parsedData,
    }
    const url = generateShareUrl(shareData)
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      setShareToast('链接已复制，可发送给朋友')
    } catch {
      // Fallback: show in prompt
      setShareToast(url)
    }
    setTimeout(() => setShareToast(''), 3000)
  }, [problemText, geometry, steps, parsedData])

  return (
    <div className="workspace-page">
      <div className="wp-top-bar">
        <Link to="/" className="wp-back-link">← 返回首页</Link>
        <span className="wp-top-title">
          {problemText ? problemText.slice(0, 50) + (problemText.length > 50 ? '…' : '') : '几何维度'}
        </span>
        <div className="wp-top-actions">
          {/* 移动端 3D 切换 */}
          {isMobile && (
            <button
              className="wp-toggle-3d"
              onClick={() => setShow3D(prev => !prev)}
            >
              {show3D ? '隐藏 3D' : '显示 3D'}
            </button>
          )}
        </div>
      </div>

      {/* ── 升级引导条（免费用户剩余不足时） ── */}
      {!isPro && problemText && !loading && remaining <= 5 && remaining > 0 && (
        <div className="wp-upgrade-banner">
          <span className="wp-upgrade-banner-text">
            今日还剩 <strong>{remaining}</strong> 次免费使用
          </span>
          <button
            className="wp-upgrade-banner-btn"
            onClick={() => triggerPaywall('免费额度即将用完，升级解锁无限使用')}
          >
            升级无限使用 →
          </button>
        </div>
      )}
      {!isPro && remaining === 0 && (
        <div className="wp-upgrade-banner danger">
          <span className="wp-upgrade-banner-text">
            今日免费次数已用完
          </span>
          <button
            className="wp-upgrade-banner-btn"
            onClick={() => triggerPaywall('已达每日使用上限，升级继续使用')}
          >
            升级继续使用 →
          </button>
        </div>
      )}

      {/* ── Quick input: workspace 空状态 ── */}
      {!problemText && !loading && (
        <div className="wp-empty-state">
          <div className="wp-quick-input-bar">
            <textarea
              className="wp-quick-input"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              placeholder="输入一道几何题开始解析…"
              rows={2}
              spellCheck={false}
            />
            <button
              className="wp-quick-submit"
              onClick={handleQuickSubmit}
              disabled={quickInput.trim().length < 3}
            >
              解析
            </button>
          </div>
          <div className="wp-empty-examples">
            <span className="wp-empty-examples-label">快速体验</span>
            <div className="wp-empty-examples-row">
              {[
                { text: '正方体棱长为2，求体对角线AG的长度', label: '正方体对角线' },
                { text: '球体半径为3，求体积和表面积', label: '球体体积' },
                { text: '正四棱锥底面边长4，高6，求体积', label: '棱锥体积' },
              ].map((ex) => (
                <button
                  key={ex.label}
                  className="wp-empty-example-btn"
                  onClick={() => handleParseProblem(ex.text)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isMobile ? (
        /* ── Mobile: 上下布局 ── */
        <div className="wp-main-mobile">
          {/* 3D 场景（可折叠） */}
          {show3D && (
            <div className="wp-canvas-mobile" ref={canvasRef}>
              <Canvas style={{ width: '100%', height: '100%' }}>
                <Canvas3D
                  geometry={geometry}
                  showFaces={showFaces}
                  showLabels={showLabels}
                  visibleLines={visibleLines}
                  hoveredLine={hoveredLine}
                  setHoveredLine={setHoveredLine}
                  allLines={mergedLines}
                  shownLengthLabels={shownLengthLabels}
                  searchedLine={searchedLine}
                  selectedEdge={selectedEdge}
                  onEdgeClick={setSelectedEdge}
                  edgeColorOverrides={edgeColorOverrides}
                  customVertices={customVertices}
                  highlightEdgeIds={visualIntent?.highlightEdgeIds || []}
                  highlightColor={visualIntent?.highlightColor || '#FF6B6B'}
                  auxLines={visualIntent?.auxLines || []}
                  cameraPreset={visualIntent?.cameraPreset || null}
                  faceOpacity={visualIntent?.faceOpacity ?? 0.42}
                  nonHighlightOpacity={visualIntent?.nonHighlightOpacity ?? 0.25}
                  vertexLabels={vertexLabels}
                  cameraResetKey={cameraResetKey}
                  sphereOverlay={visualIntent?.sphereOverlay || null}
                />
              </Canvas>
              <GeometryMiniControls
                geometry={geometry}
                onGeometryChange={handleGeometryChange}
                showFaces={showFaces}
                onToggleFaces={() => setShowFaces(prev => !prev)}
                showLabels={showLabels}
                onToggleLabels={() => setShowLabels(prev => !prev)}
                onResetCamera={handleResetCamera}
                onScreenshot={handleScreenshot}
                onShare={handleShare}
              />
            </div>
          )}

          {/* 讲解面板（优先） */}
          <div className="wp-explain-mobile">
            <ExplanationPanel
              steps={steps}
              currentStep={currentStep}
              onStepClick={handleStepClick}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
              loading={loading}
              loadingStage={loadingStage}
              parsedData={parsedData}
              problemText={problemText}
              error={error}
              onRetry={handleRetry}
              onAskFollowUp={handleAskFollowUp}
              followUpLoading={followUpLoading}
              followUpAnswer={followUpAnswer}
              onPlay={steps.length > 0 ? handleTogglePlay : undefined}
              isPlaying={isPlaying}
            />
          </div>
        </div>
      ) : (
        /* ── Desktop: 左右布局 ── */
        <div className="wp-main">
          {/* 讲解面板（左侧，优先） */}
          <div className="wp-explain-col">
            <ExplanationPanel
              steps={steps}
              currentStep={currentStep}
              onStepClick={handleStepClick}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
              loading={loading}
              loadingStage={loadingStage}
              parsedData={parsedData}
              problemText={problemText}
              error={error}
              onRetry={handleRetry}
              onAskFollowUp={handleAskFollowUp}
              followUpLoading={followUpLoading}
              followUpAnswer={followUpAnswer}
            />
          </div>

          {/* 3D 场景（右侧） */}
          <div className="wp-canvas-col" ref={canvasRef}>
            <Canvas style={{ width: '100%', height: '100%' }}>
              <Canvas3D
                geometry={geometry}
                showFaces={showFaces}
                showLabels={showLabels}
                visibleLines={visibleLines}
                hoveredLine={hoveredLine}
                setHoveredLine={setHoveredLine}
                allLines={mergedLines}
                shownLengthLabels={shownLengthLabels}
                searchedLine={searchedLine}
                selectedEdge={selectedEdge}
                onEdgeClick={setSelectedEdge}
                edgeColorOverrides={edgeColorOverrides}
                customVertices={customVertices}
                highlightEdgeIds={visualIntent?.highlightEdgeIds || []}
                highlightColor={visualIntent?.highlightColor || '#FF6B6B'}
                auxLines={visualIntent?.auxLines || []}
                cameraPreset={visualIntent?.cameraPreset || null}
                faceOpacity={visualIntent?.faceOpacity ?? 0.42}
                nonHighlightOpacity={visualIntent?.nonHighlightOpacity ?? 0.25}
                vertexLabels={vertexLabels}
                sphereOverlay={visualIntent?.sphereOverlay || null}
              />
            </Canvas>
            <GeometryMiniControls
              geometry={geometry}
              onGeometryChange={handleGeometryChange}
              showFaces={showFaces}
              onToggleFaces={() => setShowFaces(prev => !prev)}
              showLabels={showLabels}
              onToggleLabels={() => setShowLabels(prev => !prev)}
            />
          </div>
        </div>
      )}

      <TeacherModePanel
        totalSteps={steps.length}
        currentStep={currentStep}
        onStepChange={handleStepClick}
        onExportPPT={handleExportPPT}
        pptLoading={pptLoading}
      />
      {/* ── Share toast ── */}
      {shareToast && (
        <div className="wp-share-toast">
          <span className="wp-share-toast-text">{shareToast}</span>
          {shareToast.startsWith('http') && (
            <button
              className="wp-share-toast-copy"
              onClick={async () => {
                try { await navigator.clipboard.writeText(shareToast); setShareToast('链接已复制！') }
                catch { /* */ }
                setTimeout(() => setShareToast(''), 2000)
              }}
            >
              点此复制
            </button>
          )}
        </div>
      )}
    </div>
  )
}

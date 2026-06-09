import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import Canvas3D from '../features/solid-geometry/Canvas3D'
import GeometryMiniControls from '../components/GeometryMiniControls'
import ExplanationPanel from '../components/ExplanationPanel'
import TeacherModePanel from '../components/TeacherModePanel'
import PaywallModal from '../components/PaywallModal'
import AuthModal from '../components/AuthModal'
import { getLineDefinitions } from '../engines/lineDefinitions'
import { isPolyhedral } from '../engines/geometryEngine'
import { computeVerticesFromParams } from '../engines/constraintSolver'
import { aiAPI } from '../services/api'
import { computeVisualIntent } from '../engines/visualIntent'
import { createLabelMap, INTERNAL_LABELS } from '../engines/labelMapper'
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
  const { checkCanGenerate, recordUsage } = useSubscription()
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

  // ── Mobile ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767)
  const [show3D, setShow3D] = useState(true)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 767)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Auto-parse from URL query ────────────────────
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q.trim()) {
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

      // 保存到学习记录
      try {
        const saved = JSON.parse(localStorage.getItem('mathviz_history') || '[]')
        saved.unshift({
          date: new Date().toISOString(),
          text,
          type: parsed?.type || 'cube',
        })
        // 最多保存 50 条
        if (saved.length > 50) saved.length = 50
        localStorage.setItem('mathviz_history', JSON.stringify(saved))
      } catch { /* */ }

      setLoadingStage('done')
    } catch (err) {
      setError(err.message || '解析失败')
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
      <PaywallModal />
      <AuthModal />
    </div>
  )
}

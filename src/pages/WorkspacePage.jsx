import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import Canvas3D from '../features/solid-geometry/Canvas3D'
import EdgePropertyPanel from '../features/solid-geometry/EdgePropertyPanel'
import GeometryMiniControls from '../components/GeometryMiniControls'
import WorkspaceToolbar from '../components/WorkspaceToolbar'
import ExplanationPanel from '../components/ExplanationPanel'
import WorkspaceStatusBar from '../components/WorkspaceStatusBar'
import PaywallModal from '../components/PaywallModal'
import AuthModal from '../components/AuthModal'
import { getLineDefinitions } from '../engines/lineDefinitions'
import { isPolyhedral } from '../engines/geometryEngine'
import { computeVerticesFromParams, getEdgeDirectionGroups, getDefaultEdgeLengths } from '../engines/constraintSolver'
import { parseProblem } from '../engines/problemParser'
import { generateLocalSteps } from '../engines/explanationEngine'
import { generatePPT } from '../engines/pptExporter'
import { computeVisualIntent } from '../engines/visualIntent'
import { useAppContext } from '../contexts/AppContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { GEOMETRY_NAMES } from '../constants'
import './WorkspacePage.css'

// ── Default constraint params ─────────────────────
function defaultConstraintParams(type) {
  if (type === 'cuboid') {
    return { constraintMode: 'cuboid', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
  }
  return { constraintMode: 'cube', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
}

export default function WorkspacePage() {
  const { apiKey, setApiKey } = useAppContext()
  const { checkCanGenerate, checkCanExportPpt, checkCanExportImage, recordUsage, isPro, isTeacher } = useSubscription()
  const { saveWorkspace, loadWorkspace } = useWorkspace()
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

  // ── Mobile ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767)

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

  // ── Parse problem (AI or local) with progressive stages ──
  const handleParseProblem = useCallback(async (text) => {
    if (!checkCanGenerate()) return

    setProblemText(text)
    setLoading(true)
    setLoadingStage('parsing')
    setError(null)

    try {
      // Stage 1: Parse
      let result
      try {
        result = await parseProblem(text, apiKey)
      } catch {
        // Fallback: quick match from problemParser
        result = { type: 'cube', size: 2, labels: [], highlightLines: [], explanation: '快速匹配' }
      }
      setParsedData(result)
      setLoadingStage('reasoning')

      // Stage 2: Generate steps
      const localSteps = generateLocalSteps(text, result)
      setSteps(localSteps)
      setCurrentStep(0)
      setLoadingStage('visualizing')

      // Stage 3: Set up geometry
      setGeometry({
        type: result.type || 'cube',
        params: { size: result.size || 2 },
        ...defaultConstraintParams(result.type || 'cube'),
      })

      // Handle highlight lines from AI
      if (result.highlightLines?.length > 0) {
        const { lines: predefinedLines } = getLineDefinitions(result.type || 'cube', { size: result.size || 2 })
        const newCustomLines = []
        result.highlightLines.forEach(hl => {
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

      await recordUsage('generate', text)
      setLoadingStage('done')
    } catch (err) {
      setError(err.message || '解析失败')
      setLoadingStage('idle')
    } finally {
      setLoading(false)
    }
  }, [apiKey, checkCanGenerate, recordUsage])

  // ── Edge management callbacks ────────────────────
  const handleEdgeLengthChange = useCallback((edgeId, newLength) => {
    setGeometry(prev => {
      const mode = prev.constraintMode
      if (mode === 'cube') {
        return { ...prev, cubeSize: newLength, params: { ...prev.params, size: newLength } }
      }
      if (mode === 'cuboid') {
        const groups = getEdgeDirectionGroups(prev.type)
        const updated = { ...prev }
        for (const [gName, edges] of Object.entries(groups)) {
          if (edges.includes(edgeId)) {
            if (gName === '长 (X)') updated.cuboidA = newLength
            else if (gName === '宽 (Z)') updated.cuboidB = newLength
            else if (gName === '高 (Y)') updated.cuboidC = newLength
            break
          }
        }
        return updated
      }
      return { ...prev, freeEdgeLengths: { ...prev.freeEdgeLengths, [edgeId]: newLength } }
    })
  }, [])

  const handleEdgeColorChange = useCallback((edgeKey, color) => {
    setEdgeColorOverrides(prev => {
      if (color === null) { const next = { ...prev }; delete next[edgeKey]; return next }
      return { ...prev, [edgeKey]: color }
    })
  }, [])

  const handleQuickInput = useCallback((input) => {
    const match = input.trim().match(/^([A-Za-z']+)\s*=\s*([\d.]+)$/)
    if (!match) return false
    const [, edgeId, valueStr] = match
    const value = parseFloat(valueStr)
    if (isNaN(value) || value <= 0) return false
    handleEdgeLengthChange(edgeId, value)
    return true
  }, [handleEdgeLengthChange])

  const handleConstraintModeChange = useCallback((mode) => {
    setGeometry(prev => {
      const updated = { ...prev, constraintMode: mode }
      if (mode === 'cube') {
        updated.cubeSize = prev.cubeSize || 2
        updated.params = { ...prev.params, size: updated.cubeSize }
      }
      if (mode === 'cuboid') {
        updated.cuboidA = prev.cuboidA || 2
        updated.cuboidB = prev.cuboidB || 1.2
        updated.cuboidC = prev.cuboidC || 2
      }
      if (mode === 'free') {
        updated.freeEdgeLengths = getDefaultEdgeLengths(prev.type, 'cube', { cubeSize: prev.cubeSize || 2 })
      }
      return updated
    })
  }, [])

  const handleGeometryChange = useCallback((type, params) => {
    setGeometry({
      type,
      params: { size: params?.size ?? 2 },
      ...defaultConstraintParams(type),
    })
  }, [])

  // ── Merged lines ─────────────────────────────────
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
    const merged = [...lines, ...customLines]
    if (Object.keys(edgeColorOverrides).length > 0) {
      return merged.map(l => {
        const key = `${l.id}|${l.category}`
        return edgeColorOverrides[key] ? { ...l, colorOverride: edgeColorOverrides[key] } : l
      })
    }
    return merged
  }, [geometry.type, geometry.params.size, customLines, edgeColorOverrides, customVertices])

  // ── Selected edge data ───────────────────────────
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdge) return null
    const { lines } = getLineDefinitions(geometry.type, geometry.params, customVertices)
    return [...lines, ...customLines].find(l => `${l.id}|${l.category}` === selectedEdge) || null
  }, [selectedEdge, geometry.type, geometry.params, customLines, customVertices])

  const polyhedral = isPolyhedral(geometry.type)

  // ── VisualIntent — Step→3D deterministic mapping ──
  const visualIntent = useMemo(() => {
    const step = steps[currentStep]
    if (!step || !parsedData) return null
    return computeVisualIntent(step, parsedData, problemText)
  }, [currentStep, steps, parsedData, problemText])

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

  // ── Export ───────────────────────────────────────
  const handleExportPpt = useCallback(async () => {
    if (!checkCanExportPpt()) return
    try {
      const ws = { problemText, steps, parsedData: { type: geometry.type, size: geometry.params.size } }
      await generatePPT(ws, canvasRef.current)
    } catch (err) {
      setError('PPT 导出失败: ' + err.message)
    }
  }, [checkCanExportPpt, problemText, steps, geometry.type, geometry.params.size])

  const handleExportImage = useCallback(async () => {
    if (!checkCanExportImage()) return
    try {
      const { toPng } = await import('html-to-image')
      const el = canvasRef.current
      if (!el) return
      const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#f8f9fb' })
      const link = document.createElement('a')
      link.download = `MathViz-${geometry.type}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      setError('图片导出失败')
    }
  }, [checkCanExportImage, geometry.type])

  return (
    <div className="workspace-page">
      <WorkspaceToolbar
        title={problemText?.slice(0, 40) || 'MathViz 工作台'}
        onExportPpt={handleExportPpt}
        onExportImage={handleExportImage}
      />

      <div className="wp-main">
        {/* 3D Canvas */}
        <div className={`wp-canvas-wrap ${isMobile ? 'mobile' : ''}`} ref={canvasRef}>
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
              // ── VisualIntent-driven ──
              highlightEdgeIds={visualIntent?.highlightEdgeIds || []}
              highlightColor={visualIntent?.highlightColor || '#FF6B6B'}
              auxLines={visualIntent?.auxLines || []}
              cameraPreset={visualIntent?.cameraPreset || null}
              faceOpacity={visualIntent?.faceOpacity ?? 0.42}
              nonHighlightOpacity={visualIntent?.nonHighlightOpacity ?? 0.25}
              visibleCategories={visualIntent?.visibleCategories || null}
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

          {/* Mobile: floating edge panel */}
          {isMobile && selectedEdge && selectedEdgeData && polyhedral && (
            <div className="wp-floating-edge">
              <EdgePropertyPanel
                edgeKey={selectedEdge}
                edgeData={selectedEdgeData}
                geometry={geometry}
                edgeColorOverrides={edgeColorOverrides}
                onEdgeLengthChange={handleEdgeLengthChange}
                onEdgeColorChange={handleEdgeColorChange}
                onClose={() => setSelectedEdge(null)}
              />
            </div>
          )}
        </div>

        {/* Explanation Panel */}
        <ExplanationPanel
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          onNext={handleNextStep}
          onPrev={handlePrevStep}
          loading={loading}
          loadingStage={loadingStage}
          parsedData={parsedData}
          error={error}
        />
      </div>

      <WorkspaceStatusBar />

      <PaywallModal />
      <AuthModal />
    </div>
  )
}

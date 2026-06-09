import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import Canvas3D from '../features/solid-geometry/Canvas3D'
import GeometryMiniControls from '../components/GeometryMiniControls'
import ExplanationPanel from '../components/ExplanationPanel'
import WorkspaceStatusBar from '../components/WorkspaceStatusBar'
import AuthModal from '../components/AuthModal'
import { getLineDefinitions } from '../engines/lineDefinitions'
import { isPolyhedral } from '../engines/geometryEngine'
import { quickMatch } from '../engines/problemParser'
import { generateLocalSteps } from '../engines/explanationEngine'
import { computeVisualIntent } from '../engines/visualIntent'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { EXAMPLES, GEOMETRIES } from '../constants'
import { aiAPI } from '../services/api'
import './LandingPage.css'

function defaultGeometry(type) {
  if (type === 'cuboid') {
    return { type, params: { size: 2 }, constraintMode: 'cuboid', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
  }
  return { type, params: { size: 2 }, constraintMode: 'cube', cubeSize: 2, cuboidA: 2, cuboidB: 1.2, cuboidC: 2, freeEdgeLengths: {} }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { apiKey } = useAppContext()
  const { checkCanGenerate, recordUsage, isPro, plan } = useSubscription()

  // ── Input state ──
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  // ── Workspace state ──
  const [geometry, setGeometry] = useState(() => defaultGeometry('cube'))
  const [showFaces, setShowFaces] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [visibleLines, setVisibleLines] = useState(() => new Set())
  const [hoveredLine, setHoveredLine] = useState(null)
  const [problemText, setProblemText] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('idle')
  const [error, setError] = useState(null)

  const polyhedral = isPolyhedral(geometry.type)

  // ── VisualIntent — Step→3D deterministic mapping ──
  const visualIntent = useMemo(() => {
    const step = steps[currentStep]
    if (!step || !parsedData) return null
    return computeVisualIntent(step, parsedData, problemText)
  }, [currentStep, steps, parsedData, problemText])

  // ── Lines ──
  const mergedLines = useMemo(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params)
    return lines
  }, [geometry.type, geometry.params])

  // ── Init visible lines ──
  useEffect(() => {
    const { lines } = getLineDefinitions(geometry.type, geometry.params)
    const defaults = new Set(
      lines
        .filter(l => ['棱', '底面边', '顶面边', '侧棱'].includes(l.category) && !l.dashed)
        .map(l => `${l.id}|${l.category}`)
    )
    setVisibleLines(defaults)
  }, [geometry.type])

  // ── Auto-load first example ──
  useEffect(() => {
    handleGenerate(EXAMPLES[0].text, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate ──
  const handleGenerate = useCallback(async (text, silent = false) => {
    // Pro 用户不限制次数
    if (!isPro && !checkCanGenerate()) return

    setProblemText(text)
    setLoading(true)
    setLoadingStage('parsing')
    setError(null)
    if (!silent) setHasGenerated(true)

    try {
      // ── 所有用户：调用后端 DeepSeek AI（临时放开，测试用）──
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

        setGeometry(defaultGeometry(parsed?.type || 'cube'))
        setLoadingStage('done')
      }

      await recordUsage('generate', text)
    } catch (err) {
      setError(err.message || '解析失败，请重试')
      // AI 失败时降级到本地模板
      try {
        const parsed = quickMatch(text) || { type: 'cube', size: 2, labels: [], highlightLines: [], explanation: '' }
        setParsedData(parsed)
        const fallbackSteps = generateLocalSteps(text, parsed)
        setSteps(fallbackSteps)
        setCurrentStep(0)
        setGeometry(defaultGeometry(parsed.type || 'cube'))
        setError(null)
      } catch { /* */ }
    } finally {
      setLoading(false)
      setLoadingStage('idle')
    }
  }, [isPro, checkCanGenerate, recordUsage])

  // ── Input handlers ──
  const handleSubmit = () => {
    const text = input.trim()
    if (text.length < 3) return
    handleGenerate(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExample = (text) => {
    handleGenerate(text)
  }

  const handleGeometryChange = useCallback((type, params) => {
    setGeometry(defaultGeometry(type))
  }, [])

  const handleStepClick = useCallback((index) => {
    setCurrentStep(index)
  }, [])

  const handleNextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  return (
    <div className="landing">
      {/* ── Hero section ────────────────────────────── */}
      <section className={`landing-hero ${hasGenerated ? 'collapsed' : ''}`}>
        <h1 className="landing-title">
          输入一道几何题，AI 生成 3D 分步讲解
        </h1>
        <p className="landing-subtitle">
          自动建模 · 辅助线标注 · 逐步骤推导 · 一键生成
        </p>

        {/* Input */}
        <div className={`landing-input-wrap ${focused ? 'focused' : ''}`}>
          <textarea
            className="landing-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="输入一道几何题..."
            rows={2}
            spellCheck={false}
          />
          <div className="landing-input-footer">
            <span className="landing-input-hint">
              {input.trim().length < 3 ? '至少输入 3 个字符' : '按 Enter 生成'}
            </span>
            <button
              className="landing-submit"
              onClick={handleSubmit}
              disabled={input.trim().length < 3}
            >
              生成讲解
              <span className="landing-submit-shortcut">↵</span>
            </button>
          </div>
        </div>

        {/* Examples from constants */}
        <div className="landing-examples">
          <span className="landing-examples-label">试试这些例子</span>
          <div className="landing-examples-row">
            {EXAMPLES.map((ex, i) => (
              <button
                key={ex.id}
                className="landing-example"
                onClick={() => handleExample(ex.text)}
                title={ex.text}
              >
                {ex.title}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="landing-error">{error}</div>}
      </section>

      {/* ── Workspace section ────────────────────────── */}
      <section className="landing-workspace">
        {/* 3D Canvas */}
        <div className="lw-canvas">
          <Canvas style={{ width: '100%', height: '100%' }}>
            <Canvas3D
              geometry={geometry}
              showFaces={showFaces}
              showLabels={showLabels}
              visibleLines={visibleLines}
              hoveredLine={hoveredLine}
              setHoveredLine={setHoveredLine}
              allLines={mergedLines}
              shownLengthLabels={new Set()}
              searchedLine=""
              selectedEdge={null}
              onEdgeClick={() => {}}
              edgeColorOverrides={{}}
              // ── VisualIntent-driven ──
              highlightEdgeIds={visualIntent?.highlightEdgeIds || []}
              highlightColor={visualIntent?.highlightColor || '#FF6B6B'}
              auxLines={visualIntent?.auxLines || []}
              cameraPreset={visualIntent?.cameraPreset || null}
              faceOpacity={visualIntent?.faceOpacity ?? 0.42}
              nonHighlightOpacity={visualIntent?.nonHighlightOpacity ?? 0.25}
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

        {/* Right column: Explanation panel + workspace entry */}
        <div className="lw-sidebar">
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

          {/* Go to workspace */}
          {steps.length > 0 && !loading && (
            <button
              className="lw-goto-workspace"
              onClick={() => navigate(`/workspace?q=${encodeURIComponent(problemText)}`)}
            >
              去工作台继续 →
            </button>
          )}
        </div>
      </section>

      {/* Status bar */}
      <WorkspaceStatusBar />

      <AuthModal />
    </div>
  )
}

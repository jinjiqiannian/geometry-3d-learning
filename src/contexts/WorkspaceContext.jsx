import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useSubscription } from './SubscriptionContext'

const WorkspaceContext = createContext(null)

// 自用版历史只存本机。键名沿用旧值，这样浏览器里已有的记录不会丢。
const STORAGE_KEY = 'jidong_workspaces'
const MAX_LOCAL = 20

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function WorkspaceProvider({ children }) {
  const { checkCanGenerate, checkCanAiExplain, recordUsage } = useSubscription()

  const [workspace, setWorkspace] = useState({
    id: null,
    problemText: '',
    parsedData: null,
    steps: [],
    currentStep: 0,
    geometry: null,
    loading: false,
    error: null,
  })

  // ── Set problem text ──
  const setProblem = useCallback((text) => {
    setWorkspace(prev => ({
      ...prev,
      problemText: text,
      parsedData: null,
      steps: [],
      currentStep: 0,
      geometry: null,
      error: null,
    }))
  }, [])

  // ── Parse problem (AI or local) ──
  const parseAndGenerate = useCallback(async (text, userApiKey) => {
    // Check usage limit
    if (checkCanGenerate && !checkCanGenerate()) {
      return // Paywall triggered
    }

    setWorkspace(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { parseProblem } = await import('../engines/problemParser')
      const parsedData = await parseProblem(text, userApiKey || '')

      // V2 优先；失败则回退 V1（explanationEngine 模板路径保持不变）
      const { tryV2Proof } = await import('../engines/proofEngine/v2/adapter.js')
      const v2Steps = tryV2Proof(parsedData)
      let steps = v2Steps
      if (!steps) {
        const { generateLocalSteps } = await import('../engines/explanationEngine')
        steps = generateLocalSteps(text, parsedData)
      }

      setWorkspace(prev => ({
        ...prev,
        problemText: text,
        parsedData,
        steps,
        currentStep: 0,
        geometry: {
          type: parsedData.type || 'cube',
          params: { size: parsedData.size || 2 },
          labels: parsedData.labels || [],
          highlightLines: parsedData.highlightLines || [],
        },
        loading: false,
      }))

      // Record usage
      if (recordUsage) {
        await recordUsage('generate', text)
      }
    } catch (error) {
      setWorkspace(prev => ({
        ...prev,
        loading: false,
        error: error.message || '解析失败',
      }))
    }
  }, [checkCanGenerate, recordUsage])

  // ── Step navigation ──
  const goToStep = useCallback((n) => {
    setWorkspace(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(n, prev.steps.length - 1)),
    }))
  }, [])

  const nextStep = useCallback(() => {
    setWorkspace(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.steps.length - 1),
    }))
  }, [])

  const prevStep = useCallback(() => {
    setWorkspace(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }))
  }, [])

  // ── Update scene state for a step ──
  const updateSceneState = useCallback((stepIndex, sceneState) => {
    setWorkspace(prev => {
      const steps = [...prev.steps]
      if (steps[stepIndex]) {
        steps[stepIndex] = { ...steps[stepIndex], sceneState }
      }
      return { ...prev, steps }
    })
  }, [])

  // ── Update geometry ──
  const updateGeometry = useCallback((geometry) => {
    setWorkspace(prev => ({ ...prev, geometry: { ...prev.geometry, ...geometry } }))
  }, [])

  // ── Save workspace to localStorage ──
  // 自用版没有云端，直接写本机。超出 20 条丢弃最旧的。
  const saveWorkspace = useCallback(async () => {
    try {
      const saved = readLocal()
      saved.unshift({ ...workspace, savedAt: new Date().toISOString() })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, MAX_LOCAL)))
    } catch (err) {
      console.warn('WorkspaceContext: 保存到 localStorage 失败', err)
    }
  }, [workspace])

  // ── Load workspace from localStorage ──
  // 入参是保存时的时间戳（savedAt）或数组下标。
  const loadWorkspace = useCallback(async (id) => {
    const data = readLocal().find((w, i) => w.savedAt === id || i === id)
    if (!data) return

    setWorkspace({
      id: data.id ?? null,
      problemText: data.problemText || '',
      parsedData: data.parsedData || null,
      steps: data.steps || [],
      currentStep: 0,
      geometry: data.geometry || null,
      loading: false,
      error: null,
    })
  }, [])

  // ── Current step data (for Canvas3D sceneState binding) ──
  const currentSceneState = useMemo(() => {
    const step = workspace.steps[workspace.currentStep]
    return step?.sceneState || null
  }, [workspace.steps, workspace.currentStep])

  const value = useMemo(() => ({
    workspace,
    currentSceneState,
    setProblem,
    parseAndGenerate,
    goToStep,
    nextStep,
    prevStep,
    updateSceneState,
    updateGeometry,
    saveWorkspace,
    loadWorkspace,
  }), [workspace, currentSceneState, setProblem, parseAndGenerate,
       goToStep, nextStep, prevStep, updateSceneState, updateGeometry, saveWorkspace, loadWorkspace])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

export default WorkspaceContext

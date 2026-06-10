import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useSupabase } from './SupabaseContext'
import { useSubscription } from './SubscriptionContext'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { supabase, user, connected } = useSupabase()
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

      // Generate local template steps
      const { generateLocalSteps } = await import('../engines/explanationEngine')
      const steps = generateLocalSteps(text, parsedData)

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

  // ── Generate AI-enhanced steps (Pro feature) ──
  const generateAiSteps = useCallback(async (userApiKey) => {
    if (checkCanAiExplain && !checkCanAiExplain()) return

    setWorkspace(prev => ({ ...prev, loading: true }))

    try {
      // Call Claude API for detailed explanation
      const { generateAIExplanation } = await import('../engines/explanationEngine')
      const aiSteps = await generateAIExplanation(
        workspace.problemText,
        workspace.parsedData,
        userApiKey
      )

      setWorkspace(prev => ({
        ...prev,
        steps: aiSteps,
        loading: false,
      }))

      if (recordUsage) {
        await recordUsage('ai_explain', workspace.problemText, workspace.id)
      }
    } catch (error) {
      setWorkspace(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'AI讲解生成失败',
      }))
    }
  }, [workspace.problemText, workspace.parsedData, workspace.id, checkCanAiExplain, recordUsage])

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

  // ── Save workspace to Supabase ──
  const saveWorkspace = useCallback(async () => {
    if (!connected || !user || !supabase) {
      // Save to localStorage fallback
      try {
        const saved = JSON.parse(localStorage.getItem('mathviz_workspaces') || '[]')
        saved.unshift({ ...workspace, savedAt: new Date().toISOString() })
        localStorage.setItem('mathviz_workspaces', JSON.stringify(saved.slice(0, 20)))
      } catch (err) {
        console.warn('WorkspaceContext: Failed to save workspace to localStorage', err)
      }
      return
    }

    const { data, error } = await supabase
      .from('workspaces')
      .upsert({
        id: workspace.id || undefined,
        user_id: user.id,
        title: workspace.problemText?.slice(0, 80) || '未命名',
        problem_text: workspace.problemText,
        parsed_data: workspace.parsedData,
        steps: workspace.steps,
        geometry: workspace.geometry,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!error && data) {
      setWorkspace(prev => ({ ...prev, id: data.id }))
    }
  }, [connected, user, supabase, workspace])

  // ── Load workspace from Supabase ──
  const loadWorkspace = useCallback(async (id) => {
    if (!connected || !supabase) return

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      setWorkspace({
        id: data.id,
        problemText: data.problem_text,
        parsedData: data.parsed_data,
        steps: data.steps || [],
        currentStep: 0,
        geometry: data.geometry || null,
        loading: false,
        error: null,
      })
    }
  }, [connected, supabase])

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
    generateAiSteps,
    goToStep,
    nextStep,
    prevStep,
    updateSceneState,
    updateGeometry,
    saveWorkspace,
    loadWorkspace,
  }), [workspace, currentSceneState, setProblem, parseAndGenerate, generateAiSteps,
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

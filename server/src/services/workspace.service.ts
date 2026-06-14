// ═══════════════════════════════════════════════════════
//  Workspace Service — CRUD + 回放 + 分享
// ═══════════════════════════════════════════════════════
import { supabase } from '../lib/supabase.js'
import { v4 as uuidv4 } from 'uuid'
import type {
  Workspace, WorkspaceListItem, Step, WorkspaceGeometry,
  ParsedProblem, PaginatedResponse,
} from '../types/index.js'

// ── Create ─────────────────────────────────────────

export async function createWorkspace(
  userId: string,
  problemText: string,
  parsedData?: ParsedProblem | null,
  steps?: Step[],
  geometry?: WorkspaceGeometry | null
): Promise<Workspace> {
  supabase
  const id = uuidv4()

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      id,
      user_id: userId,
      title: problemText.slice(0, 80) || '未命名题目',
      problem_text: problemText,
      parsed_data: parsedData || {},
      steps: steps || [],
      geometry: geometry || {},
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw new Error(`创建workspace失败: ${error.message}`)
  return data as Workspace
}

// ── Read ───────────────────────────────────────────

export async function getWorkspace(
  workspaceId: string,
  userId?: string
): Promise<Workspace | null> {
  supabase

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (error || !data) return null

  // Check access: owner OR public
  if (!data.is_public && (!userId || data.user_id !== userId)) {
    return null // Not authorized
  }

  return data as Workspace
}

export async function listWorkspaces(
  userId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<WorkspaceListItem>> {
  supabase
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('workspaces')
    .select('id, title, problem_text, geometry, steps, is_public, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`查询workspace列表失败: ${error.message}`)

  const items: WorkspaceListItem[] = (data || []).map((w: any) => ({
    id: w.id,
    title: w.title,
    problem_text: w.problem_text,
    geometry_type: w.geometry?.type || null,
    step_count: Array.isArray(w.steps) ? w.steps.length : 0,
    is_public: w.is_public || false,
    created_at: w.created_at,
  }))

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

// ── Update ─────────────────────────────────────────

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  updates: {
    title?: string
    steps?: Step[]
    geometry?: WorkspaceGeometry
    parsedData?: ParsedProblem
    isPublic?: boolean
  }
): Promise<Workspace> {
  supabase

  // Verify ownership
  const { data: existing } = await supabase
    .from('workspaces')
    .select('user_id')
    .eq('id', workspaceId)
    .single()

  if (!existing || existing.user_id !== userId) {
    throw new Error('Workspace not found or access denied')
  }

  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  if (updates.title !== undefined) patch.title = updates.title
  if (updates.steps !== undefined) patch.steps = updates.steps
  if (updates.geometry !== undefined) patch.geometry = updates.geometry
  if (updates.parsedData !== undefined) patch.parsed_data = updates.parsedData
  if (updates.isPublic !== undefined) patch.is_public = updates.isPublic

  const { data, error } = await supabase
    .from('workspaces')
    .update(patch)
    .eq('id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(`更新workspace失败: ${error.message}`)
  return data as Workspace
}

// ── Delete ─────────────────────────────────────────

export async function deleteWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  supabase

  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('user_id', userId)

  if (error) throw new Error(`删除workspace失败: ${error.message}`)
}

// ── Fork ───────────────────────────────────────────

export async function forkWorkspace(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const source = await getWorkspace(workspaceId, userId)
  if (!source) throw new Error('源workspace不存在或无权访问')

  return createWorkspace(
    userId,
    source.problem_text,
    source.parsed_data,
    source.steps,
    source.geometry
  )
}

// ── Publish (share link) ───────────────────────────

export async function publishWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ shareUrl: string }> {
  await updateWorkspace(workspaceId, userId, { isPublic: true })

  // Generate share URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5179'
  const shareUrl = `${frontendUrl}/workspace?load=${workspaceId}`

  return { shareUrl }
}

// ── Replay data ────────────────────────────────────

export interface ReplayEvent {
  type: 'step_start' | 'scene_update' | 'step_end' | 'complete'
  step?: number
  duration?: number
  sceneState?: any
  totalSteps?: number
}

export async function* generateReplayEvents(
  workspaceId: string,
  userId?: string,
  fromStep = 0
): AsyncGenerator<ReplayEvent> {
  const workspace = await getWorkspace(workspaceId, userId)
  if (!workspace) throw new Error('Workspace not found')

  const steps = workspace.steps || []
  const totalSteps = steps.length

  for (let i = fromStep; i < totalSteps; i++) {
    const step = steps[i]

    // Emit step_start
    yield {
      type: 'step_start',
      step: step.step,
      duration: step.sceneState?.duration || 3000,
    }

    // Emit scene_update (the scene state to apply)
    if (step.sceneState) {
      yield {
        type: 'scene_update',
        step: step.step,
        sceneState: step.sceneState,
      }
    }

    // Simulate step duration (in real impl, this would be event-driven)
    await new Promise(r => setTimeout(r, 100)) // Small yield delay

    // Emit step_end
    yield { type: 'step_end', step: step.step }
  }

  // Emit complete
  yield { type: 'complete', totalSteps }
}

// ── Search ─────────────────────────────────────────

export async function searchPublicWorkspaces(
  query: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<WorkspaceListItem>> {
  supabase
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('workspaces')
    .select('id, title, problem_text, geometry, steps, is_public, created_at', { count: 'exact' })
    .eq('is_public', true)
    .ilike('problem_text', `%${query}%`)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`搜索失败: ${error.message}`)

  const items: WorkspaceListItem[] = (data || []).map((w: any) => ({
    id: w.id,
    title: w.title,
    problem_text: w.problem_text,
    geometry_type: w.geometry?.type || null,
    step_count: Array.isArray(w.steps) ? w.steps.length : 0,
    is_public: true,
    created_at: w.created_at,
  }))

  return {
    items,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

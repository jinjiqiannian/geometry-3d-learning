// ═══════════════════════════════════════════════════════
//  Teacher Service — 教师模式：讲稿 + 课程管理
// ═══════════════════════════════════════════════════════
import { getAnonClient } from '../db/client.js'
import { v4 as uuidv4 } from 'uuid'
import * as aiService from './ai.service.js'
import * as workspaceService from './workspace.service.js'
import type { TeacherScript, CourseCollection, NarrationPhrase } from '../types/index.js'

// ── Teacher Scripts ────────────────────────────────

export async function createTeacherScript(
  userId: string,
  workspaceId: string,
  options?: { title?: string; slideCount?: number }
): Promise<TeacherScript> {
  const workspace = await workspaceService.getWorkspace(workspaceId, userId)
  if (!workspace) throw new Error('Workspace not found')

  // Generate AI narration
  const narration = await aiService.generateNarration(
    workspace.problem_text,
    workspace.steps || [],
    userId
  )

  const supabase = getAnonClient()
  const id = uuidv4()

  const { data, error } = await supabase
    .from('teacher_scripts')
    .insert({
      id,
      workspace_id: workspaceId,
      user_id: userId,
      title: options?.title || workspace.title,
      narration,
      slide_count: options?.slideCount || 5,
      is_published: false,
    })
    .select('*')
    .single()

  if (error) throw new Error(`创建讲稿失败: ${error.message}`)
  return data as TeacherScript
}

export async function getTeacherScript(
  scriptId: string,
  userId?: string
): Promise<TeacherScript | null> {
  const supabase = getAnonClient()

  const { data, error } = await supabase
    .from('teacher_scripts')
    .select('*')
    .eq('id', scriptId)
    .single()

  if (error || !data) return null

  // Check access
  if (!data.is_published && (!userId || data.user_id !== userId)) {
    return null
  }

  return data as TeacherScript
}

export async function listTeacherScripts(
  userId: string
): Promise<TeacherScript[]> {
  const supabase = getAnonClient()

  const { data, error } = await supabase
    .from('teacher_scripts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`查询讲稿列表失败: ${error.message}`)
  return (data || []) as TeacherScript[]
}

export async function publishScript(
  scriptId: string,
  userId: string
): Promise<TeacherScript> {
  const supabase = getAnonClient()

  const { data, error } = await supabase
    .from('teacher_scripts')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('id', scriptId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw new Error(`发布讲稿失败: ${error.message}`)
  return data as TeacherScript
}

export async function deleteTeacherScript(
  scriptId: string,
  userId: string
): Promise<void> {
  const supabase = getAnonClient()

  const { error } = await supabase
    .from('teacher_scripts')
    .delete()
    .eq('id', scriptId)
    .eq('user_id', userId)

  if (error) throw new Error(`删除讲稿失败: ${error.message}`)
}

// ── Course Collections ─────────────────────────────

export async function createCollection(
  userId: string,
  title: string,
  description?: string,
  workspaceIds?: string[]
): Promise<CourseCollection> {
  const supabase = getAnonClient()
  const id = uuidv4()

  const { data, error } = await supabase
    .from('course_collections')
    .insert({
      id,
      user_id: userId,
      title,
      description: description || null,
      workspace_ids: workspaceIds || [],
    })
    .select('*')
    .single()

  if (error) throw new Error(`创建课程集失败: ${error.message}`)
  return data as CourseCollection
}

export async function listCollections(
  userId: string
): Promise<CourseCollection[]> {
  const supabase = getAnonClient()

  const { data, error } = await supabase
    .from('course_collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`查询课程集失败: ${error.message}`)
  return (data || []) as CourseCollection[]
}

export async function addToCollection(
  collectionId: string,
  userId: string,
  workspaceId: string
): Promise<CourseCollection> {
  const supabase = getAnonClient()

  const { data: coll, error: getErr } = await supabase
    .from('course_collections')
    .select('*')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .single()

  if (getErr || !coll) throw new Error('课程集不存在')

  const ids = coll.workspace_ids || []
  if (!ids.includes(workspaceId)) {
    ids.push(workspaceId)
  }

  const { data, error } = await supabase
    .from('course_collections')
    .update({ workspace_ids: ids, updated_at: new Date().toISOString() })
    .eq('id', collectionId)
    .select('*')
    .single()

  if (error) throw new Error(`添加失败: ${error.message}`)
  return data as CourseCollection
}

// ── Classroom Mode Config ──────────────────────────

export interface ClassroomConfig {
  workspaceId: string
  scriptId?: string
  autoPlay: boolean
  playSpeed: number
  showSubtitles: boolean
  darkMode: boolean
}

export function getDefaultClassroomConfig(workspaceId: string): ClassroomConfig {
  return {
    workspaceId,
    autoPlay: false,
    playSpeed: 1,
    showSubtitles: true,
    darkMode: false,
  }
}

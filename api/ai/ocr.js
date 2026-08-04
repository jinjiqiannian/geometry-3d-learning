/**
 * Vercel Serverless — 拍照识题（不依赖 Railway）
 * POST /api/ai/ocr  body: { imageBase64 }
 *
 * 环境变量（Vercel → Settings → Environment Variables）：
 *   VISION_PROVIDER=zhipu
 *   VISION_API_KEY=...
 */

const OCR_SYSTEM_PROMPT = `你是中学立体几何 OCR + 读图助手。用户上传题目照片/截图。

输出严格 JSON（不要 markdown 代码块、不要解题）：
{
  "text": "完整题干纯文本（含(1)(2)小问），保留 P-ABCD、⊥、∥、√ 等符号",
  "visionHints": {
    "relations": ["E midpoint PD", "PA perpendicular plane ABCD"],
    "points": ["P","A","B","C","D","E"],
    "planes": ["ABCD","PAC","AEC"]
  }
}

rules:
1. text 必须完整、以卷面文字为准；图中关系写进 visionHints，不要编造文字没有的题干。
2. relations 只用简短英文短语。
3. 看不清的字段省略；visionHints 可为空对象。`

const PRESETS = {
  zhipu: {
    base: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v-flash',
  },
  qwen: {
    base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-plus',
  },
  siliconflow: {
    base: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-VL-32B-Instruct',
  },
}

function normalizeOcrPayload(raw) {
  let cleaned = String(raw || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (!cleaned) throw new Error('未能识别出文字，请手动补全题干')

  const pickHints = (vh) => {
    if (!vh || typeof vh !== 'object') return undefined
    return {
      relations: Array.isArray(vh.relations)
        ? vh.relations.filter((r) => typeof r === 'string')
        : undefined,
      points: Array.isArray(vh.points)
        ? vh.points.filter((p) => typeof p === 'string')
        : undefined,
      planes: Array.isArray(vh.planes)
        ? vh.planes.filter((p) => typeof p === 'string')
        : undefined,
    }
  }

  const fromObj = (obj) => {
    if (!obj || typeof obj !== 'object') return null
    if (typeof obj.text !== 'string' || !obj.text.trim()) return null
    return { text: obj.text.trim(), visionHints: pickHints(obj.visionHints) }
  }

  try {
    const hit = fromObj(JSON.parse(cleaned))
    if (hit) return hit
  } catch {
    /* continue */
  }

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const hit = fromObj(JSON.parse(cleaned.slice(start, end + 1)))
      if (hit) return hit
    } catch {
      /* continue */
    }
  }

  if (/^\s*\{/.test(cleaned) && /"text"\s*:/.test(cleaned)) {
    const m = cleaned.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/)
    if (m?.[1]) {
      const text = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim()
      if (text) return { text }
    }
    throw new Error('识图结果格式异常，请重试或手动输入题干')
  }

  return { text: cleaned }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
  maxDuration: 30,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '只用 POST' })
  }

  try {
    const imageBase64 = req.body?.imageBase64
    if (!imageBase64 || String(imageBase64).length < 32) {
      return res.status(400).json({ success: false, error: '请上传有效图片' })
    }

    const dataUrl = String(imageBase64).startsWith('data:')
      ? String(imageBase64)
      : `data:image/jpeg;base64,${imageBase64}`

    const apiKey = process.env.VISION_API_KEY || ''
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: '未配置识图 Key：请在 Vercel 设置 VISION_API_KEY',
      })
    }

    const provider = String(process.env.VISION_PROVIDER || 'zhipu').toLowerCase()
    const preset = PRESETS[provider]
    const base = (
      process.env.VISION_API_BASE ||
      preset?.base ||
      ''
    ).replace(/\/$/, '')
    const model = process.env.VISION_API_MODEL || preset?.model || ''
    if (!base || !model) {
      return res.status(500).json({
        success: false,
        error: '请设置 VISION_PROVIDER=zhipu（或 qwen）',
      })
    }

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: OCR_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请按 JSON 提取完整题干 text 与构图 visionHints：',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      const msg =
        errBody?.error?.message ||
        `视觉 OCR 失败 (${response.status}, ${provider})`
      return res.status(502).json({ success: false, error: msg })
    }

    const data = await response.json()
    const raw = (data?.choices?.[0]?.message?.content || '').trim()
    if (!raw) {
      return res
        .status(500)
        .json({ success: false, error: '未能识别出文字，请手动补全题干' })
    }

    const result = normalizeOcrPayload(raw)
    return res.status(200).json({
      success: true,
      data: {
        text: result.text,
        visionHints: result.visionHints || null,
      },
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || '识图失败',
    })
  }
}

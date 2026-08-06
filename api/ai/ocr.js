/**
 * Vercel Serverless — 拍照识题（不依赖 Railway）
 * POST /api/ai/ocr  body: { imageBase64 }
 *
 * 环境变量（Vercel → Settings → Environment Variables）：
 *   VISION_PROVIDER=zhipu
 *   VISION_API_KEY=...
 */

const OCR_SYSTEM_PROMPT = `你是中学试题 OCR 助手。用户上传题目照片/截图，科目可能是数学、物理、化学等。

只识别文字，禁止解题、改写、补全或套用任何例题模板。

输出严格 JSON（不要 markdown 代码块）：
{
  "text": "完整题干纯文本（含选项与(1)(2)小问），保留 ⊥、∥、√、π、分数与物理量符号",
  "visionHints": {
    "relations": [],
    "points": [],
    "planes": []
  }
}

rules:
1. text 必须以卷面可见文字为准；看不清就省略，禁止编造卷面没有的句子。
2. 物理题照录 B、l、k、v、磁场、射出 等原文；不要改成立体几何题。
3. 仅当图中有立体几何点线面关系时，才往 visionHints.relations 写英文短短语；否则 visionHints 用空对象。
4. 禁止输出与输入图无关的「矩形/中点/求证平行」类模板题干。`

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
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
  maxDuration: 30,
}

function readVisionKey() {
  return (
    process.env.VISION_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.GLM_API_KEY ||
    ''
  ).trim()
}

function visionEnvDiag() {
  const names = Object.keys(process.env)
    .filter((k) => /VISION|ZHIPU|GLM|OCR/i.test(k))
    .sort()
  const apiKey = readVisionKey()
  return {
    ok: true,
    hasVisionApiKey: apiKey.length > 0,
    visionApiKeyLength: apiKey.length,
    provider: process.env.VISION_PROVIDER || null,
    visionRelatedEnvNames: names,
    hint:
      apiKey.length > 0
        ? 'Key 已注入，可上传识图'
        : 'Key 未注入：请确认变量加在绑定 www.jiheweidu.cn 的那个 Vercel 项目里，删掉后重加，再 Deployments → 推送新部署（不要只 Redeploy 旧缓存）',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // 浏览器打开此地址可检查 Key 是否注入（不泄露密钥内容）
  if (req.method === 'GET') {
    return res.status(200).json(visionEnvDiag())
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

    const apiKey = readVisionKey()
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: '未配置识图 Key：请在绑定 jiheweidu.cn 的 Vercel 项目设置 VISION_API_KEY 后重新部署',
        diag: visionEnvDiag(),
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
        max_tokens: 2048,
        temperature: 0,
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

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
4. 禁止输出与输入图无关的「矩形/中点/求证平行」类模板题干。
5. 只取一道题。画面里往往不止有题目，但 text 里只能有一道题的题干。
6. 以下内容一律丢弃，不要写进 text：页眉页脚、页码、栏目标题、章节名、书名、
   出版社、二维码旁的说明文字、只露出半截的相邻题目、手写批注与答案解析。
7. 画面里有多道完整题目时，取居中、字最大、最完整的那一道；
   禁止把多道题拼接成一段。
8. 若画面主体不是题目（如整页课本、试卷封面、纯图无文字），
   text 返回空字符串 ""，不要拿别处的文字凑数。`

const PRESETS = {
  zhipu: {
    base: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v-flash',
    // 智谱 GLM-4V：url 只要纯 base64，不要 data: 前缀
    stripDataUrlPrefix: true,
    maxTokens: 1024,
  },
  qwen: {
    base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-plus',
    stripDataUrlPrefix: false,
    maxTokens: 1200,
  },
  siliconflow: {
    base: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-VL-32B-Instruct',
    stripDataUrlPrefix: false,
    maxTokens: 1200,
  },
  deepseek: {
    base: 'https://api.deepseek.com',
    // 视觉只挂在 Flash 上；deepseek-v4-pro 不支持图片输入
    model: 'deepseek-flash',
    // OpenAI 兼容格式：url 需带 data: 前缀
    stripDataUrlPrefix: false,
    maxTokens: 1200,
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
  maxDuration: 60,
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
  const provider = String(process.env.VISION_PROVIDER || 'zhipu').toLowerCase()
  const preset = PRESETS[provider]
  // 只回显环境变量会骗人：provider 设了但代码里没有对应预设时，
  // PRESETS[provider] || PRESETS.zhipu 会静默退回 zhipu 端点，
  // 拿别家的 key 去请求，报一个与真实原因毫不相干的错。
  const presetMissing = Boolean(process.env.VISION_PROVIDER) && !preset
  return {
    ok: true,
    hasVisionApiKey: apiKey.length > 0,
    visionApiKeyLength: apiKey.length,
    provider,
    presetFound: Boolean(preset),
    effectiveBase: process.env.VISION_API_BASE || preset?.base || '(无)',
    effectiveModel: process.env.VISION_API_MODEL || preset?.model || '(无)',
    visionRelatedEnvNames: names,
    hint: presetMissing
      ? `VISION_PROVIDER="${provider}" 在代码里没有对应预设，请求会静默发往 ${PRESETS.zhipu.base}，拿别家的 key 必然失败`
      : apiKey.length > 0
        ? 'Key 已注入，可上传识图'
        : 'Key 未注入：请确认变量加在绑定 www.jiheweidu.cn 的那个 Vercel 项目里，删掉后重加，再 Deployments → 推送新部署（不要只 Redeploy 旧缓存）',
  }
}

/** 拆成纯 base64 + mime，供各家视觉 API 组装 */
function splitImagePayload(imageBase64) {
  const raw = String(imageBase64 || '').trim()
  const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s)
  if (m) {
    return { mime: m[1], base64: m[2].replace(/\s/g, '') }
  }
  return {
    mime: 'image/jpeg',
    base64: raw.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, ''),
  }
}

function buildImageUrl(providerCfg, mime, base64) {
  if (providerCfg?.stripDataUrlPrefix) {
    return base64
  }
  return `data:${mime};base64,${base64}`
}

export { splitImagePayload, buildImageUrl, normalizeOcrPayload }

async function callVisionChat({
  base,
  model,
  apiKey,
  imageUrl,
  maxTokens,
}) {
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
              text: '请按 JSON 提取画面主体那一道题的题干 text 与构图 visionHints：',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  })

  const errBody = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      errBody?.error?.message ||
      errBody?.msg ||
      `视觉 OCR 失败 (${response.status})`
    const err = new Error(msg)
    err.status = response.status
    err.body = errBody
    throw err
  }

  const raw = (errBody?.choices?.[0]?.message?.content || '').trim()
  if (!raw) {
    throw new Error('未能识别出文字，请手动补全题干')
  }
  return raw
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

    const apiKey = readVisionKey()
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          '未配置识图 Key：请在绑定 jiheweidu.cn 的 Vercel 项目设置 VISION_API_KEY 后重新部署',
        diag: visionEnvDiag(),
      })
    }

    const provider = String(process.env.VISION_PROVIDER || 'zhipu').toLowerCase()
    const preset = PRESETS[provider] || PRESETS.zhipu
    const base = (
      process.env.VISION_API_BASE ||
      preset?.base ||
      ''
    ).replace(/\/$/, '')
    const model = process.env.VISION_API_MODEL || preset?.model || ''
    if (!base || !model) {
      return res.status(500).json({
        success: false,
        error: '请设置 VISION_PROVIDER=zhipu（或 qwen / siliconflow / deepseek）',
      })
    }

    const { mime, base64 } = splitImagePayload(imageBase64)
    if (!base64 || base64.length < 32) {
      return res.status(400).json({ success: false, error: '请上传有效图片' })
    }

    // 过大请求易拖垮函数；约 3MB base64 仍在 Vercel 4mb body 内
    if (base64.length > 3_000_000) {
      return res.status(413).json({
        success: false,
        error: '图片过大，请换更清晰的截图或压缩后再试',
      })
    }

    const providerCfg = {
      stripDataUrlPrefix: preset.stripDataUrlPrefix === true,
      maxTokens: preset.maxTokens || 1024,
    }
    // 允许环境变量覆盖
    if (process.env.VISION_STRIP_DATA_URL === '1') {
      providerCfg.stripDataUrlPrefix = true
    }
    if (process.env.VISION_STRIP_DATA_URL === '0') {
      providerCfg.stripDataUrlPrefix = false
    }

    const primaryUrl = buildImageUrl(providerCfg, mime, base64)
    let raw
    try {
      raw = await callVisionChat({
        base,
        model,
        apiKey,
        imageUrl: primaryUrl,
        maxTokens: providerCfg.maxTokens,
      })
    } catch (firstErr) {
      const msg = String(firstErr?.message || '')
      const formatFail =
        /图片输入格式|解析错误|image|base64|format|1210|参数/i.test(msg)
      // 智谱格式翻车时，自动换另一种 url 形态再试一次
      if (formatFail) {
        const altUrl = providerCfg.stripDataUrlPrefix
          ? `data:${mime};base64,${base64}`
          : base64
        try {
          raw = await callVisionChat({
            base,
            model,
            apiKey,
            imageUrl: altUrl,
            maxTokens: providerCfg.maxTokens,
          })
        } catch (secondErr) {
          return res.status(502).json({
            success: false,
            error: secondErr?.message || msg || `视觉 OCR 失败 (${provider})`,
            provider,
          })
        }
      } else {
        return res.status(502).json({
          success: false,
          error: msg || `视觉 OCR 失败 (${provider})`,
          provider,
        })
      }
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

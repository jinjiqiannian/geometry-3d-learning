// ═══════════════════════════════════════════════════════
//  AI 题目解析引擎 — 文字题目 + 拍照 → 结构化几何数据
// ═══════════════════════════════════════════════════════

import { extractVerticesFromText, normalizeSubscripts } from "./labelMapper";

const PROVIDER_CONFIGS = {
  anthropic: {
    apiUrl: "https://api.anthropic.com/v1/messages",
    headers: { "anthropic-version": "2023-06-01" },
    responseParser: (data) => data.content?.find(b => b.type === "text")?.text || "",
    defaultModel: "claude-sonnet-4-6",
  },
  deepseek: {
    apiUrl: "https://api.deepseek.com/v1/chat/completions",
    headers: {},
    responseParser: (data) => data.choices?.[0]?.message?.content || "",
    defaultModel: "v4-pro",
  },
  openai: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    headers: {},
    responseParser: (data) => data.choices?.[0]?.message?.content || "",
    defaultModel: "gpt-4o",
  },
};

const MODEL = "claude-sonnet-4-6";

// ── 几何题解析 System Prompt ─────────────────────────
const PARSE_SYSTEM_PROMPT = `你是一个中学立体几何题目语义解析器。用户输入一道几何题的文字描述，你需要提取所有几何语义信息。

严格输出以下 Geometry Semantic JSON 格式（不要输出其他内容，不要用 markdown 代码块包裹）：

{
  "shape": "cube|cuboid|pyramid|prism|sphere|cylinder|cone|tetrahedron|octahedron|squareFrustum|circularFrustum",
  "size": 数字（边长/半径，题目未给出则默认2）,
  "points": ["所有顶点标签，包括辅助点", "A", "B", "C", "D", "P", "E", "F"],
  "edges": [{"from": "A", "to": "B", "label": "AB"}],
  "faces": [],
  "planes": [{"label": "BEF", "points": ["B", "E", "F"]}],
  "relations": ["E midpoint AD", "F on PA", "PC parallel plane BEF"],
  "importantLines": ["PC", "AF", "BE", "EF"],
  "importantPlanes": ["BEF"],
  "highlight": ["parallel", "midpoint"],
  "animationSteps": []
}

规则：
1. shape 只能是: cube（正方体）、cuboid（长方体）、pyramid（四棱锥）、prism（三棱柱）、sphere（球体）、cylinder（圆柱）、cone（圆锥）、tetrahedron（正四面体）、octahedron（正八面体）、squareFrustum（四棱台）、circularFrustum（圆台）
2. size 从题目数字中提取（如"棱长为3"→size=3，"半径为2"→size=2），找不到用2
3. points 必须包含所有题目中出现的顶点标签，包括辅助点（如中点E、交点F等）
4. edges 列出所有需要显示的边，包括几何体棱和辅助线
5. planes 列出所有需要显示的平面（如截面、辅助平面）
6. relations 描述点、线、面之间的关系，格式：
   - "E midpoint AD" 表示E是AD的中点
   - "F on PA" 表示F在PA上
   - "PC parallel plane BEF" 表示PC平行于平面BEF
   - "AB perpendicular CD" 表示AB垂直于CD
7. importantLines 列出需要高亮的关键线段
8. importantPlanes 列出需要高亮的关键平面
9. highlight 列出需要标记的关系类型：parallel（平行）、perpendicular（垂直）、midpoint（中点）、ratio（比例）、section（截面）
10. 如果识别不出任何几何体，shape 用 "cube" 并在 relations 中说明原因
11. 只输出 JSON，不要有任何解释文字`;

// ── 图片识别 System Prompt ───────────────────────────
const IMAGE_SYSTEM_PROMPT = `你是一个几何题图片识别器。请识别图片中的几何题目文字内容。

要求：
1. 先完整抄录图片中的所有文字（包括中文、数学符号、字母标注）
2. 如果图片中有几何图形，描述图形的形状和标注
3. 如果图片中没有几何题，请明确说明

输出格式：
{
  "hasProblem": true/false,
  "problemText": "题目完整文字内容",
  "figureDescription": "图形描述",
  "error": null 或 "错误原因"
}`;

// ═══════════════════════════════════════════════════════
//  核心函数
// ═══════════════════════════════════════════════════════

/**
 * 调用 Anthropic API
 * @param {Object} options
 * @param {string} options.system - 系统提示
 * @param {string} options.message - 用户消息
 * @param {Array} [options.images] - base64 图片数组
 * @param {string} options.apiKey - API 密钥
 * @returns {Promise<Object>} API 响应 JSON
 */
async function callAI({ system, message, images, apiKey, provider = "deepseek", model = "v4-pro" }) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("请先设置 API Key");
  }

  const config = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.deepseek;
  const useModel = model || config.defaultModel;

  let body;
  if (provider === "anthropic") {
    const content = [];
    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType || "image/jpeg",
            data: img.data,
          },
        });
      }
    }
    content.push({ type: "text", text: message });
    body = {
      model: useModel,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content }],
    };
  } else {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: message },
    ];
    body = {
      model: useModel,
      max_tokens: 1024,
      temperature: 0.3,
      messages,
    };
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("API Key 无效，请检查后重试");
    }
    if (response.status === 429) {
      throw new Error("请求过于频繁，请稍后重试");
    }
    throw new Error(err.error?.message || err.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return { data, text: config.responseParser(data) };
}

/**
 * 从 API 响应中提取文本内容
 */
function extractText(response) {
  if (!response.content || response.content.length === 0) {
    throw new Error("AI 未返回任何内容");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("AI 返回格式异常");
  }
  return textBlock.text;
}

// ═══════════════════════════════════════════════════════
//  公开 API
// ═══════════════════════════════════════════════════════

/**
 * 解析文字题目，返回结构化几何数据（同步版本，纯本地解析）
 * @param {string} text - 用户输入的中文几何题
 * @returns {{type:string, size:number, labels:string[], highlightLines:Array, annotations:Array, explanation:string}}
 */
export function parseProblemSync(text) {
  if (!text || text.trim().length < 3) {
    throw new Error("请输入至少3个字的题目描述");
  }

  const trimmed = text.trim();

  // 先尝试本地关键词匹配（快速路径）
  const quickResult = quickMatch(trimmed);
  if (quickResult && quickResult.confidence >= 0.7) {
    return attachGeometryMeta(quickResult, trimmed);
  }

  // 返回增强的本地默认结果
  const fallback = generateFallbackResult(trimmed);
  return attachGeometryMeta(fallback, trimmed);
}

/**
 * 解析文字题目，返回结构化几何数据（异步版本，支持API）
 * @param {string} text - 用户输入的中文几何题
 * @param {string} apiKey - API 密钥
 * @param {string} provider - 提供商：anthropic/deepseek/openai
 * @param {string} model - 模型名称
 * @returns {Promise<{type:string, size:number, labels:string[], highlightLines:Array, annotations:Array, explanation:string}>}
 */
export async function parseProblem(text, apiKey, provider = "deepseek", model = "v4-pro") {
  if (!text || text.trim().length < 3) {
    throw new Error("请输入至少3个字的题目描述");
  }

  const trimmed = text.trim();

  const quickResult = quickMatch(trimmed);
  if (quickResult && quickResult.confidence >= 0.7) {
    return attachGeometryMeta(quickResult, trimmed);
  }

  if (!apiKey || apiKey.trim() === "") {
    const fallback = generateFallbackResult(trimmed);
    return attachGeometryMeta(fallback, trimmed);
  }

  const { text: rawText } = await callAI({
    system: PARSE_SYSTEM_PROMPT,
    message: `请解析以下几何题目：\n\n${trimmed}`,
    apiKey,
    provider,
    model,
  });

  return parseResponse(rawText);
}

/**
 * 解析拍照图片，识别题目文字
 * @param {string} base64Data - 图片 base64 编码（不含 data:xxx;base64, 前缀）
 * @param {string} mediaType - 图片 MIME 类型（如 image/jpeg）
 * @param {string} apiKey - API 密钥
 * @param {string} provider - 提供商：anthropic/deepseek/openai
 * @param {string} model - 模型名称
 * @returns {Promise<{hasProblem:boolean, problemText:string, figureDescription:string}>}
 */
export async function parseImage(base64Data, mediaType, apiKey, provider = "deepseek", model = "v4-pro") {
  if (!base64Data) {
    throw new Error("请先拍摄或选择图片");
  }

  const { text: rawText } = await callAI({
    system: IMAGE_SYSTEM_PROMPT,
    message: "请识别这张图片中的几何题目。",
    images: [{ data: base64Data, mediaType: mediaType || "image/jpeg" }],
    apiKey,
    provider,
    model,
  });

  const result = parseResponse(rawText);

  if (!result.hasProblem) {
    throw new Error(result.error || "图片中未识别到几何题目");
  }

  return result;
}

/**
 * 先识别图片文字，再解析为几何数据（组合调用）
 * @param {string} base64Data - 图片 base64
 * @param {string} mediaType - 图片类型
 * @param {string} apiKey - API 密钥
 * @returns {Promise<Object>} 与 parseProblem 相同的返回格式
 */
export async function parseImageToGeometry(base64Data, mediaType, apiKey) {
  // 第一步：识别图片中的题目文字
  const imageResult = await parseImage(base64Data, mediaType, apiKey);

  if (!imageResult.hasProblem || !imageResult.problemText) {
    throw new Error("未能从图片中识别出几何题目");
  }

  // 第二步：用识别的文字生成几何数据
  return parseProblem(imageResult.problemText, apiKey);
}

// ═══════════════════════════════════════════════════════
//  辅助函数
// ═══════════════════════════════════════════════════════

/**
 * 解析 AI 返回的文本，提取 JSON
 */
function parseResponse(text) {
  // 尝试直接解析
  let cleaned = text.trim();

  // 去掉可能的 markdown 代码块标记
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 尝试提取第一个 { 到最后一个 } 之间的内容
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch (e2) {
        // 继续向下
      }
    }

    throw new Error(
      "AI 返回格式无法解析，请重试。原始返回：" + text.slice(0, 200)
    );
  }
}

/**
 * 从题目文本中提取额外标签（如 E、F 等辅助点）
 * 这些标签不在几何体默认顶点命名中，但被题目提到
 */
function extractAdditionalLabels(text, knownLabels) {
  const known = new Set(knownLabels || []);
  const result = [];

  // 模式1：大写字母后跟中文语境词（为、在、是、作、连等）
  const ctxPattern = /([A-Z])(?=[为的在是作连与和到使得且则或交属于]|，|,|。|；|：|:|、|\s)/g;
  let m;
  while ((m = ctxPattern.exec(text)) !== null) {
    if (!known.has(m[1])) {
      known.add(m[1]);
      result.push(m[1]);
    }
  }

  // 模式2：大写字母序列中的散装字母（如 PC//平面BEF → P,C,B,E,F）
  const blockPattern = /([A-Z]{2,})/g;
  while ((m = blockPattern.exec(text)) !== null) {
    for (const ch of m[1]) {
      if (!known.has(ch)) {
        known.add(ch);
        result.push(ch);
      }
    }
  }

  return result;
}

/**
 * 从题目文本中提取简单边引用（相邻大写字母对）
 * 用于补充 extractEdgeRefs 的遗漏
 */
function extractSimpleEdgePairs(text) {
  const lines = [];
  const seen = new Set();
  // 匹配相邻的大写字母对（如 PA、AD、PC、EF 等）
  const pairPattern = /([A-Z])([A-Z])/g;
  let m;
  while ((m = pairPattern.exec(text)) !== null) {
    const label = m[1] + m[2];
    if (!seen.has(label)) {
      seen.add(label);
      lines.push({
        from: m[1],
        to: m[2],
        label,
        reason: "题目提及",
      });
    }
  }
  return lines;
}

/**
 * 本地快速关键词匹配（减少不必要的 API 调用）
 * 返回 null 表示无法匹配，需要调用 API
 */
function detectSubType(text, type) {
  if (/二面角|dihedral/.test(text)) return "dihedral_angle";
  if (/线面角|直线.*(?:与|和).*(?:平面|面).*(?:所成|的)角/.test(text))
    return "line_plane_angle";
  if (/异面|skew|异面直线|所成角|夹角/.test(text) && type === "cube") return "skew_lines";
  if (/余弦|正弦|正切|cos|sin|tan/.test(text) && type === "cube") return "skew_lines";
  if (/点.*到.*(?:平面|面).*距离|等体积法/.test(text))
    return "point_plane_distance";
  if (/内接|内切|inscribed/.test(text)) return "inscribed";
  if (/外接|外切|circumscribed/.test(text)) return "circumscribed";
  if (/体积|volume/.test(text)) return "volume";
  if (/截面|section/.test(text)) return "section";
  if (/侧面积|侧面展开/.test(text)) return "lateral_area";
  if (/母线|generatrix/.test(text)) return "generatrix";
  if (/表面[积积]|表面|面积/.test(text)) return "surface_area";
  if (/对角线|diagonal/.test(text)) return "diagonal";
  if (/球冠|crown|spherical cap/.test(text)) return "spherical_cap";
  if (/对棱/.test(text)) return "opposite_edges";
  return "general";
}

// ── 边名提取（通用，支持Unicode下标） ──
// 从题目文本提取被提及的线段（如 "体对角线AG" → {from:'A',to:'G',label:'AG'}）
export function extractEdgeRefs(text) {
  const lines = [];
  const seen = new Set();

  // 模式1: 关键词后跟边名（如 "异面直线 A₁B 与 B₁C"）
  const pattern1 =
    /(?:对角线|异面直线|线段|求|求长|计算|证明|夹角|与|等于|=|已知)\s*([A-Za-z][₀₁₂₃₄₅₆₇₈₉'ᵢ]*(?:[A-Za-z][₀₁₂₃₄₅₆₇₈₉'ᵢ]*)?)/g;
  let m;
  while ((m = pattern1.exec(text)) !== null) {
    const raw = m[1].replace(/\s/g, "");
    const normalized = normalizeSubscripts(raw);
    if (normalized.length >= 2 && !seen.has(normalized)) {
      seen.add(normalized);
      const tokens = splitEdgeTokens(normalized);
      if (tokens) {
        lines.push({ from: tokens[0], to: tokens[1], label: normalized, reason: "题目提及" });
      }
    }
  }

  // 模式2: 通用相邻字母对（回退）
  if (lines.length === 0) {
    const pattern2 = /([A-Za-z])[₀₁₂₃₄₅₆₇₈₉]*([A-Za-z])/g;
    while ((m = pattern2.exec(text)) !== null) {
      const a = normalizeSubscripts(m[1]);
      const b = normalizeSubscripts(m[2]);
      const label = a + b;
      if (!seen.has(label)) {
        seen.add(label);
        lines.push({ from: a, to: b, label, reason: "题目提及" });
      }
    }
  }

  return lines;
}

// 辅助：将规范化边名分割为两个 token
// "A1B" → ["A1", "B"], "AB" → ["A", "B"], "B1C" → ["B1", "C"]
function splitEdgeTokens(s) {
  if (s.length < 2) return null;
  if (s.length >= 3 && /\d/.test(s[1])) {
    return [s[0] + s[1], s.slice(2)];
  }
  if (s.length === 2) {
    return [s[0], s[1]];
  }
  return null;
}

/**
 * 拆分「已知」与「求证」——求证句不得当作已知条件注入。
 * @returns {{ given: string, prove: string }}
 */
export function splitGivenAndProve(text) {
  const src = String(text || "");
  const idx = src.search(/求证|证明/);
  if (idx < 0) return { given: src, prove: "" };
  return { given: src.slice(0, idx), prove: src.slice(idx) };
}

/**
 * 从题目文本提取几何关系（文字 → relation 字符串，不计算坐标）
 * 输出格式与 SceneIRBuilder convertRelationsToAnnotations 对齐：
 *   "E midpoint AD" / "F on PA" / "AB parallel CD" / "PC parallel plane BEF"
 *   "AB perpendicular CD" / "G intersection PC BEF" / "O intersection AC BD"
 */
export function extractRelations(text) {
  if (!text) return [];
  const relations = [];
  const seen = new Set();
  const add = (r) => {
    if (!seen.has(r)) {
      seen.add(r);
      relations.push(r);
    }
  };
  const L = "[A-Z][0-9]*'?"; // 单点标签（A、A1、A'）
  const SEG = `${L}${L}`; // 线段（两点）
  const PLANE = `${L}${L}${L}`; // 平面（三点）

  // 1. 中点："E 是 AD 中点" / "M 是 AB 的中点" / "M 为 AB 中点"
  const midRe = new RegExp(`(${L})\\s*(?:是|为|作)\\s*(${SEG})\\s*的?中点`, "g");
  let m;
  while ((m = midRe.exec(text)) !== null) {
    add(`${m[1]} midpoint ${m[2]}`);
  }

  // 1b. 点在线段上："F 在 PA 上" / "F 在棱 PA 上" / "F 位于线段 PA 上"
  const onRe = new RegExp(`(${L})\\s*(?:在|位于)\\s*(?:棱|边|线段|直线)?\\s*(${SEG})\\s*上`, "g");
  while ((m = onRe.exec(text)) !== null) {
    add(`${m[1]} on ${m[2]}`);
  }

  // 2a. 线面平行："PC ∥ 平面 BEF" / "PC 平行于平面 BEF"
  const paraPlaneRe = new RegExp(`(${SEG})\\s*(?:平行于|平行|∥)\\s*平面\\s*(${PLANE})`, "g");
  while ((m = paraPlaneRe.exec(text)) !== null) {
    add(`${m[1]} parallel plane ${m[2]}`);
  }
  // 2b. 线线平行："AB 平行 CD" / "AB ∥ CD"
  const paraLineRe = new RegExp(`(${SEG})\\s*(?:平行于|平行|∥)\\s*(${SEG})(?!\\s*平面)`, "g");
  while ((m = paraLineRe.exec(text)) !== null) {
    add(`${m[1]} parallel ${m[2]}`);
  }

  // 3a. 线面垂直："PC 垂直 平面 ABC" / "PA⊥底面ABCD"（教材常用「底面」）
  const perpPlaneRe = new RegExp(
    `(${SEG})\\s*(?:垂直于|垂直|⟂|⊥)\\s*(?:底面|平面)\\s*([A-Z][0-9]*'?(?:[A-Z][0-9]*'?){2,3})`,
    "g"
  );
  while ((m = perpPlaneRe.exec(text)) !== null) {
    add(`${m[1]} perpendicular plane ${m[2]}`);
  }
  // 3b. 线线垂直："AB 垂直 CD"（支持 ⟂/⊥；排除已匹配的「垂直…平面/底面」）
  const perpLineRe = new RegExp(
    `(${SEG})\\s*(?:垂直于|垂直|⟂|⊥)\\s*(${SEG})(?!\\s*(?:底面|平面))`,
    "g"
  );
  while ((m = perpLineRe.exec(text)) !== null) {
    add(`${m[1]} perpendicular ${m[2]}`);
  }

  // 4a. 线面交点："PC 与平面 BEF 交于 G"
  const intPlaneRe = new RegExp(`(${SEG})\\s*与\\s*平面\\s*(${PLANE})\\s*(?:交于|相交于|交点是|交点为)\\s*(${L})`, "g");
  while ((m = intPlaneRe.exec(text)) !== null) {
    add(`${m[3]} intersection ${m[1]} ${m[2]}`);
  }
  // 4b. 线线交点："AC 与 BD 交于 O" / "AC 与 BD 相交于 O"
  const intLineRe = new RegExp(`(${SEG})\\s*与\\s*(${SEG})\\s*(?:交于|相交于)\\s*(${L})`, "g");
  while ((m = intLineRe.exec(text)) !== null) {
    add(`${m[3]} intersection ${m[1]} ${m[2]}`);
  }

  return relations;
}

/** 只提取「求证」之前的已知关系，避免把结论当前提。 */
export function extractGivenRelations(text) {
  const { given } = splitGivenAndProve(text);
  return extractRelations(given);
}

/**
 * 从「求证/证明」段落提取证明目标（线面垂直 / 线面平行）。
 * @returns {Array<{type:'perpendicular'|'parallel', subjects:[string,string]}>}
 */
export function extractProofGoals(text) {
  if (!text) return [];
  const { prove } = splitGivenAndProve(text);
  if (!prove) return [];

  const goals = [];
  const seen = new Set();
  const add = (g) => {
    const key = `${g.type}|${g.subjects.join("|")}`;
    if (seen.has(key)) return;
    seen.add(key);
    goals.push(g);
  };

  const L = "[A-Z][0-9]*'?";
  const SEG = `${L}${L}`;
  const PLANE = `[A-Z][0-9]*'?(?:[A-Z][0-9]*'?){2,3}`;

  let m;
  const perpPlaneRe = new RegExp(
    `(${SEG})\\s*(?:垂直于|垂直|⟂|⊥)\\s*(?:底面|平面)\\s*(${PLANE})`,
    "g"
  );
  while ((m = perpPlaneRe.exec(prove)) !== null) {
    add({ type: "perpendicular", subjects: [m[1], m[2]] });
  }

  const paraPlaneRe = new RegExp(
    `(${SEG})\\s*(?:平行于|平行|∥)\\s*(?:底面|平面)\\s*(${PLANE})`,
    "g"
  );
  while ((m = paraPlaneRe.exec(prove)) !== null) {
    add({ type: "parallel", subjects: [m[1], m[2]] });
  }

  return goals;
}

/**
 * 从题目文本提取目标比例（"求AP/AF的值" / "求 AP:AF"）
 * @returns {{type:'ratio', subjects:[string,string]}|null}
 */
export function extractGoalRatio(text) {
  if (!text) return null;
  // 求证题优先走证明目标，避免「证明」字样误触发比例解析
  if (extractProofGoals(text).length > 0) return null;
  const L = "[A-Z][0-9]*'?";
  const SEG = `${L}${L}`;
  const m = text.match(
    new RegExp(`(?:求|计算)[^A-Z]{0,10}(${SEG})\\s*[/∶:：比]\\s*(${SEG})`)
  );
  if (!m) return null;
  return { type: "ratio", subjects: [m[1], m[2]] };
}

/** 把已知关系 / 证明目标 / 底面形状挂到 parse 结果上 */
export function attachGeometryMeta(result, text) {
  if (!result || typeof result !== "object") return result;
  result.relations = extractGivenRelations(text);
  const proofGoals = extractProofGoals(text);
  if (proofGoals.length === 1) {
    result.goal = proofGoals[0];
    delete result.goals;
  } else if (proofGoals.length > 1) {
    result.goals = proofGoals;
    result.goal = proofGoals[0];
  } else {
    const ratioGoal = extractGoalRatio(text);
    if (ratioGoal) result.goal = ratioGoal;
  }
  if (/菱形/.test(String(text || ""))) {
    result.baseShape = "rhombus";
  }
  return result;
}

export function quickMatch(text) {
  const t = text.toLowerCase();

  // 正方体
  const cubeMatch = t.match(/正方体|立方体|cube/);
  if (cubeMatch) {
    const sizeMatch = t.match(/棱长[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

    // 从题目文本提取实际顶点标签（支持 A₁B₁C₁D₁ 等命名）
    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "D", "E", "F", "G", "H"];
    let confidence = 0.6;
    let vertices = labels; // 顶点列表

    if (extractedLabels) {
      confidence = 0.85;
    }
    if (sizeMatch) confidence = 0.9;

    const highlightLines = extractEdgeRefs(text);

    return {
      type: "cube",
      size,
      subType: detectSubType(text, "cube"),
      labels, // 显示用标签（含Unicode下标 A₁）
      vertices, // 顶点列表（规范化形式 A1）
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `正方体，棱长 ${size}`
        : "正方体（参数来自快速匹配）",
      confidence,
    };
  }

  // 球体
  const sphereMatch = t.match(/球体|球|sphere/);
  if (sphereMatch) {
    const sizeMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;
    return {
      type: "sphere",
      size,
      subType: detectSubType(text, "sphere"),
      labels: ["N", "S", "E", "W", "F", "B"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `球体，半径 ${size}`
        : "球体（参数来自快速匹配）",
      confidence: sizeMatch ? 0.9 : 0.6,
    };
  }

  // 圆柱
  const cylinderMatch = t.match(/圆柱|cylinder/);
  if (cylinderMatch) {
    const rMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = rMatch ? parseFloat(rMatch[1]) : 2;
    return {
      type: "cylinder",
      size,
      subType: detectSubType(text, "cylinder"),
      labels: ["O", "O'", "A", "B", "C", "D", "A'", "B'", "C'", "D'"],
      highlightLines: [],
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 2 },
      annotations: hMatch
        ? [{ text: `高=${parseFloat(hMatch[1])}`, position: "right" }]
        : [],
      explanation:
        `圆柱，半径 ${size}` + (hMatch ? `，高 ${parseFloat(hMatch[1])}` : ""),
      confidence: rMatch ? 0.85 : 0.6,
    };
  }

  // 圆锥
  const coneMatch = t.match(/圆锥|cone/);
  if (coneMatch) {
    const rMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = rMatch ? parseFloat(rMatch[1]) : 2;
    return {
      type: "cone",
      size,
      subType: detectSubType(text, "cone"),
      labels: ["O", "P", "A", "B", "C", "D"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: rMatch ? `圆锥，半径 ${size}` : "圆锥（参数来自快速匹配）",
      confidence: rMatch ? 0.85 : 0.6,
    };
  }

  // 三棱锥（三角锥）
  const triPyramidMatch = t.match(/三棱锥|triangular pyramid/i);
  if (triPyramidMatch) {
    const sizeMatch = t.match(/(?:棱长|边长)[为是]?\s*(\d+(?:\.\d+)?)/);
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "P"];
    const extraLabels = extractAdditionalLabels(text, labels);
    if (extraLabels.length > 0) {
      labels = [...new Set([...labels, ...extraLabels])];
    }

    const highlightLines = extractEdgeRefs(text);
    const simpleEdges = extractSimpleEdgePairs(text);
    if (simpleEdges.length > 0) {
      const existing = new Set(highlightLines.map(h => h.label));
      for (const e of simpleEdges) {
        if (!existing.has(e.label)) highlightLines.push(e);
      }
    }

    return {
      type: "pyramid",
      size,
      subType: detectSubType(text, "pyramid"),
      labels,
      vertices: labels,
      highlightLines,
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 1.5 },
      annotations: [],
      explanation: sizeMatch
        ? `三棱锥，底面边长 ${size}`
        : "三棱锥（参数来自快速匹配）",
      confidence: sizeMatch ? 0.85 : 0.6,
    };
  }

  // 棱锥/四棱锥
  const pyramidMatch = t.match(/四棱锥|棱锥|pyramid/i);
  if (pyramidMatch) {
    const sizeMatch = t.match(/(?:边长|棱长)[为是]?\s*(\d+(?:\.\d+)?)/);
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

    // 从文本提取顶点标签（P-ABCD 模式等）
    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "D", "P"];

    // 扫描额外单字母标签（E、F 等辅助点）
    const extraLabels = extractAdditionalLabels(text, labels);
    if (extraLabels.length > 0) {
      labels = [...new Set([...labels, ...extraLabels])];
    }

    const highlightLines = extractEdgeRefs(text);
    // 补充简单边引用（相邻大写字母对）
    const simpleEdges = extractSimpleEdgePairs(text);
    if (simpleEdges.length > 0) {
      const existing = new Set(highlightLines.map(h => h.label));
      for (const e of simpleEdges) {
        if (!existing.has(e.label)) highlightLines.push(e);
      }
    }

    let confidence = 0.75;
    if (extractedLabels && extractedLabels.length > 0) confidence = 0.9;
    if (sizeMatch) confidence = 0.95;

    return {
      type: "pyramid",
      size,
      subType: detectSubType(text, "pyramid"),
      labels,
      vertices: labels,
      highlightLines,
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 1.5 },
      annotations: [],
      explanation: sizeMatch
        ? `四棱锥，底面边长 ${size}`
        : "四棱锥（参数来自快速匹配）",
      confidence,
    };
  }

  // 棱柱/三棱柱
  const prismMatch = t.match(/棱柱|三棱柱|prism/i);
  if (prismMatch) {
    const sizeMatch = t.match(/(?:棱长|边长)[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "A'", "B'", "C'"];
    const extraLabels = extractAdditionalLabels(text, labels);
    if (extraLabels.length > 0) {
      labels = [...new Set([...labels, ...extraLabels])];
    }

    const highlightLines = extractEdgeRefs(text);
    const simpleEdges = extractSimpleEdgePairs(text);
    if (simpleEdges.length > 0) {
      const existing = new Set(highlightLines.map(h => h.label));
      for (const e of simpleEdges) {
        if (!existing.has(e.label)) highlightLines.push(e);
      }
    }

    let confidence = 0.6;
    if (extractedLabels) confidence = 0.8;
    if (sizeMatch) confidence = extractedLabels ? 0.9 : 0.85;

    return {
      type: "prism",
      size,
      subType: detectSubType(text, "prism"),
      labels,
      vertices: labels,
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `直角三棱柱，边长 ${size}`
        : "直角三棱柱（参数来自快速匹配）",
      confidence,
    };
  }

  // 长方体
  const cuboidMatch = t.match(/长方体|cuboid/);
  if (cuboidMatch) {
    const sizeMatch = t.match(/(?:棱长[为是]?|长[为是]?)\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

    const extractedLabels = extractVerticesFromText(text);
    const labels = extractedLabels || ["A", "B", "C", "D", "E", "F", "G", "H"];

    const highlightLines = extractEdgeRefs(text);
    return {
      type: "cuboid",
      size,
      subType: detectSubType(text, "cuboid"),
      labels,
      vertices: labels,
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `长方体，棱长 ${size}`
        : "长方体（参数来自快速匹配）",
      confidence: 0.85,
    };
  }

  // 正八面体
  const octaMatch = t.match(/正八面体|八面体|octahedron/);
  if (octaMatch) {
    const sizeMatch = t.match(/(?:棱长|边长)[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;
    return {
      type: "octahedron",
      size,
      subType: detectSubType(text, "octahedron"),
      labels: ["T", "R", "F", "L", "B", "D"],
      vertices: ["T", "R", "F", "L", "B", "D"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `正八面体，棱长 ${size}`
        : "正八面体（参数来自快速匹配）",
      confidence: sizeMatch ? 0.9 : 0.75,
    };
  }

  // 正四面体
  const tetraMatch = t.match(/正四面体|四面体|tetrahedron/);
  if (tetraMatch) {
    const sizeMatch = t.match(/(?:棱长|边长)[为是]?\s*(\d+(?:\.\d+)?)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

    const extractedLabels = extractVerticesFromText(text);
    const labels = extractedLabels || ["A", "B", "C", "D"];

    const highlightLines = extractEdgeRefs(text);
    return {
      type: "tetrahedron",
      size,
      subType: detectSubType(text, "tetrahedron"),
      labels,
      vertices: labels,
      highlightLines,
      params: { size },
      annotations: [],
      explanation: sizeMatch
        ? `正四面体，棱长 ${size}`
        : "正四面体（参数来自快速匹配）",
      confidence: sizeMatch ? 0.9 : 0.75,
    };
  }

  // 圆台
  const frustumMatch = t.match(/圆台|frustum/);
  if (frustumMatch) {
    const upperMatch = t.match(/上底面?半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const lowerMatch = t.match(/下底面?半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const sizeMatch = t.match(/半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const upperRadius = upperMatch
      ? parseFloat(upperMatch[1])
      : sizeMatch
        ? parseFloat(sizeMatch[1])
        : 2;
    const lowerRadius = lowerMatch ? parseFloat(lowerMatch[1]) : undefined;
    const height = hMatch ? parseFloat(hMatch[1]) : undefined;
    const size = upperRadius; // 兼容 solveFrustum：R = size 优先
    return {
      type: "circularFrustum",
      size,
      subType: "default",
      labels: ["O", "O'", "A", "B", "C", "D", "A'", "B'", "C'", "D'"],
      highlightLines: [],
      params: { size, upperRadius, lowerRadius, height },
      annotations: [],
      explanation:
        `圆台，上底半径 ${upperRadius}` +
        (lowerRadius != null ? `，下底半径 ${lowerRadius}` : "") +
        (height != null ? `，高 ${height}` : ""),
      confidence: upperMatch ? 0.85 : 0.6,
    };
  }

  return null; // 需要 API 解析
}

/**
 * 验证 API Key 是否有效
 * @param {string} apiKey
 * @returns {Promise<{valid:boolean, error?:string}>}
 */
export async function validateApiKey(apiKey, provider = "deepseek", model = "v4-pro") {
  try {
    await callAI({
      system: "回复 OK",
      message: "ping",
      apiKey,
      provider,
      model,
    });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/**
 * 预设示例题目（方便用户快速体验）
 */
export const EXAMPLE_PROBLEMS = [
  {
    title: "正方体对角线",
    text: "正方体ABCD-EFGH的棱长为2，求体对角线AG的长度。",
  },
  {
    title: "球体体积",
    text: "一个球体的半径为3，求它的体积和表面积。",
  },
  {
    title: "三棱柱高",
    text: "直角三棱柱ABC-A'B'C'中，底面是边长为2的正三角形，求三棱柱的高。",
  },
  {
    title: "棱锥侧棱",
    text: "正四棱锥P-ABCD，底面正方形边长为2，高为3，求侧棱PA的长。",
  },
  {
    title: "圆柱截面",
    text: "圆柱的底面半径为2，高为4，过上下底面中心作截面，求截面面积。",
  },
  {
    title: "圆锥母线",
    text: "圆锥的底面半径为3，高为4，求母线长。",
  },
  {
    title: "异面直线夹角",
    text: "正方体ABCD-A₁B₁C₁D₁棱长为2，求异面直线A₁B与B₁C所成角的余弦值。",
  },
  {
    title: "二面角",
    text: "正方体ABCD-A₁B₁C₁D₁棱长为2，求平面A₁BD与平面ABCD所成二面角的余弦值。",
  },
  {
    title: "线面角",
    text: "正方体ABCD-A₁B₁C₁D₁棱长为1，求直线B₁D与平面ABCD所成角的正弦值。",
  },
  {
    title: "点面距离",
    text: "正方体ABCD-A₁B₁C₁D₁棱长为2，求点C到平面A₁BD的距离。",
  },
  {
    title: "外接球",
    text: "正方体ABCD-EFGH棱长为3，求其外接球的半径和表面积。",
  },
  {
    title: "内切球",
    text: "正方体棱长为6，求其内切球的半径和体积。",
  },
  {
    title: "圆台体积",
    text: "圆台上底面半径3，下底面半径5，高为4，求圆台的体积。",
  },
  {
    title: "球冠体积",
    text: "球体半径为5，用一个距球心3的平面截球，求球冠的体积。",
  },
];

function generateFallbackResult(text) {
  const t = text.toLowerCase();

  const sizeMatch = text.match(
    /(?:棱长|边长|半径|高)[为是]?\s*(\d+(?:\.\d+)?)/
  );
  const size = sizeMatch ? parseFloat(sizeMatch[1]) : 2;

  if (/正方体|立方体|cube/.test(t)) {
    const extractedLabels = extractVerticesFromText(text);
    const labels = extractedLabels || ["A", "B", "C", "D", "E", "F", "G", "H"];
    return {
      type: "cube",
      size,
      subType: detectSubType(text, "cube"),
      labels,
      vertices: labels,
      highlightLines: extractEdgeRefs(text),
      params: { size },
      annotations: [],
      explanation: `正方体，棱长 ${size}（本地解析）`,
      confidence: 0.85,
    };
  }

  if (/长方体|cuboid/.test(t)) {
    const extractedLabels = extractVerticesFromText(text);
    const labels = extractedLabels || ["A", "B", "C", "D", "E", "F", "G", "H"];
    return {
      type: "cuboid",
      size,
      subType: detectSubType(text, "cuboid"),
      labels,
      vertices: labels,
      highlightLines: extractEdgeRefs(text),
      params: { size },
      annotations: [],
      explanation: `长方体，棱长 ${size}（本地解析）`,
      confidence: 0.85,
    };
  }

  if (/球体|球|sphere/.test(t)) {
    return {
      type: "sphere",
      size,
      subType: detectSubType(text, "sphere"),
      labels: ["N", "S", "E", "W", "F", "B"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: `球体，半径 ${size}（本地解析）`,
      confidence: 0.8,
    };
  }

  if (/圆柱|cylinder/.test(t)) {
    const hMatch = text.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    return {
      type: "cylinder",
      size,
      subType: detectSubType(text, "cylinder"),
      labels: ["O", "O'", "A", "B", "C", "D", "A'", "B'", "C'", "D'"],
      highlightLines: [],
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 2 },
      annotations: hMatch
        ? [{ text: `高=${parseFloat(hMatch[1])}`, position: "right" }]
        : [],
      explanation: `圆柱，半径 ${size}（本地解析）`,
      confidence: 0.8,
    };
  }

  if (/圆锥|cone/.test(t)) {
    return {
      type: "cone",
      size,
      subType: detectSubType(text, "cone"),
      labels: ["O", "P", "A", "B", "C", "D"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: `圆锥，半径 ${size}（本地解析）`,
      confidence: 0.8,
    };
  }

  if (/三棱锥|triangular pyramid/i.test(t)) {
    const hMatch = text.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "P"];
    const extraLabels = extractAdditionalLabels(text, labels);
    if (extraLabels.length > 0) {
      labels = [...new Set([...labels, ...extraLabels])];
    }
    const hl = extractEdgeRefs(text);
    const simpleEdges = extractSimpleEdgePairs(text);
    if (simpleEdges.length > 0) {
      const existing = new Set(hl.map(h => h.label));
      for (const e of simpleEdges) {
        if (!existing.has(e.label)) hl.push(e);
      }
    }
    return {
      type: "pyramid",
      size,
      subType: detectSubType(text, "pyramid"),
      labels,
      vertices: labels,
      highlightLines: hl,
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 1.5 },
      annotations: [],
      explanation: `三棱锥，棱长 ${size}（本地解析）`,
      confidence: 0.8,
    };
  }

  if (/棱锥|四棱锥|pyramid/i.test(t)) {
    const hMatch = text.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "D", "P"];
    const extraLabels = extractAdditionalLabels(text, labels);
    if (extraLabels.length > 0) {
      labels = [...new Set([...labels, ...extraLabels])];
    }
    const hl = extractEdgeRefs(text);
    const simpleEdges = extractSimpleEdgePairs(text);
    if (simpleEdges.length > 0) {
      const existing = new Set(hl.map(h => h.label));
      for (const e of simpleEdges) {
        if (!existing.has(e.label)) hl.push(e);
      }
    }
    return {
      type: "pyramid",
      size,
      subType: detectSubType(text, "pyramid"),
      labels,
      vertices: labels,
      highlightLines: hl,
      params: { size, height: hMatch ? parseFloat(hMatch[1]) : size * 1.5 },
      annotations: [],
      explanation: `正四棱锥，底面边长 ${size}（本地解析）`,
      confidence: 0.8,
    };
  }

  if (/棱柱|三棱柱|prism/i.test(t)) {
    const extractedLabels = extractVerticesFromText(text);
    let labels = extractedLabels || ["A", "B", "C", "A'", "B'", "C'"];
    const extraLabels = extractAdditionalLabels(text, labels);
    if (extraLabels.length > 0) {
      labels = [...new Set([...labels, ...extraLabels])];
    }
    const hl = extractEdgeRefs(text);
    const simpleEdges = extractSimpleEdgePairs(text);
    if (simpleEdges.length > 0) {
      const existing = new Set(hl.map(h => h.label));
      for (const e of simpleEdges) {
        if (!existing.has(e.label)) hl.push(e);
      }
    }
    return {
      type: "prism",
      size,
      subType: detectSubType(text, "prism"),
      labels,
      vertices: labels,
      highlightLines: hl,
      params: { size },
      annotations: [],
      explanation: `直角三棱柱，边长 ${size}（本地解析）`,
      confidence: 0.8,
    };
  }

  if (/正八面体|八面体|octahedron/.test(t)) {
    return {
      type: "octahedron",
      size,
      subType: detectSubType(text, "octahedron"),
      labels: ["T", "R", "F", "L", "B", "D"],
      vertices: ["T", "R", "F", "L", "B", "D"],
      highlightLines: [],
      params: { size },
      annotations: [],
      explanation: `正八面体，棱长 ${size}（本地解析）`,
      confidence: 0.75,
    };
  }

  if (/正四面体|四面体|tetrahedron/.test(t)) {
    const extractedLabels = extractVerticesFromText(text);
    const labels = extractedLabels || ["A", "B", "C", "D"];
    return {
      type: "tetrahedron",
      size,
      subType: detectSubType(text, "tetrahedron"),
      labels,
      vertices: labels,
      highlightLines: extractEdgeRefs(text),
      params: { size },
      annotations: [],
      explanation: `正四面体，棱长 ${size}（本地解析）`,
      confidence: 0.75,
    };
  }

  if (/圆台|frustum/.test(t)) {
    const upperMatch = t.match(/上底面?半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const lowerMatch = t.match(/下底面?半径[为是]?\s*(\d+(?:\.\d+)?)/);
    const hMatch = t.match(/高[为是]?\s*(\d+(?:\.\d+)?)/);
    const upperRadius = upperMatch ? parseFloat(upperMatch[1]) : size;
    const lowerRadius = lowerMatch ? parseFloat(lowerMatch[1]) : undefined;
    const height = hMatch ? parseFloat(hMatch[1]) : undefined;
    return {
      type: "circularFrustum",
      size: upperRadius, // 兼容 solveFrustum：R = size 优先
      subType: "default",
      labels: ["O", "O'", "A", "B", "C", "D", "A'", "B'", "C'", "D'"],
      highlightLines: [],
      params: { size: upperRadius, upperRadius, lowerRadius, height },
      annotations: [],
      explanation:
        `圆台，上底半径 ${upperRadius}` +
        (lowerRadius != null ? `，下底半径 ${lowerRadius}` : "") +
        (height != null ? `，高 ${height}` : "") +
        "（本地解析）",
      confidence: 0.7,
    };
  }

  return {
    type: "cube",
    size,
    subType: "general",
    labels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    vertices: ["A", "B", "C", "D", "E", "F", "G", "H"],
    highlightLines: [],
    params: { size },
    annotations: [],
    explanation: `未识别几何体，默认正方体（棱长${size}）`,
    confidence: 0.5,
  };
}

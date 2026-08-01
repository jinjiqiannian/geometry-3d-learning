/**
 * @module factRegistry
 * @description 事实注册表 - 内容寻址去重（含 values / alternateProofs）
 * @author Geometry 3D Learning
 */

function sortPair(a, b) {
  return a <= b ? [a, b] : [b, a]
}

function normalizeSegmentLabel(label) {
  if (typeof label !== 'string' || label.length !== 2) return label
  const [a, b] = label.split('')
  return a <= b ? a + b : b + a
}

// 平面名等多点标签：字符排序（"PAC" → "ACP"）
function normalizePointSetLabel(label) {
  if (typeof label !== 'string' || label.length < 3) return normalizeSegmentLabel(label)
  return [...label].sort().join('')
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// values 归一：整数比约分（[2,6] → [1,3]），浮点保持原样
function normalizeValues(values) {
  if (!Array.isArray(values)) return []
  const v = [...values]
  if (v.length === 2 && v.every((x) => Number.isInteger(x) && x > 0)) {
    const g = gcd(v[0], v[1])
    if (g > 1) return [v[0] / g, v[1] / g]
  }
  return v
}

/**
 * 事实注册表类
 */
export class FactRegistry {
  constructor() {
    /** @private */
    this.facts = new Map()
    /** @private */
    this.idToFact = new Map()
    /** @private 确定性逻辑时钟（替代 Date.now，保证可重放） */
    this.clock = 0
  }

  /** @private */
  nextTick() {
    this.clock += 1
    return this.clock
  }

  /**
   * 规范化 subjects + values，确保同一事实的不同表达生成相同ID。
   * ratio 两段交换时同步交换 values，保持 "s0:s1 = v0:v1" 语义。
   * @param {string} type
   * @param {string[]} subjects
   * @param {number[]} [values]
   * @returns {{subjects:string[], values:number[]}}
   */
  canonicalize(type, subjects = [], values = []) {
    const args = [...subjects]
    const vals = normalizeValues(values)

    switch (type) {
      case 'midpoint':
        if (args.length >= 3) {
          const [point, a, b] = args
          const [x, y] = sortPair(a, b)
          return { subjects: [point, x, y], values: vals }
        }
        break

      case 'line':
      case 'segment':
        if (args.length >= 2) {
          return { subjects: sortPair(args[0], args[1]), values: vals }
        }
        break

      case 'angle':
        if (args.length >= 3) {
          const [vertex, a, b] = args
          const [x, y] = sortPair(a, b)
          return { subjects: [vertex, x, y], values: vals }
        }
        break

      case 'parallel':
      case 'perpendicular':
        if (args.length >= 2) {
          return { subjects: sortPair(args[0], args[1]), values: vals }
        }
        break

      case 'equal':
      case 'congruent':
        return { subjects: [...args].sort(), values: vals }

      case 'intersection':
        // [objA, objB, result] — 前两个可交换；线名端点排序（EB→BE）；
        // 平面名（≥3字符）保持原样（与规则层 planeName 对齐）
        if (args.length >= 3) {
          const [a, b, result] = args
          const [x, y] = sortPair(normalizeSegmentLabel(a), normalizeSegmentLabel(b))
          return { subjects: [x, y, normalizeSegmentLabel(result)], values: vals }
        }
        if (args.length === 2) {
          return {
            subjects: sortPair(normalizeSegmentLabel(args[0]), normalizeSegmentLabel(args[1])),
            values: vals,
          }
        }
        break

      case 'ratio':
        // 段名内部端点规范化；两段按字典序排列，交换时同步交换 values
        if (args.length >= 2) {
          const a = normalizeSegmentLabel(args[0])
          const b = normalizeSegmentLabel(args[1])
          const rest = args.slice(2)
          if (typeof a === 'string' && typeof b === 'string' && b < a) {
            const swapped = vals.length >= 2 ? [vals[1], vals[0], ...vals.slice(2)] : vals
            return { subjects: [b, a, ...rest], values: swapped }
          }
          return { subjects: [a, b, ...rest], values: vals }
        }
        if (args.length === 1 && typeof args[0] === 'string' && args[0].includes('/')) {
          const [num, den] = args[0].split('/')
          return {
            subjects: [`${normalizeSegmentLabel(num)}/${normalizeSegmentLabel(den)}`],
            values: vals,
          }
        }
        break

      case 'similar':
        return {
          subjects: [...args].map((t) => (typeof t === 'string' ? [...t].sort().join('') : t)).sort(),
          values: vals,
        }

      case 'on':
        // [point, carrier] — 载体线段端点排序（PA→AP）
        if (args.length >= 2) {
          return { subjects: [args[0], normalizeSegmentLabel(args[1])], values: vals }
        }
        break

      case 'on_plane':
        // [point, planeLabel] — 平面名字符排序（PAC→ACP）
        if (args.length >= 2) {
          return { subjects: [args[0], normalizePointSetLabel(args[1])], values: vals }
        }
        break

      case 'plane':
        return { subjects: [...args].sort(), values: vals }

      default:
        break
    }

    return { subjects: args, values: vals }
  }

  /**
   * 向后兼容：仅返回规范化 subjects
   * @param {string} type
   * @param {string[]} subjects
   * @returns {string[]}
   */
  canonicalArgs(type, subjects = []) {
    return this.canonicalize(type, subjects).subjects
  }

  /**
   * @param {string} type
   * @param {string[]} subjects
   * @param {number[]} [values]
   * @returns {string}
   */
  generateFactId(type, subjects, values = []) {
    const canonical = this.canonicalize(type, subjects, values)
    const parts = [type, ...canonical.subjects]
    // ratio(AB,CD,1:2) ≠ ratio(AB,CD,2:3)
    if (canonical.values.length > 0) {
      parts.push(`v:${canonical.values.join(',')}`)
    }
    return parts.join('|')
  }

  /**
   * 添加事实（自动去重；同源合并 sources；保留 alternateProofs）
   */
  addFact(fact) {
    const { type, subjects = [], values, description, sources } = fact
    const canonical = this.canonicalize(type, subjects, Array.isArray(values) ? values : [])
    const factId = this.generateFactId(type, subjects, Array.isArray(values) ? values : [])

    if (this.idToFact.has(factId)) {
      const existing = this.idToFact.get(factId)

      if (sources && sources.length > 0) {
        if (!Array.isArray(existing.alternateProofs)) {
          existing.alternateProofs = []
        }
        const novel = sources.filter((s) => !existing.sources.includes(s))
        if (novel.length > 0 || sources.some((s) => existing.sources.includes(s))) {
          existing.alternateProofs.push({
            sources: [...sources],
            at: this.nextTick(),
          })
        }
        sources.forEach((source) => {
          if (!existing.sources.includes(source)) {
            existing.sources.push(source)
          }
        })
      }

      return existing
    }

    const canonicalSubjects = canonical.subjects
    const normalizedValues = canonical.values
    const newFact = {
      id: factId,
      type,
      predicate: type,
      subjects: canonicalSubjects,
      args: canonicalSubjects,
      values: normalizedValues,
      description: description || '',
      sources: sources ? [...sources] : [],
      alternateProofs: [],
      proofHash: this.generateProofHash({ type, subjects: canonicalSubjects, values: normalizedValues, description }),
      dependencies: [],
    }

    this.idToFact.set(factId, newFact)
    this.facts.set(type, this.facts.get(type) || new Map())
    this.facts.get(type).set(factId, newFact)

    return newFact
  }

  getFact(id) {
    return this.idToFact.get(id) || null
  }

  hasFact(id) {
    return this.idToFact.has(id)
  }

  getFactsByType(type) {
    const typeMap = this.facts.get(type)
    if (!typeMap) return []
    return Array.from(typeMap.values())
  }

  getAllFacts() {
    return Array.from(this.idToFact.values())
  }

  /**
   * 合并替代证明路径
   */
  mergeAlternateProof(factId, sources, meta = {}) {
    const fact = this.getFact(factId)
    if (!fact) return

    if (!Array.isArray(fact.alternateProofs)) {
      fact.alternateProofs = []
    }
    fact.alternateProofs.push({
      sources: [...sources],
      at: this.nextTick(),
      ...meta,
    })

    sources.forEach((source) => {
      if (!fact.sources.includes(source)) {
        fact.sources.push(source)
      }
    })
  }

  generateProofHash(fact) {
    const parts = [
      fact.type,
      (fact.subjects || []).join(','),
      fact.values?.join(',') || '',
      fact.description || '',
    ]
    let hash = 0
    const joined = parts.join('')
    for (let i = 0; i < joined.length; i++) {
      hash = ((hash << 5) - hash) + joined.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16)
  }

  clear() {
    this.facts.clear()
    this.idToFact.clear()
  }

  size() {
    return this.idToFact.size
  }
}

export function createFactRegistry() {
  return new FactRegistry()
}

/**
 * 安全表达式求值器 —— 不使用 eval / new Function，只支持白名单运算符和函数。
 *
 * 语法：
 *   算术: + - * / ** ( )
 *   一元负号: -x
 *   函数调用: sqrt(x), abs(x), sin(x), cos(x), tan(x), min(a,b), max(a,b)
 *   常量: PI, E
 *   变量: 由调用方提供的 vars 对象中的 key
 *
 * 任何不在白名单内的标识符或操作符都会抛 SyntaxError。
 *
 * @see docs/ANIMATION-SYSTEM-DESIGN.md §4.2 表达式必须是自己的安全求值器
 */

// ── 白名单 ────────────────────────────────────────

const FUNCTIONS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  pow: Math.pow,
};

const CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
};

// ── 词法 ───────────────────────────────────────────

const TOKEN_RE = /(\d+\.?\d*|\.\d+)\s*|\*\*|[()+\-*/,]|[a-zA-Z_]\w*/g;

/**
 * @param {string} src
 * @returns {{type:string, value:string}[]}
 */
function tokenize(src) {
  const tokens = [];
  let pos = 0;
  TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(src)) !== null) {
    if (match.index !== pos) {
      // 跳过的非空白字符不在白名单内
      const unexpected = src.slice(pos, match.index).trim();
      if (unexpected) throw new SyntaxError(`意外字符: "${unexpected}"`);
    }
    const raw = match[0].trim();
    if (!raw) continue;
    pos = TOKEN_RE.lastIndex;

    if (/^\d/.test(raw) || raw.startsWith('.')) {
      tokens.push({ type: 'num', value: raw });
    } else if (/^[a-zA-Z_]/.test(raw)) {
      tokens.push({ type: 'id', value: raw });
    } else if (raw === '**') {
      tokens.push({ type: 'op', value: '**' });
    } else if ('+-*/'.includes(raw)) {
      tokens.push({ type: 'op', value: raw });
    } else if (raw === '(') {
      tokens.push({ type: 'lparen', value: raw });
    } else if (raw === ')') {
      tokens.push({ type: 'rparen', value: raw });
    } else if (raw === ',') {
      tokens.push({ type: 'comma', value: raw });
    }
  }
  // 尾部未消费的字符
  if (pos < src.length) {
    const rest = src.slice(pos).trim();
    if (rest) throw new SyntaxError(`尾部意外字符: "${rest}"`);
  }
  return tokens;
}

// ── 递归下降解析 + 求值 ───────────────────────────

/**
 * @param {{type:string, value:string}[]} tokens
 * @param {Record<string, number>} vars
 */
function Parser(tokens, vars) {
  let i = 0;

  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const expect = (type) => {
    const t = next();
    if (!t || t.type !== type)
      throw new SyntaxError(`期望 ${type}，得到 ${t ? t.value : 'EOF'}`);
    return t;
  };

  // expr = term (('+' | '-') term)*
  function parseExpr() {
    let v = parseTerm();
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
        next();
        const rhs = parseTerm();
        v = t.value === '+' ? v + rhs : v - rhs;
      } else break;
    }
    return v;
  }

  // term = factor (('*' | '/') factor)*
  function parseTerm() {
    let v = parseFactor();
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.value === '*' || t.value === '/')) {
        next();
        const rhs = parseFactor();
        v = t.value === '*' ? v * rhs : v / rhs;
      } else break;
    }
    return v;
  }

  // factor = power ('**' power)*  (右结合)
  function parseFactor() {
    const base = parseUnary();
    const t = peek();
    if (t && t.type === 'op' && t.value === '**') {
      next();
      const exp = parseFactor(); // 右结合
      return Math.pow(base, exp);
    }
    return base;
  }

  // unary = ('-')? primary
  function parseUnary() {
    const t = peek();
    if (t && t.type === 'op' && t.value === '-') {
      next();
      return -parseUnary();
    }
    return parsePrimary();
  }

  // primary = num | id | id '(' args ')' | '(' expr ')'
  function parsePrimary() {
    const t = next();
    if (!t) throw new SyntaxError('意外 EOF');

    if (t.type === 'num') {
      return parseFloat(t.value);
    }

    if (t.type === 'id') {
      // 函数调用？
      const nt = peek();
      if (nt && nt.type === 'lparen') {
        next(); // 消费 '('
        const fn = FUNCTIONS[t.value];
        if (!fn) throw new SyntaxError(`未知函数: ${t.value}`);
        const args = [];
        if (peek()?.type !== 'rparen') {
          args.push(parseExpr());
          while (peek()?.type === 'comma') {
            next();
            args.push(parseExpr());
          }
        }
        expect('rparen');
        return fn(...args);
      }
      // 常量
      if (t.value in CONSTANTS) return CONSTANTS[t.value];
      // 变量
      if (t.value in vars) return vars[t.value];
      throw new SyntaxError(`未知标识符: ${t.value}`);
    }

    if (t.type === 'lparen') {
      const v = parseExpr();
      expect('rparen');
      return v;
    }

    throw new SyntaxError(`意外 token: ${t.value}`);
  }

  this.eval = () => {
    const v = parseExpr();
    if (peek()) throw new SyntaxError(`尾部多余 token: ${peek().value}`);
    if (!Number.isFinite(v)) throw new Error('结果非有限值');
    return v;
  };
}

/**
 * 安全求值一个表达式。
 * @param {string} expr  表达式字符串，如 "a * b * c"
 * @param {Record<string, number>} vars  变量绑定
 * @returns {number}
 */
export function evalExpr(expr, vars = {}) {
  if (typeof expr !== 'string' || !expr.trim()) {
    throw new SyntaxError('空表达式');
  }
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new SyntaxError('空表达式');
  const parser = new Parser(tokens, vars);
  return parser.eval();
}

/**
 * 检查表达式是否可以安全求值（不实际计算，只做解析）。
 * @param {string} expr
 * @returns {boolean}
 */
export function isValidExpr(expr, vars = {}) {
  try {
    evalExpr(expr, vars);
    return true;
  } catch {
    return false;
  }
}

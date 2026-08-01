import { describe, it, expect } from 'vitest';
import {
  validateLogicIR,
  createEmptyLogicIR,
  MVP_EXAMPLES,
  PROBLEM_TYPES,
  LOGIC_IR_VERSION,
} from '../schema.js';

describe('LogicIR schema', () => {
  it('empty IR validates with defaults', () => {
    const ir = createEmptyLogicIR();
    expect(ir.version).toBe(LOGIC_IR_VERSION);
    expect(validateLogicIR(ir).ok).toBe(true);
  });

  it('rejects missing problemType', () => {
    const ir = createEmptyLogicIR();
    ir.problemType = /** @type {any} */ ('');
    const r = validateLogicIR(ir);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('problemType'))).toBe(true);
  });

  it('accepts AI-style custom problemType', () => {
    const ir = {
      ...MVP_EXAMPLES.multiply_add,
      problemType: 'custom_bayes',
    };
    expect(validateLogicIR(ir).ok).toBe(true);
  });

  it.each(PROBLEM_TYPES)('MVP example %s is valid and has why on steps', (type) => {
    const ex = MVP_EXAMPLES[type];
    const r = validateLogicIR(ex);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(ex.coreIdea).toBeTruthy();
    expect(ex.steps.length).toBeGreaterThanOrEqual(2);
    expect(ex.steps.every((s) => s.why)).toBe(true);
    expect(ex.answer).toBeTruthy();
  });

  it('detects missing child ids', () => {
    const bad = {
      ...MVP_EXAMPLES.multiply_add,
      nodes: [
        { id: 'a', label: 'a', kind: 'choice', children: ['missing'] },
      ],
      rootId: 'a',
    };
    const r = validateLogicIR(bad);
    expect(r.ok).toBe(false);
  });
});

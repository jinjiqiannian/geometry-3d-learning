/**
 * @module schemas
 * @description ProofEngine V2 数据结构定义
 */

export const FACT_TYPES = {
  POINT: 'point',
  LINE: 'line',
  PLANE: 'plane',
  MIDPOINT: 'midpoint',
  ON: 'on',
  PARALLEL: 'parallel',
  PERPENDICULAR: 'perpendicular',
  EQUAL: 'equal',
  CONGRUENT: 'congruent',
  SIMILAR: 'similar',
  ANGLE: 'angle',
  DISTANCE: 'distance',
  SHAPE: 'shape',
  INTERSECTION: 'intersection',
  RATIO: 'ratio',
}

export const CONSTRUCTION_TYPES = {
  POINT: 'point',
  LINE: 'line',
  PLANE: 'plane',
  CIRCLE: 'circle',
  SEGMENT: 'segment',
  RAY: 'ray',
  ANGLE: 'angle',
  TRIANGLE: 'triangle',
  QUADRILATERAL: 'quadrilateral',
}

export const RULE_TIERS = {
  AXIOM: 'axiom',
  DEFINITION: 'definition',
  THEOREM: 'theorem',
  COROLLARY: 'corollary',
  LEMMA: 'lemma',
  HEURISTIC: 'heuristic',
}

export const STEP_TYPES = {
  OBSERVATION: 'observation',
  CONSTRUCTION: 'construction',
  CALCULATION: 'calculation',
  INFERENCE: 'inference',
  CONCLUSION: 'conclusion',
}
import { parseProblemSync } from './src/engines/problemParser.js';

const text = '正四棱锥P-ABCD，底面正方形边长为4，高为6，求该棱锥的体积。';
const parsed = parseProblemSync(text);

console.log('=== 解析结果 ===');
console.log(JSON.stringify(parsed, null, 2));

const problemType = parsed?.questionType || 'default';
console.log('=== 题目类型 ===');
console.log(problemType);

import { solveGeometry } from './src/engines/calculationEngine.js';
const solved = solveGeometry({ ...parsed, questionType: problemType });

console.log('=== 计算引擎结果 ===');
console.log('公式:', solved.formula);
console.log('答案:', solved.answer);
console.log('步骤数:', solved.steps.length);
solved.steps.forEach((s, i) => {
  console.log(`步骤${i+1}: ${s.title}`);
  console.log(`       ${s.content}`);
});

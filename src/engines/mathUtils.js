export function formatNumber(num, decimals = 2) {
  if (num == null || !isFinite(num)) return '—'
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

export function calculateDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + 
    Math.pow(p2.y - p1.y, 2) + 
    Math.pow(p2.z - p1.z, 2)
  )
}

export function calculateAngle(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z)
  
  const cosAngle = dot / (mag1 * mag2)
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI)
}

export function generateRandomProblem() {
  const problems = [
    { title: '计算体积', type: 'volume' },
    { title: '计算表面积', type: 'surface' },
    { title: '求空间角', type: 'angle' },
    { title: '求对角线', type: 'diagonal' }
  ]
  return problems[Math.floor(Math.random() * problems.length)]
}

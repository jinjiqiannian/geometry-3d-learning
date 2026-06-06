import { calculateVolume, calculateSurfaceArea } from './geometryEngine'
import { formatNumber } from './mathUtils'

export function generateProblem() {
  const geometries = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'prism']
  const type = geometries[Math.floor(Math.random() * geometries.length)]
  const size = Math.round((Math.random() * 4 + 2) * 10) / 10

  const problems = [
    {
      title: `求${getGeometryName(type)}的体积（边长/半径=${size}）`,
      type: 'volume',
      answer: formatNumber(calculateVolume(type, { size }))
    },
    {
      title: `求${getGeometryName(type)}的表面积（边长/半径=${size}）`,
      type: 'surface',
      answer: formatNumber(calculateSurfaceArea(type, { size }))
    }
  ]
  
  return problems[Math.floor(Math.random() * problems.length)]
}

function getGeometryName(type) {
  const names = {
    cube: '正方体',
    sphere: '球体',
    cylinder: '圆柱',
    cone: '圆锥',
    pyramid: '棱锥',
    prism: '棱柱'
  }
  return names[type] || type
}

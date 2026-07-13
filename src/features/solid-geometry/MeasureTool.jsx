import { useState, useCallback, memo } from 'react'
import * as THREE from 'three'

const MEASURE_MODES = {
  NONE: 'none',
  LENGTH: 'length',
  ANGLE: 'angle',
}

const MeasureTool = memo(function MeasureTool({
  allLines,
  onMeasure,
  measurements,
  onClearMeasurements,
}) {
  const [mode, setMode] = useState(MEASURE_MODES.NONE)
  const [selectedLines, setSelectedLines] = useState([])

  const handleLineClick = useCallback((lineKey, lineData) => {
    if (mode === MEASURE_MODES.NONE) return

    if (mode === MEASURE_MODES.LENGTH) {
      onMeasure({
        type: 'length',
        lineKey,
        from: lineData.from,
        to: lineData.to,
        length: lineData.length,
      })
      setMode(MEASURE_MODES.NONE)
      setSelectedLines([])
    } else if (mode === MEASURE_MODES.ANGLE) {
      const newSelected = [...selectedLines, { key: lineKey, data: lineData }]
      setSelectedLines(newSelected)

      if (newSelected.length === 2) {
        const line1 = newSelected[0].data
        const line2 = newSelected[1].data

        const v1 = new THREE.Vector3(...line1.to).sub(new THREE.Vector3(...line1.from))
        const v2 = new THREE.Vector3(...line2.to).sub(new THREE.Vector3(...line2.from))

        const angleRad = v1.angleTo(v2)
        const angleDeg = THREE.MathUtils.radToDeg(angleRad)

        onMeasure({
          type: 'angle',
          lineKeys: [newSelected[0].key, newSelected[1].key],
          angle: angleDeg.toFixed(1),
        })

        setMode(MEASURE_MODES.NONE)
        setSelectedLines([])
      }
    }
  }, [mode, selectedLines, onMeasure])

  const clearMode = useCallback(() => {
    setMode(MEASURE_MODES.NONE)
    setSelectedLines([])
  }, [])

  const toggleMode = useCallback((newMode) => {
    if (mode === newMode) {
      clearMode()
    } else {
      setMode(newMode)
      setSelectedLines([])
    }
  }, [mode, clearMode])

  return {
    mode,
    selectedLines,
    handleLineClick,
    toggleMode,
    clearMode,
    measurements,
    onClearMeasurements,
  }
})

export { MeasureTool, MEASURE_MODES }
export default MeasureTool

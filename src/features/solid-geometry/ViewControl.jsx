import { useState, useCallback, memo } from 'react'

const VIEW_MODES = {
  PERSP: 'perspective',
  ORTHO: 'orthographic',
}

const VIEW_PRESETS = {
  DEFAULT: 'default',
  TOP: 'top',
  FRONT: 'front',
  SIDE: 'side',
  BACK: 'back',
  BOTTOM: 'bottom',
  ISOMETRIC: 'isometric',
}

const ViewControl = memo(function ViewControl({
  viewMode,
  onViewModeChange,
  onViewReset,
}) {
  const [currentPreset, setCurrentPreset] = useState(VIEW_PRESETS.DEFAULT)

  const applyPreset = useCallback((preset) => {
    setCurrentPreset(preset)
    onViewModeChange(preset)
  }, [onViewModeChange])

  const toggleProjection = useCallback(() => {
    const newMode = viewMode === VIEW_MODES.PERSP ? VIEW_MODES.ORTHO : VIEW_MODES.PERSP
    onViewModeChange(newMode)
  }, [viewMode, onViewModeChange])

  return {
    viewMode,
    currentPreset,
    VIEW_MODES,
    VIEW_PRESETS,
    applyPreset,
    toggleProjection,
    onViewReset,
  }
})

export { ViewControl, VIEW_MODES, VIEW_PRESETS }
export default ViewControl
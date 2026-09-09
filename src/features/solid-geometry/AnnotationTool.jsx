import { useState, useCallback, memo } from 'react'

const ANNOTATION_MODES = {
  NONE: 'none',
  HIGHLIGHT: 'highlight',
  LABEL: 'label',
}

const AnnotationTool = memo(function AnnotationTool({
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  onClearAnnotations,
}) {
  const [mode, setMode] = useState(ANNOTATION_MODES.NONE)
  const [labelText, setLabelText] = useState('')

  const handleEdgeHighlight = useCallback((edgeKey) => {
    if (mode === ANNOTATION_MODES.HIGHLIGHT) {
      onAddAnnotation({
        id: `highlight-${Date.now()}`,
        type: 'highlight',
        edgeKey,
        color: '#E8551F',
      })
    }
  }, [mode, onAddAnnotation])

  const handleLabelAdd = useCallback((position, edgeKey) => {
    if (mode === ANNOTATION_MODES.LABEL && labelText.trim()) {
      onAddAnnotation({
        id: `label-${Date.now()}`,
        type: 'label',
        text: labelText.trim(),
        position,
        edgeKey,
      })
      setLabelText('')
    }
  }, [mode, labelText, onAddAnnotation])

  const toggleMode = useCallback((newMode) => {
    if (mode === newMode) {
      setMode(ANNOTATION_MODES.NONE)
    } else {
      setMode(newMode)
    }
  }, [mode])

  const clearMode = useCallback(() => {
    setMode(ANNOTATION_MODES.NONE)
    setLabelText('')
  }, [])

  return {
    mode,
    labelText,
    setLabelText,
    handleEdgeHighlight,
    handleLabelAdd,
    toggleMode,
    clearMode,
    annotations,
    onRemoveAnnotation,
    onClearAnnotations,
  }
})

export { AnnotationTool, ANNOTATION_MODES }
export default AnnotationTool
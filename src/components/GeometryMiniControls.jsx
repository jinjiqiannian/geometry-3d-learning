import { memo } from 'react'
import './GeometryMiniControls.css'

const GeometryMiniControls = memo(function GeometryMiniControls({
  showFaces,
  onToggleFaces,
  showLabels,
  onToggleLabels,
  onResetCamera,
  cameraHint,
  onScreenshot,
  onShare,
}) {
  return (
    <div className="geo-mini-controls">
      <div className="gmc-bar">

        <button
          className={`gmc-btn ${showFaces ? 'active' : ''}`}
          onClick={onToggleFaces}
          title={showFaces ? '隐藏面' : '显示面'}
        >
          {showFaces ? '实体' : '线框'}
        </button>

        <div className="gmc-divider" />

        {onResetCamera && (
          <button className="gmc-btn gmc-btn-hint" onClick={onResetCamera} title={cameraHint || '重置视角'}>
            重置
          </button>
        )}

        {onScreenshot && (
          <button className="gmc-btn" onClick={onScreenshot} title="截图保存">
            截图
          </button>
        )}

        {onShare && (
          <button className="gmc-btn" onClick={onShare} title="分享链接">
            分享
          </button>
        )}
      </div>
    </div>
  )
})
export default GeometryMiniControls

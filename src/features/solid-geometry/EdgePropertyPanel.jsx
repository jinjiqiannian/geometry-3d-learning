import { useState, useEffect } from 'react'
import { getEdgeDirectionGroups, getDefaultEdgeLengths } from '../../engines/constraintSolver'
import './EdgePropertyPanel.css'

const COLOR_PRESETS = [
  { label: '黑', value: '#1a1a1a' },
  { label: '红', value: '#e53935' },
  { label: '蓝', value: '#1e88e5' },
  { label: '绿', value: '#43a047' },
  { label: '橙', value: '#fb8c00' },
  { label: '紫', value: '#8e24aa' },
]

export default function EdgePropertyPanel({
  edgeKey,           // 'AB|棱'
  edgeData,          // { id, category, from, to, length, ... }
  geometry,
  edgeColorOverrides,
  onEdgeLengthChange,
  onEdgeColorChange,
  onClose,
}) {
  if (!edgeKey || !edgeData) return null

  const edgeId = edgeData.id                         // 'AB'
  const { type, constraintMode } = geometry
  const groups = getEdgeDirectionGroups(type)

  // 找所属组
  let groupName = '—'
  for (const [gName, edges] of Object.entries(groups)) {
    if (edges.includes(edgeId)) { groupName = gName; break }
  }

  // 当前长度
  const edgeLengths = getDefaultEdgeLengths(type, constraintMode, {
    cubeSize: geometry.cubeSize ?? 2,
    cuboidA: geometry.cuboidA ?? 2,
    cuboidB: geometry.cuboidB ?? 1.2,
    cuboidC: geometry.cuboidC ?? 2,
    freeEdgeLengths: geometry.freeEdgeLengths || {},
  })
  const currentLength = edgeData.length ?? edgeLengths[edgeId] ?? 2

  // 当前颜色
  const currentColor = edgeColorOverrides?.[edgeKey] || null

  const [editLen, setEditLen] = useState(currentLength)
  useEffect(() => { setEditLen(currentLength) }, [currentLength])

  const handleApplyLength = () => {
    const v = parseFloat(editLen)
    if (!isNaN(v) && v > 0) {
      onEdgeLengthChange?.(edgeId, v)
    }
  }

  return (
    <div className="edge-property-panel">
      <div className="epp-header">
        <span className="epp-title">棱边属性</span>
        <button className="epp-close" onClick={onClose}>✕</button>
      </div>

      {/* 名称 */}
      <div className="epp-row">
        <span className="epp-label">名称</span>
        <span className="epp-name">{edgeId}</span>
      </div>

      {/* 所属组 */}
      <div className="epp-row">
        <span className="epp-label">所属组</span>
        <span className="epp-value">{groupName}</span>
      </div>

      {/* 长度 */}
      <div className="epp-row">
        <span className="epp-label">长度</span>
        <div className="epp-length-row">
          <input
            type="number"
            className="epp-length-input"
            min="0.1" max="20" step="0.1"
            value={editLen}
            onChange={e => setEditLen(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleApplyLength() }}
          />
          <button className="epp-apply-btn" onClick={handleApplyLength}>✓</button>
        </div>
      </div>

      {/* 颜色 */}
      <div className="epp-row">
        <span className="epp-label">颜色</span>
        <div className="epp-colors">
          {COLOR_PRESETS.map(c => (
            <button
              key={c.value}
              className={`epp-color-btn ${currentColor === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => onEdgeColorChange?.(edgeKey, c.value)}
              title={c.label}
            />
          ))}
          {currentColor && (
            <button
              className="epp-reset-color"
              onClick={() => onEdgeColorChange?.(edgeKey, null)}
              title="重置颜色"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      <div className="epp-hint">
        {constraintMode === 'cube' && '正方体约束：修改长度将同步所有棱'}
        {constraintMode === 'cuboid' && `长方体约束：修改长度将同步「${groupName}」组`}
        {constraintMode === 'free' && '自由建模：仅修改当前棱'}
      </div>
    </div>
  )
}

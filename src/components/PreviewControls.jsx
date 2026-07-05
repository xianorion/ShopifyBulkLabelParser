import React from 'react'

function PreviewControls({
  selectedScale,
  applyScaleGlobally,
  onToggleGlobalScale,
  onScaleChange,
  globalLineSpacing,
  onLineSpacingChange,
  onGlobalMoveStart,
  selectedLabel,
}) {
  return (
    <div className="preview-controls">
      <div className="preview-control-group">
        <label className="preview-control-label">Global move</label>
        <button type="button" className="preview-compass" aria-label="Move all labels" onPointerDown={onGlobalMoveStart}>
          ⤢
        </button>
      </div>
      <label htmlFor="modal-label-scale" className="preview-control-label">
        {applyScaleGlobally ? 'Global scale' : 'Selected scale'} <span>{selectedScale.toFixed(1)}×</span>
      </label>
      <label className="preview-checkbox">
        <input type="checkbox" checked={applyScaleGlobally} onChange={onToggleGlobalScale} />
        <span>Apply to all labels</span>
      </label>
      <input
        id="modal-label-scale"
        type="range"
        min="0.8"
        max="3.0"
        step="0.1"
        value={selectedScale}
        onChange={onScaleChange}
        disabled={!selectedLabel && !applyScaleGlobally}
      />
      <label htmlFor="modal-label-line-spacing" className="preview-control-label">
        Line spacing <span>{globalLineSpacing.toFixed(1)}×</span>
      </label>
      <input
        id="modal-label-line-spacing"
        type="range"
        min="0.8"
        max="2.2"
        step="0.1"
        value={globalLineSpacing}
        onChange={onLineSpacingChange}
      />
    </div>
  )
}

export default PreviewControls

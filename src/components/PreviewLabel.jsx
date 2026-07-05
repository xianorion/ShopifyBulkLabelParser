import React from 'react'

function PreviewLabel({
  address,
  keyId,
  position,
  scale,
  lineSpacing,
  selected,
  onSelect,
  onMoveStart,
}) {
  const lines = typeof address === 'string' ? address.split(/\r?\n|\\n/) : []

  return (
    <div className={`preview-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(keyId)}>
      <button
        type="button"
        className="preview-drag-handle"
        aria-label="Move label"
        onPointerDown={(event) => onMoveStart(event, keyId)}
      >
        ⤢
      </button>
      <div
        className="preview-card-address"
        style={{
          fontSize: `${0.95 * scale}rem`,
          lineHeight: `${lineSpacing * scale}`,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        {lines.map((line, lineIndex) => (
          <div key={`${keyId}-${lineIndex}`}>{line}</div>
        ))}
      </div>
    </div>
  )
}

export default PreviewLabel

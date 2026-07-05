export function getPreviewPages(addresses, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(addresses.length / pageSize))

  return Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageItems = addresses.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
    const emptySlots = Array.from({ length: pageSize - pageItems.length }, (_, index) => index)

    return { pageItems, emptySlots }
  })
}

export function getLabelPosition(positions, keyId) {
  return positions[keyId] || { x: 0, y: 0 }
}

export function getLabelScale(scales, globalScale, keyId, applyScaleGlobally) {
  if (applyScaleGlobally) {
    return globalScale
  }

  return scales[keyId] || globalScale
}

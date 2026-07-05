import { getLabelPosition, getLabelScale, getPreviewPages } from './previewLogic'

describe('previewLogic', () => {
  it('builds pages with empty slots for remaining labels', () => {
    const pages = getPreviewPages(['a', 'b', 'c'])

    expect(pages).toHaveLength(1)
    expect(pages[0].pageItems).toEqual(['a', 'b', 'c'])
    expect(pages[0].emptySlots).toHaveLength(7)
  })

  it('returns a default position when no label position exists', () => {
    expect(getLabelPosition({}, 'label-1')).toEqual({ x: 0, y: 0 })
  })

  it('returns the stored position when one exists', () => {
    expect(getLabelPosition({ 'label-1': { x: 5, y: 10 } }, 'label-1')).toEqual({ x: 5, y: 10 })
  })

  it('returns the global scale when global scaling is enabled', () => {
    expect(getLabelScale({}, 1.5, 'label-1', true)).toBe(1.5)
  })

  it('returns the stored scale for a specific label when global scaling is disabled', () => {
    expect(getLabelScale({ 'label-1': 2.2 }, 1.5, 'label-1', false)).toBe(2.2)
  })
})

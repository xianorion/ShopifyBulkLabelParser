import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import PreviewControls from './PreviewControls'

describe('PreviewControls', () => {
  it('renders the controls and fires the callback for global scaling toggle', () => {
    const onToggleGlobalScale = jest.fn()
    const onScaleChange = jest.fn()
    const onLineSpacingChange = jest.fn()

    render(
      <PreviewControls
        selectedScale={1.5}
        applyScaleGlobally={false}
        onToggleGlobalScale={onToggleGlobalScale}
        onScaleChange={onScaleChange}
        globalLineSpacing={1.4}
        onLineSpacingChange={onLineSpacingChange}
        onGlobalMoveStart={jest.fn()}
        selectedLabel="label-1"
      />,
    )

    expect(screen.getByText(/selected scale/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/apply to all labels/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/apply to all labels/i))
    expect(onToggleGlobalScale).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/selected scale/i), { target: { value: '2' } })
    expect(onScaleChange).toHaveBeenCalled()
  })
})

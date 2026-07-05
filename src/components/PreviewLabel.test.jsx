import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import PreviewLabel from './PreviewLabel'

describe('PreviewLabel', () => {
  it('renders the address and responds to selection and move events', () => {
    const onSelect = jest.fn()
    const onMoveStart = jest.fn()

    render(
      <PreviewLabel
        address="Jane Doe\n123 Main St"
        keyId="label-1"
        position={{ x: 2, y: 4 }}
        scale={1.5}
        lineSpacing={1.2}
        selected={false}
        onSelect={onSelect}
        onMoveStart={onMoveStart}
      />,
    )

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByRole('button', { name: /move label/i }))
    expect(onMoveStart).toHaveBeenCalled()

    fireEvent.click(screen.getByText('Jane Doe').closest('.preview-card'))
    expect(onSelect).toHaveBeenCalledWith('label-1')
  })
})

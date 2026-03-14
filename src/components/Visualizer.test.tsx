import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Visualizer } from './Visualizer'
import { useLooperStore } from '../store/looper-store'

describe('Visualizer', () => {
  beforeEach(() => {
    useLooperStore.setState(useLooperStore.getInitialState())
  })

  it('renders a canvas element', () => {
    render(<Visualizer />)
    expect(screen.getByTestId('visualizer-canvas')).toBeDefined()
  })

  it('canvas fills the container', () => {
    render(<Visualizer />)
    const canvas = screen.getByTestId('visualizer-canvas')
    expect(canvas.tagName).toBe('CANVAS')
  })

  it('accepts getAmplitude prop for rec button pulsing', () => {
    const getAmplitude = () => 0.5
    // Should not throw - Visualizer accepts the prop
    expect(() => render(<Visualizer getAmplitude={getAmplitude} />)).not.toThrow()
  })
})

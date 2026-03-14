import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the visualizer canvas', () => {
    render(<App />)
    expect(screen.getByTestId('visualizer-canvas')).toBeDefined()
  })

  it('renders the controls', () => {
    render(<App />)
    expect(screen.getByRole('combobox')).toBeDefined()
    expect(screen.getByRole('slider')).toBeDefined()
  })

  it('renders the header with logo text', () => {
    render(<App />)
    expect(screen.getByText('loopsoup')).toBeDefined()
  })
})

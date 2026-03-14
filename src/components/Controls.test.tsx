import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Controls } from './Controls'
import { useLooperStore } from '../store/looper-store'

describe('Controls', () => {
  beforeEach(() => {
    useLooperStore.setState(useLooperStore.getInitialState())
  })

  it('renders the track selector', () => {
    render(<Controls />)
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('shows ALL option in track selector', () => {
    render(<Controls />)
    expect(screen.getByText('ALL')).toBeDefined()
  })

  it('renders volume slider', () => {
    render(<Controls />)
    expect(screen.getByRole('slider')).toBeDefined()
  })

  it('renders mute button', () => {
    render(<Controls />)
    expect(screen.getByLabelText('Toggle mute')).toBeDefined()
  })

  it('renders download button', () => {
    render(<Controls />)
    expect(screen.getByLabelText('Download')).toBeDefined()
  })

  it('renders delete button', () => {
    render(<Controls />)
    expect(screen.getByLabelText('Delete')).toBeDefined()
  })

  it('volume slider changes volume', () => {
    render(<Controls />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '50' } })
    expect(useLooperStore.getState().masterVolume).toBe(50)
  })

  it('shows track options when tracks exist', () => {
    useLooperStore.getState().addTrack({
      id: 'test', buffer: new Float32Array(10), bufferR: new Float32Array(10),
      volume: 100, muted: false, offset: 0, startTime: 0,
    })
    render(<Controls />)
    expect(screen.getByText('1')).toBeDefined()
  })

  it('mute button toggles mute state', () => {
    render(<Controls />)
    fireEvent.click(screen.getByLabelText('Toggle mute'))
    expect(useLooperStore.getState().masterMuted).toBe(true)
  })
})

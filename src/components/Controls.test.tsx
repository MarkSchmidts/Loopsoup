import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Controls } from './Controls'
import { useLooperStore } from '../store/looper-store'

const noop = () => {}

describe('Controls', () => {
  beforeEach(() => {
    useLooperStore.setState(useLooperStore.getInitialState())
  })

  it('renders the track selector', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('shows ALL option in track selector', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByText('ALL')).toBeDefined()
  })

  it('renders volume slider', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByRole('slider')).toBeDefined()
  })

  it('renders mute button', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByLabelText('Toggle mute')).toBeDefined()
  })

  it('renders download button', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByLabelText('Download')).toBeDefined()
  })

  it('renders delete button', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByLabelText('Delete')).toBeDefined()
  })

  it('calls onDownload when download clicked', () => {
    const onDownload = vi.fn()
    render(<Controls onDownload={onDownload} onDelete={noop} />)
    fireEvent.click(screen.getByLabelText('Download'))
    expect(onDownload).toHaveBeenCalledOnce()
  })

  it('calls onDelete when delete clicked', () => {
    const onDelete = vi.fn()
    render(<Controls onDownload={noop} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('volume slider changes volume', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '50' } })
    expect(useLooperStore.getState().masterVolume).toBe(50)
  })

  it('shows track options when tracks exist', () => {
    useLooperStore.getState().addTrack({
      id: 'test', buffer: new Float32Array(10), bufferR: new Float32Array(10),
      volume: 100, muted: false, offset: 0, startTime: 0,
    })
    render(<Controls onDownload={noop} onDelete={noop} />)
    expect(screen.getByText('1')).toBeDefined()
  })

  it('mute button toggles mute state', () => {
    render(<Controls onDownload={noop} onDelete={noop} />)
    fireEvent.click(screen.getByLabelText('Toggle mute'))
    expect(useLooperStore.getState().masterMuted).toBe(true)
  })
})

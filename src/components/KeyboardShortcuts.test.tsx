import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardShortcuts } from './KeyboardShortcuts'

describe('KeyboardShortcuts', () => {
  it('renders the title', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined()
  })

  it('lists Space shortcut', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Space')).toBeDefined()
    expect(screen.getByText('Toggle recording (tap). Hold 2s: undo last. Hold 10s: delete all')).toBeDefined()
  })

  it('lists Enter shortcut', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Enter')).toBeDefined()
    expect(screen.getByText('Undo last track')).toBeDefined()
  })

  it('lists Delete shortcut', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Delete')).toBeDefined()
    expect(screen.getByText('Delete selected track(s)')).toBeDefined()
  })

  it('lists arrow key shortcuts', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Increase volume')).toBeDefined()
    expect(screen.getByText('Decrease volume')).toBeDefined()
    expect(screen.getByText('Select previous track')).toBeDefined()
    expect(screen.getByText('Select next track')).toBeDefined()
  })

  it('lists Ctrl shortcut for mute', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Ctrl')).toBeDefined()
    expect(screen.getByText('Toggle mute on selected track')).toBeDefined()
  })

  it('lists Shift+C for calibration', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('Shift+C')).toBeDefined()
    expect(screen.getByText('Toggle calibration mode')).toBeDefined()
  })

  it('calls onClose when OK is clicked', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcuts onClose={onClose} />)
    fireEvent.click(screen.getByText('OK'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcuts onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on ? key (toggle)', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcuts onClose={onClose} />)
    fireEvent.keyDown(window, { key: '?' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcuts onClose={onClose} />)
    fireEvent.click(screen.getByText('Keyboard Shortcuts').closest('.modal-overlay')!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

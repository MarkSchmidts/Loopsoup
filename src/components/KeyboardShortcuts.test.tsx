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
    expect(screen.getByText('Toggle recording')).toBeDefined()
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

  it('lists ? shortcut', () => {
    render(<KeyboardShortcuts onClose={() => {}} />)
    expect(screen.getByText('?')).toBeDefined()
    expect(screen.getByText('Show keyboard shortcuts')).toBeDefined()
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

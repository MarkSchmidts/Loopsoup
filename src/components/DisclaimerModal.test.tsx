import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DisclaimerModal } from './DisclaimerModal'

describe('DisclaimerModal', () => {
  it('renders the modal title', () => {
    render(<DisclaimerModal onClose={() => {}} />)
    expect(screen.getByText('Let me explain.')).toBeDefined()
  })

  it('renders the explanation text', () => {
    render(<DisclaimerModal onClose={() => {}} />)
    expect(screen.getByText('This is a simple looper.')).toBeDefined()
  })

  it('renders the OK button', () => {
    render(<DisclaimerModal onClose={() => {}} />)
    expect(screen.getByText('OK')).toBeDefined()
  })

  it('calls onClose when OK is clicked', () => {
    const onClose = vi.fn()
    render(<DisclaimerModal onClose={onClose} />)
    fireEvent.click(screen.getByText('OK'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<DisclaimerModal onClose={onClose} />)
    fireEvent.click(screen.getByText('Let me explain.').closest('.modal-overlay')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn()
    render(<DisclaimerModal onClose={onClose} />)
    fireEvent.click(screen.getByText('This is a simple looper.'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<DisclaimerModal onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Enter key', () => {
    const onClose = vi.fn()
    render(<DisclaimerModal onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('contains link to Loopsoup.org', () => {
    render(<DisclaimerModal onClose={() => {}} />)
    const link = screen.getByText('Loopsoup.org')
    expect(link.getAttribute('href')).toBe('https://loopsoup.org')
  })
})

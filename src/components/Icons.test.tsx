import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DownloadIcon, TrashIcon, VolumeHighIcon, VolumeMuteIcon } from './Icons'

describe('Icons', () => {
  it('renders DownloadIcon', () => {
    const { container } = render(<DownloadIcon />)
    expect(container.querySelector('svg')).toBeDefined()
  })

  it('renders TrashIcon', () => {
    const { container } = render(<TrashIcon />)
    expect(container.querySelector('svg')).toBeDefined()
  })

  it('renders VolumeHighIcon', () => {
    const { container } = render(<VolumeHighIcon />)
    expect(container.querySelector('svg')).toBeDefined()
  })

  it('renders VolumeMuteIcon', () => {
    const { container } = render(<VolumeMuteIcon />)
    expect(container.querySelector('svg')).toBeDefined()
  })

  it('applies custom size', () => {
    const { container } = render(<DownloadIcon size={32} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  it('applies className', () => {
    const { container } = render(<TrashIcon className="test-class" />)
    const svg = container.querySelector('svg')!
    expect(svg.classList.contains('test-class')).toBe(true)
  })
})

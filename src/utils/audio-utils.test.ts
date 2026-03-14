import { describe, it, expect } from 'vitest'
import {
  mergeFloat32Arrays,
  interleaveChannels,
  createWavBlob,
  getGermanDateFormat,
} from './audio-utils'

describe('mergeFloat32Arrays', () => {
  it('merges two arrays', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([4, 5, 6])
    const result = mergeFloat32Arrays(a, b)
    expect(result).toBeInstanceOf(Float32Array)
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('handles empty arrays', () => {
    expect(mergeFloat32Arrays(new Float32Array([]), new Float32Array([1])).length).toBe(1)
    expect(mergeFloat32Arrays(new Float32Array([1]), new Float32Array([])).length).toBe(1)
    expect(mergeFloat32Arrays(new Float32Array([]), new Float32Array([])).length).toBe(0)
  })

  it('preserves float values', () => {
    const result = mergeFloat32Arrays(new Float32Array([0.123]), new Float32Array([0.456]))
    expect(result[0]).toBeCloseTo(0.123)
    expect(result[1]).toBeCloseTo(0.456)
  })
})

describe('interleaveChannels', () => {
  it('interleaves left and right channels', () => {
    const left = new Float32Array([1, 2, 3])
    const right = new Float32Array([4, 5, 6])
    const result = interleaveChannels(left, right)
    expect(Array.from(result)).toEqual([1, 4, 2, 5, 3, 6])
  })

  it('doubles the output length', () => {
    const ch = new Float32Array(100)
    expect(interleaveChannels(ch, ch).length).toBe(200)
  })
})

describe('createWavBlob', () => {
  it('returns a Blob with audio/wav type', () => {
    const left = new Float32Array([0, 0.5, -0.5])
    const right = new Float32Array([0, 0.5, -0.5])
    const blob = createWavBlob(left, right, 44100)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('audio/wav')
  })

  it('creates correct WAV header', () => {
    const left = new Float32Array(100)
    const right = new Float32Array(100)
    const blob = createWavBlob(left, right, 44100)
    // 44 byte header + interleaved 200 samples * 2 bytes = 444
    expect(blob.size).toBe(44 + 200 * 2)
  })

  it('encodes samples as 16-bit PCM', async () => {
    const left = new Float32Array([1.0])
    const right = new Float32Array([0.0])
    const blob = createWavBlob(left, right, 44100)
    // Use FileReader to read blob (jsdom compat)
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.readAsArrayBuffer(blob)
    })
    const view = new DataView(buffer)
    // First sample at offset 44: 1.0 * 0x7FFF = 32767
    expect(view.getInt16(44, true)).toBe(32767)
    // Second sample: 0.0 = 0
    expect(view.getInt16(46, true)).toBe(0)
  })
})

describe('getGermanDateFormat', () => {
  it('formats date with year.month.day_hour.minute', () => {
    const d = new Date(2024, 0, 15, 10, 30)
    const result = getGermanDateFormat(d)
    expect(result).toContain('2024')
    expect(result).toContain('15')
  })

  it('returns a string', () => {
    expect(typeof getGermanDateFormat(new Date())).toBe('string')
  })
})

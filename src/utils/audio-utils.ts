/** Concatenate two Float32Arrays */
export function mergeFloat32Arrays(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(a.length + b.length)
  result.set(a)
  result.set(b, a.length)
  return result
}

/** Interleave stereo channels: L0,R0,L1,R1,... */
export function interleaveChannels(left: Float32Array, right: Float32Array): Float32Array {
  const length = left.length + right.length
  const result = new Float32Array(length)
  let inputIdx = 0
  for (let i = 0; i < length; ) {
    result[i++] = left[inputIdx]
    result[i++] = right[inputIdx]
    inputIdx++
  }
  return result
}

/** Create a WAV Blob from stereo channel data */
export function createWavBlob(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Blob {
  const interleaved = interleaveChannels(left, right)
  const buffer = new ArrayBuffer(44 + interleaved.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // RIFF header
  writeString(0, 'RIFF')
  view.setUint32(4, 44 + interleaved.length * 2, true)
  writeString(8, 'WAVE')

  // fmt sub-chunk
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)          // subchunk1 size
  view.setUint16(20, 1, true)           // PCM format
  view.setUint16(22, 2, true)           // stereo
  view.setUint32(24, sampleRate, true)   // sample rate
  view.setUint32(28, sampleRate * 4, true) // byte rate
  view.setUint16(32, 4, true)           // block align
  view.setUint16(34, 16, true)          // bits per sample

  // data sub-chunk
  writeString(36, 'data')
  view.setUint32(40, interleaved.length * 2, true)

  for (let i = 0; i < interleaved.length; i++) {
    view.setInt16(44 + i * 2, interleaved[i] * 0x7FFF, true)
  }

  return new Blob([view], { type: 'audio/wav' })
}

/** Format date as German date string for filenames */
export function getGermanDateFormat(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}.${d.getMonth() + 1}.${pad(d.getDate())}_${pad(d.getHours())}.${pad(d.getMinutes())}`
}

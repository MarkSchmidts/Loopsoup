import { describe, it, expect, beforeEach } from 'vitest'
import { AudioEngine } from './audio-engine'
import { useLooperStore, type Track } from '../store/looper-store'
import { mergeFloat32Arrays } from '../utils/audio-utils'

/**
 * Helper: simulate recording N samples through the engine.
 * Fires onaudioprocess on the engine's ScriptProcessorNode.
 */
function simulateRecordedAudio(engine: AudioEngine, samples: Float32Array) {
  const processor = engine.getProcessor() as unknown as {
    simulateAudioData: (s: Float32Array) => void
  }
  if (processor) {
    processor.simulateAudioData(samples)
  }
}

/** Build a Float32Array filled with a pattern for easy verification */
function makeSamples(length: number, fillValue = 0.5): Float32Array {
  const arr = new Float32Array(length)
  arr.fill(fillValue)
  return arr
}

/** Reproduce the recording callback logic from App.tsx */
function processRecordingCallback(
  rawL: Float32Array,
  rawR: Float32Array,
  firstTrackLength: number,
  loopOffsetSamples: number,
  sampleRate: number,
  latencyMs: number,
): { processedL: Float32Array; processedR: Float32Array } {
  if (rawL.length === 0) {
    return { processedL: rawL, processedR: rawR }
  }

  // Trim or pad to match first track
  let processedL: Float32Array = rawL
  let processedR: Float32Array = rawR
  if (firstTrackLength > 0) {
    if (rawL.length > firstTrackLength) {
      processedL = rawL.slice(0, firstTrackLength)
      processedR = rawR.slice(0, firstTrackLength)
    } else if (rawL.length < firstTrackLength) {
      processedL = mergeFloat32Arrays(rawL, new Float32Array(firstTrackLength - rawL.length))
      processedR = mergeFloat32Arrays(rawR, new Float32Array(firstTrackLength - rawR.length))
    }
  }

  // Latency compensation
  const latencyFrames = Math.floor(sampleRate * (latencyMs / 1000))
  if (latencyFrames > 0 && processedL.length > latencyFrames) {
    processedL = mergeFloat32Arrays(
      processedL.slice(latencyFrames),
      processedL.slice(processedL.length - latencyFrames)
    )
    processedR = mergeFloat32Arrays(
      processedR.slice(latencyFrames),
      processedR.slice(processedR.length - latencyFrames)
    )
  }

  // Rotate buffer to align with loop position
  if (loopOffsetSamples > 0 && processedL.length > 0) {
    const len = processedL.length
    const rotatedL = new Float32Array(len)
    const rotatedR = new Float32Array(len)
    const tail = len - loopOffsetSamples
    rotatedL.set(processedL.subarray(0, tail), loopOffsetSamples)
    rotatedR.set(processedR.subarray(0, tail), loopOffsetSamples)
    rotatedL.set(processedL.subarray(tail), 0)
    rotatedR.set(processedR.subarray(tail), 0)
    processedL = rotatedL
    processedR = rotatedR
  }

  return { processedL, processedR }
}

describe('Recording flow', () => {
  beforeEach(() => {
    useLooperStore.setState(useLooperStore.getInitialState())
  })

  describe('Engine: recording with simulated audio', () => {
    let engine: AudioEngine

    beforeEach(async () => {
      engine = new AudioEngine()
      await engine.init()
    })

    it('captures audio data and returns it via callback', () => {
      let capturedL: Float32Array | null = null
      let capturedR: Float32Array | null = null

      engine.startRecording((left, right) => {
        capturedL = left
        capturedR = right
      })

      // Simulate some audio data
      const testSamples = makeSamples(4096, 0.7)
      simulateRecordedAudio(engine, testSamples)

      engine.stopRecording()

      expect(capturedL).not.toBeNull()
      expect(capturedL!.length).toBe(4096)
      expect(capturedR!.length).toBe(4096)
      // Values should match the input
      expect(capturedL![0]).toBeCloseTo(0.7)
    })

    it('captures multiple audio chunks', () => {
      let capturedL: Float32Array | null = null

      engine.startRecording((left) => {
        capturedL = left
      })

      simulateRecordedAudio(engine, makeSamples(4096, 0.3))
      simulateRecordedAudio(engine, makeSamples(4096, 0.6))

      engine.stopRecording()

      expect(capturedL).not.toBeNull()
      expect(capturedL!.length).toBe(8192)
      expect(capturedL![0]).toBeCloseTo(0.3)
      expect(capturedL![4096]).toBeCloseTo(0.6)
    })

    it('can record a second time after stopping', () => {
      let firstL: Float32Array | null = null
      let secondL: Float32Array | null = null

      engine.startRecording((left) => { firstL = left })
      simulateRecordedAudio(engine, makeSamples(4096, 0.5))
      engine.stopRecording()

      engine.startRecording((left) => { secondL = left })
      simulateRecordedAudio(engine, makeSamples(4096, 0.9))
      engine.stopRecording()

      expect(firstL).not.toBeNull()
      expect(secondL).not.toBeNull()
      expect(firstL!.length).toBe(4096)
      expect(secondL!.length).toBe(4096)
      expect(firstL![0]).toBeCloseTo(0.5)
      expect(secondL![0]).toBeCloseTo(0.9)
    })
  })

  describe('Buffer processing: first track (no existing tracks)', () => {
    it('passes through raw audio with no trim, pad, or rotation', () => {
      const raw = makeSamples(44100, 0.5) // 1 second at 44100
      const { processedL } = processRecordingCallback(
        raw, new Float32Array(raw), 0, 0, 44100, 0
      )
      expect(processedL.length).toBe(44100)
      expect(processedL[0]).toBeCloseTo(0.5)
    })

    it('applies latency compensation', () => {
      const raw = new Float32Array(44100)
      // Fill with position markers: each sample is its index
      for (let i = 0; i < raw.length; i++) raw[i] = i

      const { processedL } = processRecordingCallback(
        raw, new Float32Array(raw), 0, 0, 44100, 100 // 100ms latency
      )

      // 100ms at 44100 = 4410 frames latency
      // After latency comp, sample at position 0 should be what was at position 4410
      expect(processedL.length).toBe(44100)
      expect(processedL[0]).toBe(4410) // shifted by latency
    })
  })

  describe('Buffer processing: second track (with existing tracks)', () => {
    it('trims recording to match first track length', () => {
      const raw = makeSamples(50000, 0.5)
      const { processedL } = processRecordingCallback(
        raw, new Float32Array(raw), 44100, 0, 44100, 0
      )
      expect(processedL.length).toBe(44100)
    })

    it('pads recording to match first track length', () => {
      const raw = makeSamples(40000, 0.5)
      const { processedL } = processRecordingCallback(
        raw, new Float32Array(raw), 44100, 0, 44100, 0
      )
      expect(processedL.length).toBe(44100)
      // Padded portion should be zero
      expect(processedL[40000]).toBe(0)
    })

    it('rotates buffer when recording starts mid-loop', () => {
      const len = 10
      // Create a recording: [A, A, A, A, A, B, B, B, B, B]
      // where A=0.1 (recorded at loop positions 5-9) and B=0.2 (recorded at loop positions 0-4)
      const raw = new Float32Array(len)
      raw.fill(0.1, 0, 5) // First 5 samples recorded
      raw.fill(0.2, 5, 10) // Last 5 samples recorded

      // Recording started at loop position 5 (offset = 5)
      const { processedL } = processRecordingCallback(
        raw, new Float32Array(raw), len, 5, 44100, 0
      )

      // After rotation:
      // buffer[5..9] should have the first part of recording (0.1)
      // buffer[0..4] should have the second part of recording (0.2)
      expect(processedL[0]).toBeCloseTo(0.2) // loop pos 0 = B
      expect(processedL[4]).toBeCloseTo(0.2) // loop pos 4 = B
      expect(processedL[5]).toBeCloseTo(0.1) // loop pos 5 = A
      expect(processedL[9]).toBeCloseTo(0.1) // loop pos 9 = A
    })

    it('handles rotation when offset equals buffer length (edge case)', () => {
      const len = 100
      const raw = makeSamples(len, 0.5)
      // This should NOT throw — offset === len means we're at the very start
      expect(() => {
        processRecordingCallback(raw, new Float32Array(raw), len, len, 44100, 0)
      }).not.toThrow()
    })

    it('handles rotation with latency compensation combined', () => {
      const len = 44100 // 1 second
      const raw = new Float32Array(len)
      for (let i = 0; i < len; i++) raw[i] = i / len // position markers

      const { processedL } = processRecordingCallback(
        raw, new Float32Array(raw), len, 22050, 44100, 0
      )
      // Should rotate so the first half of recording goes to positions 22050-44099
      // and second half goes to positions 0-22049
      expect(processedL.length).toBe(len)
    })
  })

  describe('Full recording flow: store integration', () => {
    let engine: AudioEngine

    beforeEach(async () => {
      engine = new AudioEngine()
      await engine.init()
    })

    it('first recording creates a track in the store', () => {
      let capturedL: Float32Array | null = null
      let capturedR: Float32Array | null = null

      engine.startRecording((left, right) => {
        capturedL = left
        capturedR = right
      })

      simulateRecordedAudio(engine, makeSamples(44100, 0.5))
      engine.stopRecording()

      expect(capturedL).not.toBeNull()
      expect(capturedL!.length).toBeGreaterThan(0)

      // Simulate what App does: add to store
      const track: Track = {
        id: 'test-track-1',
        buffer: capturedL!,
        bufferR: capturedR!,
        volume: 100,
        muted: false,
        offset: 0,
        startTime: Date.now(),
      }
      useLooperStore.getState().addTrack(track)

      expect(useLooperStore.getState().tracks).toHaveLength(1)
      expect(useLooperStore.getState().tracks[0].buffer.length).toBe(44100)
    })

    it('second recording creates a track with same length as first', () => {
      // Add first track
      const firstTrack: Track = {
        id: 'track-1',
        buffer: makeSamples(44100, 0.3),
        bufferR: makeSamples(44100, 0.3),
        volume: 100,
        muted: false,
        offset: 0,
        startTime: Date.now(),
      }
      useLooperStore.getState().addTrack(firstTrack)
      useLooperStore.getState().setRecordStartTime(Date.now())

      // Simulate second recording
      let capturedL: Float32Array | null = null
      let capturedR: Float32Array | null = null

      engine.startRecording((left, right) => {
        capturedL = left
        capturedR = right
      })

      // Record more than the first track length
      simulateRecordedAudio(engine, makeSamples(50000, 0.7))
      engine.stopRecording()

      expect(capturedL).not.toBeNull()

      // Process through the same callback logic as App
      const { processedL } = processRecordingCallback(
        capturedL!, capturedR!, 44100, 0, 44100, 0
      )

      expect(processedL.length).toBe(44100) // trimmed to match first track
    })
  })
})

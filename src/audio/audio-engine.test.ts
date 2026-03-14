import { describe, it, expect, beforeEach } from 'vitest'
import { AudioEngine } from './audio-engine'

describe('AudioEngine', () => {
  let engine: AudioEngine

  beforeEach(() => {
    engine = new AudioEngine()
  })

  describe('initialization', () => {
    it('creates an AudioEngine instance', () => {
      expect(engine).toBeDefined()
    })

    it('starts not initialized', () => {
      expect(engine.isInitialized()).toBe(false)
    })

    it('initializes with mic access', async () => {
      await engine.init()
      expect(engine.isInitialized()).toBe(true)
    })

    it('creates audio context on init', async () => {
      await engine.init()
      expect(engine.getAudioContext()).toBeDefined()
      expect(engine.getAudioContext()?.sampleRate).toBe(44100)
    })
  })

  describe('recording', () => {
    it('is not recording initially', () => {
      expect(engine.isRecording()).toBe(false)
    })

    it('can start recording after init', async () => {
      await engine.init()
      engine.startRecording()
      expect(engine.isRecording()).toBe(true)
    })

    it('can stop recording', async () => {
      await engine.init()
      engine.startRecording()
      engine.stopRecording()
      expect(engine.isRecording()).toBe(false)
    })

    it('startRecording sets up ScriptProcessorNode and captures buffers', async () => {
      await engine.init()
      const onData = (left: Float32Array, right: Float32Array) => {
        expect(left).toBeInstanceOf(Float32Array)
        expect(right).toBeInstanceOf(Float32Array)
      }
      engine.startRecording(onData)
      expect(engine.isRecording()).toBe(true)
      expect(engine.getProcessor()).toBeDefined()
    })

    it('stopRecording disconnects processor and returns buffers via callback', async () => {
      await engine.init()
      engine.startRecording((left, right) => {
        expect(left.length).toBeGreaterThanOrEqual(0)
        expect(right.length).toBeGreaterThanOrEqual(0)
      })
      engine.stopRecording()
      expect(engine.isRecording()).toBe(false)
      expect(engine.getProcessor()).toBeNull()
    })
  })

  describe('gain nodes', () => {
    it('creates master gain on init', async () => {
      await engine.init()
      expect(engine.getMasterGain()).toBeDefined()
    })

    it('sets master volume', async () => {
      await engine.init()
      engine.setMasterVolume(0.5)
      expect(engine.getMasterGain()!.gain.value).toBe(0.5)
    })

    it('mutes master', async () => {
      await engine.init()
      engine.muteMaster()
      expect(engine.getMasterGain()!.gain.value).toBe(0)
    })

    it('unmutes master', async () => {
      await engine.init()
      engine.setMasterVolume(0.75)
      engine.muteMaster()
      engine.unmuteMaster()
      expect(engine.getMasterGain()!.gain.value).toBe(0.75)
    })
  })

  describe('input amplitude', () => {
    it('returns 0 when not initialized', () => {
      expect(engine.getInputAmplitude()).toBe(0)
    })

    it('returns a number after init', async () => {
      await engine.init()
      const amp = engine.getInputAmplitude()
      expect(typeof amp).toBe('number')
    })
  })

  describe('playback', () => {
    it('plays a buffer', async () => {
      await engine.init()
      const ctx = engine.getAudioContext()!
      const buffer = ctx.createBuffer(2, 4410, 44100)
      const { source, gain } = engine.playBuffer(buffer)
      expect(source).toBeDefined()
      expect(gain).toBeDefined()
    })

    it('stops a source node', async () => {
      await engine.init()
      const ctx = engine.getAudioContext()!
      const buffer = ctx.createBuffer(2, 4410, 44100)
      const { source } = engine.playBuffer(buffer)
      expect(() => engine.stopSource(source)).not.toThrow()
    })
  })

  describe('AudioContext resume', () => {
    it('resumes AudioContext on init', async () => {
      await engine.init()
      const ctx = engine.getAudioContext()!
      // resume() should have been called during init
      expect(ctx.state).toBe('running')
    })

    it('resumes AudioContext when starting recording', async () => {
      await engine.init()
      engine.startRecording()
      // After startRecording, context should be running
      const ctx = engine.getAudioContext()!
      expect(ctx.state).toBe('running')
    })
  })

  describe('mic access tracking', () => {
    it('reports mic access status', async () => {
      await engine.init()
      expect(engine.hasMicAccess()).toBe(true)
    })

    it('does not start recording without mic access', async () => {
      // engine not initialized
      engine.startRecording()
      expect(engine.isRecording()).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('disposes without error', async () => {
      await engine.init()
      expect(() => engine.dispose()).not.toThrow()
    })

    it('marks as not initialized after dispose', async () => {
      await engine.init()
      engine.dispose()
      expect(engine.isInitialized()).toBe(false)
    })
  })

  describe('StrictMode resilience (init/dispose/init)', () => {
    it('works after dispose and reinit (simulates React StrictMode double-mount)', async () => {
      // Mount 1: start init
      const initPromise1 = engine.init()

      // Unmount: dispose while init is pending
      engine.dispose()

      // Mount 2: reinit
      await engine.init()

      // Wait for first init to settle (it may have thrown internally)
      await initPromise1.catch(() => {})

      // Engine should be fully functional after the second init
      expect(engine.isInitialized()).toBe(true)
      expect(engine.hasMicAccess()).toBe(true)
    })

    it('can record after dispose and reinit', async () => {
      await engine.init()
      engine.dispose()
      await engine.init()

      let capturedL: Float32Array | null = null
      engine.startRecording((left) => { capturedL = left })
      expect(engine.isRecording()).toBe(true)

      // Simulate audio data
      const processor = engine.getProcessor() as unknown as {
        simulateAudioData: (s: Float32Array) => void
      }
      processor.simulateAudioData(new Float32Array(4096).fill(0.5))

      engine.stopRecording()
      expect(capturedL).not.toBeNull()
      expect(capturedL!.length).toBe(4096)
    })

    it('concurrent init does not corrupt engine state', async () => {
      // Simulate StrictMode: init starts, dispose runs, init starts again
      const init1 = engine.init()
      engine.dispose()
      const init2 = engine.init()

      // Wait for both to settle
      await init1.catch(() => {})
      await init2

      // The engine should be in a clean, working state
      expect(engine.isInitialized()).toBe(true)
      expect(engine.hasMicAccess()).toBe(true)

      // Recording should work
      engine.startRecording()
      expect(engine.isRecording()).toBe(true)
      engine.stopRecording()
    })

    it('old init completion does not corrupt state after dispose + reinit', async () => {
      // This simulates what happens in React StrictMode:
      // 1. Mount 1 effect starts init (promise stored)
      // 2. StrictMode cleanup: dispose()
      // 3. Mount 2 effect starts init
      // 4. Mount 1's init promise resolves/rejects later
      // After all settle, the engine must work correctly

      const init1 = engine.init()
      engine.dispose()
      const init2 = engine.init()

      // Let everything settle
      await Promise.allSettled([init1, init2])

      // Engine should work - the second init should win
      expect(engine.isInitialized()).toBe(true)
      expect(engine.hasMicAccess()).toBe(true)
      expect(engine.getAudioContext()).not.toBeNull()

      // Critical: startRecording must actually start
      engine.startRecording()
      expect(engine.isRecording()).toBe(true)
      engine.stopRecording()
      expect(engine.isRecording()).toBe(false)
    })
  })
})

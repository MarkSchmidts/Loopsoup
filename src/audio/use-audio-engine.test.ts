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
      const node = engine.playBuffer(buffer)
      expect(node).toBeDefined()
    })

    it('stops a source node', async () => {
      await engine.init()
      const ctx = engine.getAudioContext()!
      const buffer = ctx.createBuffer(2, 4410, 44100)
      const node = engine.playBuffer(buffer)
      expect(() => engine.stopSource(node)).not.toThrow()
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
})

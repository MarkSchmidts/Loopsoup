import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock Web Audio API for jsdom
class MockAudioParam {
  value: number
  defaultValue: number
  minValue: number
  maxValue: number
  constructor(defaultValue = 1) {
    this.value = defaultValue
    this.defaultValue = defaultValue
    this.minValue = -3.4028235e38
    this.maxValue = 3.4028235e38
  }
  setValueAtTime() { return this }
  linearRampToValueAtTime() { return this }
  exponentialRampToValueAtTime() { return this }
}

class MockGainNode {
  gain = new MockAudioParam(1)
  connect(dest: unknown) { return dest }
  disconnect() {}
}

class MockAnalyserNode {
  frequencyBinCount = 1024
  fftSize = 2048
  context: unknown = null
  connect(dest: unknown) { return dest }
  disconnect() {}
  getByteFrequencyData(array: Uint8Array) {
    for (let i = 0; i < array.length; i++) array[i] = 128
  }
  getFloatTimeDomainData(array: Float32Array) {
    for (let i = 0; i < array.length; i++) array[i] = 0
  }
}

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null
  loop = false
  connect(dest: unknown) { return dest }
  disconnect() {}
  start() {}
  stop() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockAudioBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  duration: number
  private _channels: Float32Array[]

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels
    this.length = options.length
    this.sampleRate = options.sampleRate
    this.duration = options.length / options.sampleRate
    this._channels = []
    for (let i = 0; i < options.numberOfChannels; i++) {
      this._channels.push(new Float32Array(options.length))
    }
  }
  getChannelData(channel: number) { return this._channels[channel] }
  copyToChannel(source: Float32Array, channel: number) {
    this._channels[channel].set(source)
  }
}

class MockMediaStreamSource {
  connect(dest: unknown) { return dest }
  disconnect() {}
}

class MockScriptProcessorNode {
  onaudioprocess: ((e: unknown) => void) | null = null
  connect(dest: unknown) { return dest }
  disconnect() {}
}

class MockAudioContext {
  sampleRate = 44100
  currentTime = 0
  state = 'running'
  destination = {} as AudioDestinationNode

  createGain(): GainNode { return new MockGainNode() as unknown as GainNode }
  createBufferSource() { return new MockAudioBufferSourceNode() as unknown as AudioBufferSourceNode }
  createAnalyser() {
    const a = new MockAnalyserNode()
    a.context = this
    return a as unknown as AnalyserNode
  }
  createMediaStreamSource() { return new MockMediaStreamSource() as unknown as MediaStreamAudioSourceNode }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate }) as unknown as AudioBuffer
  }
  createScriptProcessor() { return new MockScriptProcessorNode() as unknown as ScriptProcessorNode }
  resume() { return Promise.resolve() }
  close() { return Promise.resolve() }
}

// Install mocks globally
Object.defineProperty(window, 'AudioContext', { value: MockAudioContext, writable: true })
Object.defineProperty(window, 'webkitAudioContext', { value: MockAudioContext, writable: true })
Object.defineProperty(window, 'AudioBuffer', { value: MockAudioBuffer, writable: true })

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(() =>
      Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }],
      })
    ),
  },
  writable: true,
})

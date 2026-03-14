/**
 * AudioEngine - manages Web Audio API context, microphone input,
 * gain nodes, recording, and playback.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private input: MediaStreamAudioSourceNode | null = null
  private inputAnalyser: AnalyserNode | null = null
  private masterGain: GainNode | null = null
  private monitorGain: GainNode | null = null
  private recording = false
  private initialized = false
  private savedMasterVolume = 1

  async init(): Promise<void> {
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.monitorGain = this.ctx.createGain()
    this.inputAnalyser = this.ctx.createAnalyser()

    // Mute monitor by default (prevents feedback)
    this.monitorGain.gain.value = 0

    // Connect: input -> analyser -> monitor -> destination
    //                              masterGain -> destination
    this.masterGain.connect(this.ctx.destination)
    this.monitorGain.connect(this.ctx.destination)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.input = this.ctx.createMediaStreamSource(stream)
      this.input.connect(this.inputAnalyser)
      this.inputAnalyser.connect(this.monitorGain)
    } catch {
      console.warn('Microphone access denied or unavailable')
    }

    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  isRecording(): boolean {
    return this.recording
  }

  getAudioContext(): AudioContext | null {
    return this.ctx
  }

  getMasterGain(): GainNode | null {
    return this.masterGain
  }

  getAnalyser(): AnalyserNode | null {
    return this.inputAnalyser
  }

  startRecording(): void {
    if (!this.initialized) return
    this.recording = true
  }

  stopRecording(): void {
    this.recording = false
  }

  setMasterVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = value
      this.savedMasterVolume = value
    }
  }

  muteMaster(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = 0
    }
  }

  unmuteMaster(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.savedMasterVolume
    }
  }

  getInputAmplitude(): number {
    if (!this.inputAnalyser) return 0
    const data = new Uint8Array(this.inputAnalyser.frequencyBinCount)
    this.inputAnalyser.getByteFrequencyData(data)
    let sum = 0
    const width = 5
    for (let i = 0; i < width; i++) sum += data[i]
    return sum / (width * 256 - 1)
  }

  /** Play an AudioBuffer as a looping source, connected to masterGain */
  playBuffer(buffer: AudioBuffer, offset = 0): AudioBufferSourceNode {
    const source = this.ctx!.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gainNode = this.ctx!.createGain()
    source.connect(gainNode)
    gainNode.connect(this.masterGain!)

    source.start(0, offset)
    return source
  }

  stopSource(source: AudioBufferSourceNode): void {
    try {
      source.stop()
    } catch {
      // Already stopped
    }
  }

  createBuffer(channels: number, length: number): AudioBuffer {
    return this.ctx!.createBuffer(channels, length, this.ctx!.sampleRate)
  }

  dispose(): void {
    if (this.ctx) {
      try { this.ctx.close() } catch { /* ignore */ }
    }
    this.ctx = null
    this.masterGain = null
    this.monitorGain = null
    this.inputAnalyser = null
    this.input = null
    this.initialized = false
    this.recording = false
  }
}

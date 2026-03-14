/**
 * AudioEngine - manages Web Audio API context, microphone input,
 * gain nodes, recording via ScriptProcessorNode, and playback.
 */
export type RecordingCallback = (left: Float32Array, right: Float32Array) => void

export class AudioEngine {
  private ctx: AudioContext | null = null
  private input: MediaStreamAudioSourceNode | null = null
  private inputAnalyser: AnalyserNode | null = null
  private masterGain: GainNode | null = null
  private monitorGain: GainNode | null = null
  private recording = false
  private initialized = false
  private savedMasterVolume = 1
  private micAccessGranted = false

  // Recording state
  private processor: ScriptProcessorNode | null = null
  private recordCallback: RecordingCallback | null = null
  private buffersL: Float32Array[] = []
  private buffersR: Float32Array[] = []
  private totalRecordedLength = 0

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
      this.micAccessGranted = true
    } catch {
      console.warn('Microphone access denied or unavailable')
      this.micAccessGranted = false
    }

    // Resume AudioContext (may be suspended if created outside user gesture)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  isRecording(): boolean {
    return this.recording
  }

  hasMicAccess(): boolean {
    return this.micAccessGranted
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

  getProcessor(): ScriptProcessorNode | null {
    return this.processor
  }

  /**
   * Start recording from mic input via ScriptProcessorNode.
   * When stopRecording() is called, the callback receives the
   * concatenated left and right channel Float32Arrays.
   */
  startRecording(callback?: RecordingCallback): void {
    if (!this.initialized || !this.ctx || !this.inputAnalyser || !this.micAccessGranted) return

    // Resume context if suspended (e.g. Chrome autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    this.recording = true
    this.recordCallback = callback || null
    this.buffersL = []
    this.buffersR = []
    this.totalRecordedLength = 0

    // Use 1 input channel (mono mic) to avoid channel mismatch issues
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.recording) return

      // Capture mono input into both L and R channels
      const inputData = new Float32Array(e.inputBuffer.getChannelData(0))
      this.buffersL.push(inputData)
      this.buffersR.push(new Float32Array(inputData))
      this.totalRecordedLength += inputData.length
    }

    // Connect: analyser -> processor -> destination
    // (processor must be connected to destination for onaudioprocess to fire)
    this.inputAnalyser.connect(this.processor)
    this.processor.connect(this.ctx.destination)
  }

  /**
   * Stop recording. Disconnects processor, builds final buffers,
   * and calls the callback with the recorded audio data.
   */
  stopRecording(): void {
    this.recording = false

    if (this.processor && this.inputAnalyser) {
      try { this.processor.disconnect() } catch { /* ignore */ }
      try { this.inputAnalyser.disconnect(this.processor) } catch { /* ignore */ }
    }

    // Build final concatenated buffers
    if (this.recordCallback && this.totalRecordedLength > 0) {
      const finalL = new Float32Array(this.totalRecordedLength)
      const finalR = new Float32Array(this.totalRecordedLength)
      let offset = 0
      for (const b of this.buffersL) {
        finalL.set(b, offset)
        offset += b.length
      }
      offset = 0
      for (const b of this.buffersR) {
        finalR.set(b, offset)
        offset += b.length
      }
      this.recordCallback(finalL, finalR)
    } else if (this.recordCallback) {
      this.recordCallback(new Float32Array(0), new Float32Array(0))
    }

    this.processor = null
    this.buffersL = []
    this.buffersR = []
    this.totalRecordedLength = 0
    this.recordCallback = null
  }

  /** Get the total number of frames recorded so far */
  getRecordedLength(): number {
    return this.totalRecordedLength
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
    if (this.recording) {
      this.recording = false
      if (this.processor) {
        try { this.processor.disconnect() } catch { /* ignore */ }
      }
    }
    if (this.ctx) {
      try { this.ctx.close() } catch { /* ignore */ }
    }
    this.ctx = null
    this.masterGain = null
    this.monitorGain = null
    this.inputAnalyser = null
    this.input = null
    this.processor = null
    this.initialized = false
    this.recording = false
    this.micAccessGranted = false
  }
}

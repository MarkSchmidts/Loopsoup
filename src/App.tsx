import { useEffect, useRef, useCallback } from 'react'
import { Controls } from './components/Controls'
import { Visualizer } from './components/Visualizer'
import { AudioEngine } from './audio/audio-engine'
import { useLooperStore, type Track } from './store/looper-store'
import { mergeFloat32Arrays, createWavBlob, getGermanDateFormat } from './utils/audio-utils'
import './styles/app.css'

let engineInstance: AudioEngine | null = null

function getEngine(): AudioEngine {
  if (!engineInstance) engineInstance = new AudioEngine()
  return engineInstance
}

export default function App() {
  const engineRef = useRef<AudioEngine>(getEngine())
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])

  const tracks = useLooperStore((s) => s.tracks)
  const isRecording = useLooperStore((s) => s.isRecording)
  const masterVolume = useLooperStore((s) => s.masterVolume)
  const masterMuted = useLooperStore((s) => s.masterMuted)
  const latencyMs = useLooperStore((s) => s.latencyMs)
  const selectedTrack = useLooperStore((s) => s.selectedTrack)
  const addTrack = useLooperStore((s) => s.addTrack)
  const setRecording = useLooperStore((s) => s.setRecording)
  const setRecordStartTime = useLooperStore((s) => s.setRecordStartTime)
  const removeTrack = useLooperStore((s) => s.removeTrack)
  const removeAllTracks = useLooperStore((s) => s.removeAllTracks)
  const undoLastTrack = useLooperStore((s) => s.undoLastTrack)

  // Initialize audio engine
  useEffect(() => {
    const engine = engineRef.current
    engine.init().catch(console.error)
    return () => engine.dispose()
  }, [])

  // Sync master volume/mute to audio engine
  useEffect(() => {
    const engine = engineRef.current
    if (!engine.isInitialized()) return
    if (masterMuted) {
      engine.muteMaster()
    } else {
      engine.setMasterVolume(masterVolume / 100)
    }
  }, [masterVolume, masterMuted])

  // Sync track volumes
  useEffect(() => {
    tracks.forEach((_track, i) => {
      const source = sourcesRef.current[i]
      if (source) {
        // Track gain is handled via GainNodes in playback
      }
    })
  }, [tracks])

  // Replay all tracks when tracks change
  useEffect(() => {
    const engine = engineRef.current
    if (!engine.isInitialized()) return

    // Stop old sources
    sourcesRef.current.forEach((s) => {
      try { s.stop() } catch { /* ignore */ }
    })
    sourcesRef.current = []

    // Start new sources
    tracks.forEach((track) => {
      if (track.buffer.length > 0) {
        const ctx = engine.getAudioContext()!
        const buf = ctx.createBuffer(2, track.buffer.length, ctx.sampleRate)
        buf.copyToChannel(new Float32Array(track.buffer), 0)
        buf.copyToChannel(new Float32Array(track.bufferR), 1)
        const source = engine.playBuffer(buf, track.offset)
        sourcesRef.current.push(source)
      }
    })
  }, [tracks])

  const handleToggleRec = useCallback(() => {
    const engine = engineRef.current
    if (!engine.isInitialized()) return

    if (isRecording) {
      // Stop recording - in a real app, we'd get the recorded buffer from
      // a MediaRecorder or ScriptProcessor. For now, we use a simplified approach.
      setRecording(false)
    } else {
      setRecording(true)
      setRecordStartTime(Date.now())

      // Start MediaRecorder-based recording
      const ctx = engine.getAudioContext()!
      const analyser = engine.getAnalyser()
      if (!analyser) return

      const processor = ctx.createScriptProcessor(4096, 2, 2)
      const buffersL: Float32Array[] = []
      const buffersR: Float32Array[] = []
      let totalLength = 0

      const firstTrackLength = tracks.length > 0 ? tracks[0].buffer.length : 0

      processor.onaudioprocess = (e: AudioProcessEvent) => {
        if (!useLooperStore.getState().isRecording) {
          processor.disconnect()
          analyser.disconnect(processor)

          // Build final buffer
          const finalL = new Float32Array(totalLength)
          const finalR = new Float32Array(totalLength)
          let offset = 0
          for (const b of buffersL) {
            finalL.set(b, offset)
            offset += b.length
          }
          offset = 0
          for (const b of buffersR) {
            finalR.set(b, offset)
            offset += b.length
          }

          // Trim or pad to match first track
          let processedL: Float32Array = finalL
          let processedR: Float32Array = finalR
          if (firstTrackLength > 0) {
            if (totalLength > firstTrackLength) {
              processedL = finalL.slice(0, firstTrackLength)
              processedR = finalR.slice(0, firstTrackLength)
            } else if (totalLength < firstTrackLength) {
              processedL = mergeFloat32Arrays(finalL, new Float32Array(firstTrackLength - totalLength))
              processedR = mergeFloat32Arrays(finalR, new Float32Array(firstTrackLength - totalLength))
            }
          }

          // Latency compensation
          const latencyFrames = Math.floor(ctx.sampleRate * (latencyMs / 1000))
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

          const track: Track = {
            id: `track-${Date.now()}`,
            buffer: processedL,
            bufferR: processedR,
            volume: 100,
            muted: false,
            offset: 0,
            startTime: Date.now(),
          }
          addTrack(track)
          return
        }

        const inputL = new Float32Array(e.inputBuffer.getChannelData(0))
        const inputR = new Float32Array(e.inputBuffer.getChannelData(1))
        buffersL.push(inputL)
        buffersR.push(inputR)
        totalLength += inputL.length

        // Auto-stop when first loop length reached
        if (firstTrackLength > 0 && totalLength >= firstTrackLength) {
          useLooperStore.getState().setRecording(false)
        }
      }

      analyser.connect(processor)
      processor.connect(ctx.destination)
    }
  }, [isRecording, tracks, latencyMs, addTrack, setRecording, setRecordStartTime])

  const handleDelete = useCallback(() => {
    if (selectedTrack === -1) {
      if (tracks.length > 0 && window.confirm('Delete all tracks?')) {
        removeAllTracks()
      }
    } else {
      removeTrack(selectedTrack)
    }
  }, [selectedTrack, tracks.length, removeAllTracks, removeTrack])

  const handleDownload = useCallback(() => {
    if (tracks.length === 0) return

    let left: Float32Array, right: Float32Array, filename: string

    if (selectedTrack === -1) {
      // Merge all tracks
      const len = tracks[0].buffer.length
      left = new Float32Array(len)
      right = new Float32Array(len)
      for (const t of tracks) {
        for (let i = 0; i < len; i++) {
          left[i] += t.buffer[i] || 0
          right[i] += t.bufferR[i] || 0
        }
      }
      filename = `loopsoup_${getGermanDateFormat(new Date())}_allTracks.wav`
    } else {
      left = tracks[selectedTrack].buffer
      right = tracks[selectedTrack].bufferR
      filename = `loopsoup_${getGermanDateFormat(new Date())}_Track${selectedTrack + 1}.wav`
    }

    const engine = engineRef.current
    const sampleRate = engine.getAudioContext()?.sampleRate ?? 44100
    const blob = createWavBlob(left, right, sampleRate)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [tracks, selectedTrack])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleToggleRec()
      } else if (e.code === 'Enter') {
        e.preventDefault()
        undoLastTrack()
      } else if (e.code === 'Delete') {
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleToggleRec, handleDelete, undoLastTrack])

  return (
    <div className="looper-app">
      <header className="header">
        <h1 className="logo">loopsoup</h1>
      </header>

      <div className="visualizer-container" onClick={handleToggleRec}>
        <Visualizer />
      </div>

      <Controls />

      <div className="controls-actions">
        <button onClick={handleDownload} aria-label="Download" className="action-btn">
          ⬇ Download
        </button>
        <button onClick={handleDelete} aria-label="Delete" className="action-btn action-btn-danger">
          🗑 Delete
        </button>
      </div>
    </div>
  )
}

// Type augmentation for AudioProcessEvent
interface AudioProcessEvent extends Event {
  inputBuffer: AudioBuffer
  outputBuffer: AudioBuffer
}

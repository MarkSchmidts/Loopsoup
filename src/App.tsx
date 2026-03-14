import { useEffect, useRef, useCallback, useState } from 'react'
import { Controls } from './components/Controls'
import { Visualizer } from './components/Visualizer'
import { DisclaimerModal } from './components/DisclaimerModal'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
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
  const selectedTrack = useLooperStore((s) => s.selectedTrack)
  const addTrack = useLooperStore((s) => s.addTrack)
  const setRecording = useLooperStore((s) => s.setRecording)
  const setRecordStartTime = useLooperStore((s) => s.setRecordStartTime)
  const removeTrack = useLooperStore((s) => s.removeTrack)
  const removeAllTracks = useLooperStore((s) => s.removeAllTracks)
  const undoLastTrack = useLooperStore((s) => s.undoLastTrack)

  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return !localStorage.getItem('loopsoup_disclaimer_seen')
  })
  const [showShortcuts, setShowShortcuts] = useState(false)

  const initPromiseRef = useRef<Promise<void> | null>(null)

  const ensureInit = useCallback(async () => {
    const engine = engineRef.current
    if (engine.isInitialized()) return
    if (!initPromiseRef.current) {
      initPromiseRef.current = engine.init()
    }
    await initPromiseRef.current
  }, [])

  // Initialize audio engine
  useEffect(() => {
    ensureInit().catch(console.error)
    return () => engineRef.current.dispose()
  }, [ensureInit])

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

  // Auto-stop recording when first loop length is reached
  useEffect(() => {
    if (!isRecording || tracks.length === 0) return

    const engine = engineRef.current
    const firstTrackLength = tracks[0].buffer.length
    if (firstTrackLength === 0) return

    const interval = setInterval(() => {
      if (engine.getRecordedLength() >= firstTrackLength) {
        setRecording(false)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isRecording, tracks, setRecording])

  // When isRecording goes from true -> false (e.g. auto-stop), stop engine
  const wasRecordingRef = useRef(false)
  useEffect(() => {
    const engine = engineRef.current
    if (wasRecordingRef.current && !isRecording && engine.isRecording()) {
      engine.stopRecording()
    }
    wasRecordingRef.current = isRecording
  }, [isRecording, tracks])

  const handleToggleRec = useCallback(async () => {
    await ensureInit()
    const engine = engineRef.current

    if (isRecording) {
      // Stop recording - callback from startRecording will fire with buffers
      engine.stopRecording()
      setRecording(false)
    } else {
      // Start recording
      setRecording(true)
      setRecordStartTime(Date.now())

      const firstTrackLength = tracks.length > 0 ? tracks[0].buffer.length : 0

      engine.startRecording((rawL, rawR) => {
        if (rawL.length === 0) return

        const ctx = engine.getAudioContext()
        const sampleRate = ctx?.sampleRate ?? 44100

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
        const currentLatencyMs = useLooperStore.getState().latencyMs
        const latencyFrames = Math.floor(sampleRate * (currentLatencyMs / 1000))
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
      })
    }
  }, [isRecording, tracks, addTrack, setRecording, setRecordStartTime, ensureInit])

  const handleDelete = useCallback(() => {
    if (selectedTrack === -1) {
      if (tracks.length > 0 && window.confirm('Currently all tracks are selected. Do you want to delete them all?')) {
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

  const handleCloseDisclaimer = useCallback(() => {
    localStorage.setItem('loopsoup_disclaimer_seen', '1')
    setShowDisclaimer(false)
  }, [])

  // Keyboard shortcuts (matches legacy uiController hotkeys)
  useEffect(() => {
    const VOLUME_STEP = 4

    const handleKey = (e: KeyboardEvent) => {
      // Don't handle shortcuts when a modal is open (modals handle their own keys)
      if (showDisclaimer || showShortcuts) return

      if (e.code === 'Space') {
        e.preventDefault()
        handleToggleRec()
      } else if (e.code === 'Enter') {
        e.preventDefault()
        undoLastTrack()
      } else if (e.code === 'Delete') {
        handleDelete()
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcuts(true)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        const state = useLooperStore.getState()
        const newVol = Math.min(100, state.masterVolume + VOLUME_STEP)
        state.setMasterVolume(newVol)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        const state = useLooperStore.getState()
        const newVol = Math.max(0, state.masterVolume - VOLUME_STEP)
        state.setMasterVolume(newVol)
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        const state = useLooperStore.getState()
        const newTrack = Math.max(-1, state.selectedTrack - 1)
        state.selectTrack(newTrack)
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        const state = useLooperStore.getState()
        const maxTrack = state.tracks.length - 1
        const newTrack = Math.min(maxTrack, state.selectedTrack + 1)
        state.selectTrack(newTrack)
      } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        e.preventDefault()
        const state = useLooperStore.getState()
        if (state.selectedTrack === -1) {
          state.toggleMasterMute()
        } else {
          state.toggleTrackMute(state.selectedTrack)
        }
      } else if (e.shiftKey && e.key === 'C') {
        e.preventDefault()
        useLooperStore.getState().toggleCalibrationMode()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleToggleRec, handleDelete, undoLastTrack, showDisclaimer, showShortcuts])

  // Amplitude getter for Visualizer
  const getAmplitude = useCallback(() => {
    return engineRef.current.getInputAmplitude()
  }, [])

  return (
    <>
      <img className="loopsoup-logo" alt="loopsoup logo" src="/logo.png" />

      <div className="visu" onClick={handleToggleRec}>
        <Visualizer getAmplitude={getAmplitude} />
      </div>

      <Controls
        onDownload={handleDownload}
        onDelete={handleDelete}
      />

      {showDisclaimer && <DisclaimerModal onClose={handleCloseDisclaimer} />}
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </>
  )
}

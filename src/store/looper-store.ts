import { create } from 'zustand'

const TRACK_COLORS = ['#6AB26D', '#4D9CB6', '#E95013', '#A600EB', '#FF002D']

export interface Track {
  id: string
  buffer: Float32Array
  bufferR: Float32Array
  volume: number
  muted: boolean
  offset: number
  startTime: number
}

interface LooperState {
  // State
  tracks: Track[]
  isRecording: boolean
  masterVolume: number
  masterMuted: boolean
  selectedTrack: number // -1 = all
  latencyMs: number
  calibrationMode: boolean
  recordStartTime: number

  // Actions
  addTrack: (track: Track) => void
  removeTrack: (index: number) => void
  removeAllTracks: () => void
  undoLastTrack: () => void
  setRecording: (recording: boolean) => void
  selectTrack: (index: number) => void
  setMasterVolume: (volume: number) => void
  setTrackVolume: (index: number, volume: number) => void
  toggleMasterMute: () => void
  toggleTrackMute: (index: number) => void
  setLatency: (ms: number) => void
  toggleCalibrationMode: () => void
  setRecordStartTime: (time: number) => void
  setTrackOffset: (index: number, offset: number) => void
  getTrackColor: (index: number) => string
}

export const useLooperStore = create<LooperState>()((set) => ({
  tracks: [],
  isRecording: false,
  masterVolume: 100,
  masterMuted: false,
  selectedTrack: -1,
  latencyMs: 60,
  calibrationMode: false,
  recordStartTime: 0,

  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),

  removeTrack: (index) =>
    set((state) => ({ tracks: state.tracks.filter((_, i) => i !== index) })),

  removeAllTracks: () => set({ tracks: [] }),

  undoLastTrack: () =>
    set((state) => {
      if (state.tracks.length === 0) return state
      return { tracks: state.tracks.slice(0, -1) }
    }),

  setRecording: (recording) => set({ isRecording: recording }),

  selectTrack: (index) => set({ selectedTrack: index }),

  setMasterVolume: (volume) => set({ masterVolume: volume }),

  setTrackVolume: (index, volume) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) => (i === index ? { ...t, volume } : t)),
    })),

  toggleMasterMute: () => set((state) => ({ masterMuted: !state.masterMuted })),

  toggleTrackMute: (index) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) =>
        i === index ? { ...t, muted: !t.muted } : t
      ),
    })),

  setLatency: (ms) => set({ latencyMs: ms }),

  toggleCalibrationMode: () =>
    set((state) => ({ calibrationMode: !state.calibrationMode })),

  setRecordStartTime: (time) => set({ recordStartTime: time }),

  setTrackOffset: (index, offset) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) => (i === index ? { ...t, offset } : t)),
    })),

  getTrackColor: (index) => TRACK_COLORS[index % TRACK_COLORS.length],
}))

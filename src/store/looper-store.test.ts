import { describe, it, expect, beforeEach } from 'vitest'
import { useLooperStore, type Track } from './looper-store'

describe('looper store', () => {
  beforeEach(() => {
    useLooperStore.setState(useLooperStore.getInitialState())
  })

  describe('initial state', () => {
    it('starts with no tracks', () => {
      expect(useLooperStore.getState().tracks).toEqual([])
    })

    it('starts not recording', () => {
      expect(useLooperStore.getState().isRecording).toBe(false)
    })

    it('starts with master volume at 100', () => {
      expect(useLooperStore.getState().masterVolume).toBe(100)
    })

    it('starts with master not muted', () => {
      expect(useLooperStore.getState().masterMuted).toBe(false)
    })

    it('starts with selectedTrack at -1 (all)', () => {
      expect(useLooperStore.getState().selectedTrack).toBe(-1)
    })

    it('starts with latency at 60ms', () => {
      expect(useLooperStore.getState().latencyMs).toBe(60)
    })

    it('starts with calibration mode off', () => {
      expect(useLooperStore.getState().calibrationMode).toBe(false)
    })
  })

  describe('addTrack', () => {
    it('adds a track', () => {
      const { addTrack } = useLooperStore.getState()
      const track: Track = {
        id: 'test-1',
        buffer: new Float32Array(100),
        bufferR: new Float32Array(100),
        volume: 100,
        muted: false,
        offset: 0,
        startTime: Date.now(),
      }
      addTrack(track)
      expect(useLooperStore.getState().tracks).toHaveLength(1)
      expect(useLooperStore.getState().tracks[0].id).toBe('test-1')
    })

    it('adds multiple tracks', () => {
      const { addTrack } = useLooperStore.getState()
      for (let i = 0; i < 3; i++) {
        addTrack({
          id: `track-${i}`,
          buffer: new Float32Array(100),
          bufferR: new Float32Array(100),
          volume: 100,
          muted: false,
          offset: 0,
          startTime: Date.now(),
        })
      }
      expect(useLooperStore.getState().tracks).toHaveLength(3)
    })
  })

  describe('removeTrack', () => {
    it('removes track by index', () => {
      const { addTrack, removeTrack } = useLooperStore.getState()
      addTrack({ id: 'a', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      addTrack({ id: 'b', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      removeTrack(0)
      expect(useLooperStore.getState().tracks).toHaveLength(1)
      expect(useLooperStore.getState().tracks[0].id).toBe('b')
    })
  })

  describe('removeAllTracks', () => {
    it('clears all tracks', () => {
      const { addTrack, removeAllTracks } = useLooperStore.getState()
      addTrack({ id: 'a', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      addTrack({ id: 'b', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      removeAllTracks()
      expect(useLooperStore.getState().tracks).toEqual([])
    })
  })

  describe('undoLastTrack', () => {
    it('removes the last track', () => {
      const { addTrack, undoLastTrack } = useLooperStore.getState()
      addTrack({ id: 'a', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      addTrack({ id: 'b', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      undoLastTrack()
      expect(useLooperStore.getState().tracks).toHaveLength(1)
      expect(useLooperStore.getState().tracks[0].id).toBe('a')
    })

    it('does nothing when no tracks', () => {
      useLooperStore.getState().undoLastTrack()
      expect(useLooperStore.getState().tracks).toEqual([])
    })
  })

  describe('recording state', () => {
    it('setRecording toggles recording state', () => {
      useLooperStore.getState().setRecording(true)
      expect(useLooperStore.getState().isRecording).toBe(true)
      useLooperStore.getState().setRecording(false)
      expect(useLooperStore.getState().isRecording).toBe(false)
    })
  })

  describe('selectedTrack', () => {
    it('selectTrack sets the selected track', () => {
      useLooperStore.getState().selectTrack(2)
      expect(useLooperStore.getState().selectedTrack).toBe(2)
    })

    it('selectTrack(-1) selects all', () => {
      useLooperStore.getState().selectTrack(2)
      useLooperStore.getState().selectTrack(-1)
      expect(useLooperStore.getState().selectedTrack).toBe(-1)
    })
  })

  describe('volume', () => {
    it('setMasterVolume updates master volume', () => {
      useLooperStore.getState().setMasterVolume(75)
      expect(useLooperStore.getState().masterVolume).toBe(75)
    })

    it('setTrackVolume updates specific track volume', () => {
      useLooperStore.getState().addTrack({ id: 'a', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      useLooperStore.getState().setTrackVolume(0, 50)
      expect(useLooperStore.getState().tracks[0].volume).toBe(50)
    })
  })

  describe('mute', () => {
    it('toggleMasterMute toggles master mute', () => {
      useLooperStore.getState().toggleMasterMute()
      expect(useLooperStore.getState().masterMuted).toBe(true)
      useLooperStore.getState().toggleMasterMute()
      expect(useLooperStore.getState().masterMuted).toBe(false)
    })

    it('toggleTrackMute toggles track mute', () => {
      useLooperStore.getState().addTrack({ id: 'a', buffer: new Float32Array(10), bufferR: new Float32Array(10), volume: 100, muted: false, offset: 0, startTime: 0 })
      useLooperStore.getState().toggleTrackMute(0)
      expect(useLooperStore.getState().tracks[0].muted).toBe(true)
      useLooperStore.getState().toggleTrackMute(0)
      expect(useLooperStore.getState().tracks[0].muted).toBe(false)
    })
  })

  describe('latency', () => {
    it('setLatency updates latency', () => {
      useLooperStore.getState().setLatency(120)
      expect(useLooperStore.getState().latencyMs).toBe(120)
    })
  })

  describe('calibration', () => {
    it('toggleCalibrationMode toggles mode', () => {
      useLooperStore.getState().toggleCalibrationMode()
      expect(useLooperStore.getState().calibrationMode).toBe(true)
      useLooperStore.getState().toggleCalibrationMode()
      expect(useLooperStore.getState().calibrationMode).toBe(false)
    })
  })

  describe('track colors', () => {
    it('getTrackColor returns correct color for each track', () => {
      const { getTrackColor } = useLooperStore.getState()
      const colors = [0, 1, 2, 3, 4].map(i => getTrackColor(i))
      expect(new Set(colors).size).toBe(5) // 5 unique colors
    })

    it('getTrackColor cycles after 5 tracks', () => {
      const { getTrackColor } = useLooperStore.getState()
      expect(getTrackColor(0)).toBe(getTrackColor(5))
      expect(getTrackColor(1)).toBe(getTrackColor(6))
    })
  })
})

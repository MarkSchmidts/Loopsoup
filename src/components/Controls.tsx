import { useLooperStore } from '../store/looper-store'

export function Controls() {
  const tracks = useLooperStore((s) => s.tracks)
  const selectedTrack = useLooperStore((s) => s.selectedTrack)
  const masterVolume = useLooperStore((s) => s.masterVolume)
  const masterMuted = useLooperStore((s) => s.masterMuted)
  const selectTrack = useLooperStore((s) => s.selectTrack)
  const setMasterVolume = useLooperStore((s) => s.setMasterVolume)
  const setTrackVolume = useLooperStore((s) => s.setTrackVolume)
  const toggleMasterMute = useLooperStore((s) => s.toggleMasterMute)
  const toggleTrackMute = useLooperStore((s) => s.toggleTrackMute)
  const getTrackColor = useLooperStore((s) => s.getTrackColor)

  const isAllSelected = selectedTrack === -1
  const currentVolume = isAllSelected
    ? masterVolume
    : (tracks[selectedTrack]?.volume ?? 100)

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (isAllSelected) {
      setMasterVolume(val)
    } else {
      setTrackVolume(selectedTrack, val)
    }
  }

  const handleMute = () => {
    if (isAllSelected) {
      toggleMasterMute()
    } else {
      toggleTrackMute(selectedTrack)
    }
  }

  const isMuted = isAllSelected
    ? masterMuted
    : (tracks[selectedTrack]?.muted ?? false)

  const activeColor = isAllSelected ? '#FFFFFF' : getTrackColor(selectedTrack)

  return (
    <div className="controls" style={{ '--active-color': activeColor } as React.CSSProperties}>
      <select
        value={selectedTrack}
        onChange={(e) => selectTrack(Number(e.target.value))}
        className="track-selector"
      >
        <option value={-1}>ALL</option>
        {tracks.map((_, i) => (
          <option key={i} value={i} style={{ backgroundColor: getTrackColor(i) }}>
            {i + 1}
          </option>
        ))}
      </select>

      <button aria-label="Download" className="icon-btn" title="Download">
        ⬇
      </button>

      <button aria-label="Delete" className="icon-btn" title="Delete">
        🗑
      </button>

      <button
        aria-label="Toggle mute"
        className="icon-btn"
        onClick={handleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      <input
        type="range"
        min={0}
        max={100}
        value={currentVolume}
        onChange={handleVolumeChange}
        className="volume-slider"
      />
    </div>
  )
}

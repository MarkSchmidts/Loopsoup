import { useLooperStore } from '../store/looper-store'

const TRACK_COLORS = ['#6AB26D', '#4D9CB6', '#E95013', '#A600EB', '#FF002D']

function getGlowStyle(trackIndex: number): React.CSSProperties {
  const color = trackIndex === -1 ? '#fff' : TRACK_COLORS[trackIndex % TRACK_COLORS.length]
  return {
    textShadow: `${color} 0px 0px 19px`,
  }
}

function getSelectGlowStyle(trackIndex: number): React.CSSProperties {
  const color = trackIndex === -1 ? '#fff' : TRACK_COLORS[trackIndex % TRACK_COLORS.length]
  return {
    boxShadow: `${color} 0px 0px 19px`,
  }
}

interface ControlsProps {
  onDownload: () => void
  onDelete: () => void
}

export function Controls({ onDownload, onDelete }: ControlsProps) {
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

  const isMuted = isAllSelected
    ? masterMuted
    : (tracks[selectedTrack]?.muted ?? false)

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

  return (
    <div className="controls">
      <select
        value={selectedTrack}
        onChange={(e) => selectTrack(Number(e.target.value))}
        style={getSelectGlowStyle(selectedTrack)}
      >
        <option value={-1}>ALL</option>
        {tracks.map((_, i) => (
          <option key={i} value={i} style={{ backgroundColor: getTrackColor(i) }}>
            {i + 1}
          </option>
        ))}
      </select>

      <button
        aria-label="Download"
        className="icon-btn"
        title="Download"
        onClick={onDownload}
        style={getGlowStyle(selectedTrack)}
      >
        ⬇
      </button>

      <button
        aria-label="Delete"
        className="icon-btn"
        title="Delete"
        onClick={onDelete}
        style={getGlowStyle(selectedTrack)}
      >
        🗑
      </button>

      <button
        aria-label="Toggle mute"
        className="icon-btn"
        onClick={handleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        style={{ ...getGlowStyle(selectedTrack), width: '50px' }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      <div className="volume-slider-wrap" style={getSelectGlowStyle(selectedTrack)}>
        <input
          type="range"
          min={0}
          max={100}
          value={currentVolume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>
    </div>
  )
}

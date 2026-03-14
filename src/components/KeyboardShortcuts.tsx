import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'Space', description: 'Toggle recording (start/stop)' },
  { key: 'Enter', description: 'Undo last track' },
  { key: 'Delete', description: 'Delete selected track(s)' },
  { key: '\u2192', description: 'Increase volume' },
  { key: '\u2190', description: 'Decrease volume' },
  { key: '\u2191', description: 'Select previous track' },
  { key: '\u2193', description: 'Select next track' },
  { key: 'Ctrl', description: 'Toggle mute on selected track' },
  { key: 'Shift+C', description: 'Toggle calibration mode' },
  { key: '?', description: 'Show keyboard shortcuts' },
]

export function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shortcuts-content" onClick={(e) => e.stopPropagation()}>
        <h3>Keyboard Shortcuts</h3>
        <table className="shortcuts-table">
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.key}>
                <td><kbd>{s.key}</kbd></td>
                <td>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-footer">
          <button className="modal-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}

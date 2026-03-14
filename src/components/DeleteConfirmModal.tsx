import { useEffect, useState } from 'react'

interface DeleteConfirmModalProps {
  onConfirm: (dontShowAgain: boolean) => void
  onCancel: () => void
}

export function DeleteConfirmModal({ onConfirm, onCancel }: DeleteConfirmModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm(dontShowAgain)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onConfirm, onCancel, dontShowAgain])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Delete all tracks?</h3>
        <p>This will remove all recorded tracks. This cannot be undone.</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don't show this again
        </label>
        <div className="modal-footer">
          <button className="modal-btn" onClick={onCancel}>Cancel</button>
          <button className="modal-btn modal-btn-danger" onClick={() => onConfirm(dontShowAgain)}>Delete All</button>
        </div>
      </div>
    </div>
  )
}

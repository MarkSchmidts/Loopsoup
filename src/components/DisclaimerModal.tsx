import { useEffect } from 'react'

interface DisclaimerModalProps {
  onClose: () => void
}

export function DisclaimerModal({ onClose }: DisclaimerModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Let me explain.</h3>
        <p>This is a simple looper.</p>
        <ul>
          <li>Press the big red button to Record and Stop recording.</li>
          <li>The control bar down left is made to take control of the volume and total mix of the played loops.</li>
          <li>
            Use your keyboard to control the looper, too. F.e. the space-key can be used to toggle
            recording. The complete keyboard layout can be viewed by pressing the <strong>?</strong> key
            on your keyboard.
          </li>
          <li>
            We're still under construction, this project will take its time to fulfill all our/your
            needs and will also grow with the technical possibilities given by modern browsers.
          </li>
          <li>
            For more information, contact and contribution please visit{' '}
            <a href="https://loopsoup.org" target="_blank" rel="noopener noreferrer">
              Loopsoup.org
            </a>
          </li>
        </ul>
        <div className="modal-footer">
          <button className="modal-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}

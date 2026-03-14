import { useRef, useEffect, useCallback } from 'react'
import { useLooperStore } from '../store/looper-store'

const TRACK_COLORS = ['#6AB26D', '#4D9CB6', '#E95013', '#A600EB', '#FF002D']

interface VisualizerProps {
  getAmplitude?: () => number
}

export function Visualizer({ getAmplitude }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  const tracks = useLooperStore((s) => s.tracks)
  const isRecording = useLooperStore((s) => s.isRecording)
  const recordStartTime = useLooperStore((s) => s.recordStartTime)
  const selectedTrack = useLooperStore((s) => s.selectedTrack)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const cx = w / 2
    const cy = h / 2
    const innerRadius = Math.min(w, h) / 8

    // Clear
    ctx.clearRect(0, 0, w, h)

    // Draw track rings
    tracks.forEach((track, i) => {
      const radius = innerRadius + 30 + 40 * i
      const color = TRACK_COLORS[i % TRACK_COLORS.length]
      const isSelected = selectedTrack === i

      // Selection ring
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.strokeStyle = 'cornsilk'
        ctx.lineWidth = 40
        ctx.stroke()
      }

      // Waveform ring
      ctx.beginPath()
      const samples = track.buffer
      const step = Math.max(1, Math.floor(samples.length / 900))

      // Normalize
      let maxVal = 0
      for (let j = 0; j < samples.length; j += step) {
        if (Math.abs(samples[j]) > maxVal) maxVal = Math.abs(samples[j])
      }
      const normalizer = maxVal > 0 ? 1.9 / maxVal : 1

      for (let j = 0; j < samples.length; j += step) {
        const angle = (j / samples.length) * Math.PI * 2 - Math.PI / 2
        const val = samples[j] * normalizer * 13 + radius
        const x = cx + val * Math.cos(angle)
        const y = cy + val * Math.sin(angle)

        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = track.muted ? '#888' : color
      ctx.lineWidth = 2
      ctx.shadowColor = color
      ctx.shadowBlur = 3
      ctx.stroke()
      ctx.shadowBlur = 0
    })

    // Draw REC button - pulse with amplitude when recording (matches legacy recButton.update)
    let scale = 1
    if (isRecording && getAmplitude) {
      const amp = getAmplitude()
      scale = 0.4 + amp / 1.8
      scale = Math.min(scale, 1)
      scale = Math.max(scale, 0.4)
    }

    const recRadius = (innerRadius - 10) * scale
    ctx.beginPath()
    ctx.arc(cx, cy, recRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'darkred'
    ctx.shadowColor = 'black'
    ctx.shadowBlur = 3
    ctx.fill()
    ctx.shadowBlur = 0

    // REC/STOP text
    const fontSize = Math.floor(recRadius / 2)
    ctx.fillStyle = 'white'
    ctx.font = `500 ${fontSize}px Verdana`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'black'
    ctx.shadowBlur = 3
    ctx.fillText(isRecording ? 'STOP' : 'REC', cx, cy)
    ctx.shadowBlur = 0

    // Loop progress marker
    if (tracks.length > 0) {
      const firstTrack = tracks[0]
      const duration = firstTrack.buffer.length / 44100 * 1000 // ms
      if (duration > 0) {
        const elapsed = Date.now() - recordStartTime
        const progress = (elapsed / duration) % 1
        const angle = progress * Math.PI * 2 - Math.PI / 2
        const outerRadius = innerRadius + 30 + 40 * (tracks.length - 1) + 20
        const mx = cx + outerRadius * Math.cos(angle)
        const my = cy + outerRadius * Math.sin(angle)

        ctx.beginPath()
        ctx.arc(mx, my, 5, 0, Math.PI * 2)
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 3
        ctx.stroke()
      }
    }

    animRef.current = requestAnimationFrame(draw)
  }, [tracks, isRecording, recordStartTime, selectedTrack, getAmplitude])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener('resize', resize)
    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      data-testid="visualizer-canvas"
      className="visualizer"
    />
  )
}

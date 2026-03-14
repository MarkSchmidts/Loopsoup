## loopsoup ~ Webrecording for me and you

### Preamble
We wanna make the web rock. Therefor I started writing a Looper running on web technologies such as Web Audio API, React, Zustand & TypeScript.
It's still far from perfect, since the latency of incoming audio-streams is making problems which affect exact timing.

The aim is to have a looper application ready to run on all platforms. May it be with your cell on the stage or your Mac jamming away with your friends in the studio. Loopsoup gives you an easy interface to build loops and create sounds on the fly.

Plug your guitar or get your mic ready and try it: [loopsoup.org/try](https://loopsoup.org/try)

This is an open source initiative. Let's work together and make this work real tight.

### Getting started
Install dependencies:
```
npm i
```

Start the dev server:
```
npm run dev
```

Build for production:
```
npm run build
```

Run tests:
```
npm test
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle recording (short press) / Undo tracks (hold 2s+) / Delete all (hold 10s) |
| Enter | Undo last track |
| Delete / Backspace | Delete selected track, or all tracks if ALL is selected |
| Arrow Up / Down | Select previous / next track |
| Arrow Left / Right | Decrease / increase volume of selected track (or master) |
| M | Toggle mute on selected track (or master) |
| ? | Show keyboard shortcuts |
| Shift+C | Toggle calibration mode |

### Features
- **Multi-track looping** — Record and overdub loops with automatic sync to the first track's length
- **Per-track controls** — Individual volume and mute for each track via the control bar or keyboard
- **Visual feedback** — Circular waveform display with loop position indicator, track selection rings, and recording amplitude pulse
- **Track interaction** — Click track rings to select, click the center button to record/stop
- **Download** — Export individual tracks or the full mix as WAV files
- **Latency calibration** — Adjustable latency compensation (Shift+C)

### Details on the file structure
* `src/` contains the React application source code
* `src/audio/audio-engine.ts` manages the Web Audio API context, recording, and playback with per-track gain nodes
* `src/store/looper-store.ts` is the Zustand state store for tracks, volume, mute, and UI state
* `src/components/` contains React components: Visualizer (canvas rendering), Controls (bottom bar), and modal dialogs
* `src/utils/audio-utils.ts` provides audio buffer utilities and WAV export

/**
 * Tests for app/js/Services/audioCoreService.js
 *
 * Tests the audioCoreService factory - the core audio engine managing
 * recording, playback, tracks, volume, muting, and latency compensation.
 */

const loadScript = require('../loadScript');
loadScript('app/js/patches/helpers.js');
loadScript('app/js/patches/webAudioPatch.js');

// Web Audio API mocks
class MockAudioParam {
  constructor(v = 1) { this.value = v; this.defaultValue = v; this.muted = false; this.valueSaved = null; }
}
class MockGainNode {
  constructor() { this.gain = new MockAudioParam(1); this._connections = []; }
  connect(d) { this._connections.push(d); return d; }
  disconnect() { this._connections = []; }
}
class MockAudioBufferSourceNode {
  constructor() { this.buffer = null; this.loop = false; this._connections = []; }
  connect(d) { this._connections.push(d); return d; }
  start() {}
  stop() {}
}
class MockAnalyserNode {
  constructor() { this.frequencyBinCount = 1024; this._connections = []; this.context = null; }
  connect(d) { this._connections.push(d); return d; }
  getByteFrequencyData(a) { for (let i = 0; i < a.length; i++) a[i] = 128; }
}
class MockAudioBuffer {
  constructor(ch, len, sr) {
    this.numberOfChannels = ch; this.length = len; this.sampleRate = sr;
    this.duration = len / sr; this._channels = [];
    for (let i = 0; i < ch; i++) this._channels.push(new Float32Array(len));
  }
  getChannelData(c) { return this._channels[c]; }
}
class MockAudioContext {
  constructor() {
    this.sampleRate = 44100; this.currentTime = 0;
    this.destination = { _mock: true }; this.state = 'running';
  }
  createGain() { return new MockGainNode(); }
  createGainOrig() { return new MockGainNode(); }
  createBufferSource() { return new MockAudioBufferSourceNode(); }
  createAnalyser() { const a = new MockAnalyserNode(); a.context = this; return a; }
  createMediaStreamSource() { return { connect: jest.fn(d => d), _connections: [] }; }
  createBuffer(ch, len, sr) { return new MockAudioBuffer(ch, len, sr); }
  createScriptProcessor() { return { connect: jest.fn(), onaudioprocess: null }; }
}

// Set global AudioContext BEFORE loading the service
global.AudioContext = MockAudioContext;
global.window.AudioContext = MockAudioContext;

// Mock navigator
global.navigator.getUserMedia = jest.fn((c, success) => success({ id: 'mock-stream' }));
global.navigator.mediaDevices = { getUserMedia: jest.fn((c, s) => s && s({ id: 'stream' })) };
global.navigator.webkitGetUserMedia = null;
global.navigator.mozGetUserMedia = null;

// Mock Recorder
global.Recorder = jest.fn(function() {
  this.record = jest.fn();
  this.stop = jest.fn(cb => cb && cb());
  this.getBuffer = jest.fn(cb => cb([new Float32Array(4410).fill(0.5), new Float32Array(4410).fill(0.3)]));
  this.clear = jest.fn();
});

// AngularJS mock
const mockRootScope = { $broadcast: jest.fn(), $on: jest.fn() };
const mockQ = {
  defer: () => {
    let _resolve, _reject;
    const promise = new Promise((r, j) => { _resolve = r; _reject = j; });
    return { promise, resolve: (...args) => _resolve && _resolve(...args), reject: (...args) => _reject && _reject(...args) };
  },
};
const mockStorage = { latency: 60 };
const mockAlertService = { addAlert: jest.fn() };
const mockStateService = { on: jest.fn() };

const factories = {};
const angularModuleMock = {
  factory: jest.fn(function(name, deps) {
    factories[name] = { deps: deps.slice(0, -1), fn: deps[deps.length - 1] };
    return this;
  }),
  controller: jest.fn(function() { return this; }),
  run: jest.fn(function() { return this; }),
};
global.angular = { module: jest.fn(() => angularModuleMock), isArray: Array.isArray };
global.loopsoup = angularModuleMock;

require('../../app/js/Services/audioCoreService');

describe('audioCoreService', () => {
  let audioCore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.latency = 60;
    mockStateService.on = jest.fn();
    audioCore = factories['audioCoreService'].fn(mockStorage, mockAlertService, mockRootScope, mockQ, mockStateService);
  });

  describe('init', () => {
    test('initializes and gets mic access', () => {
      audioCore.init();
      expect(audioCore.readyForRecord()).toBe(true);
    });

    test('returns mic access promise', () => {
      audioCore.init();
      expect(audioCore.getMicAccessPromise()).toBeDefined();
    });
  });

  describe('isRecording', () => {
    test('is false initially', () => {
      expect(audioCore.isRecording()).toBe(false);
    });
  });

  describe('getTracks', () => {
    test('returns empty array initially', () => {
      expect(audioCore.getTracks()).toEqual([]);
    });
  });

  describe('toggleRec', () => {
    test('starts recording', () => {
      audioCore.init();
      audioCore.toggleRec();
      expect(audioCore.isRecording()).toBe(true);
    });

    test('broadcasts tracks:startRec', () => {
      audioCore.init();
      audioCore.toggleRec();
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('tracks:startRec');
    });
  });

  describe('getRecordStartTime', () => {
    test('returns -1 with no tracks', () => {
      audioCore.init();
      expect(audioCore.getRecordStartTime()).toBe(-1);
    });
  });

  describe('getTrackDuration', () => {
    test('returns -1 with no tracks', () => {
      expect(audioCore.getTrackDuration()).toBe(-1);
    });
  });

  describe('latency calibration mode', () => {
    test('toggles on and off', () => {
      expect(audioCore.toggleLatencyCalibrateModeEnabled()).toBe(true);
      expect(audioCore.isLatencyCaibrateModeEnabled()).toBe(true);
      expect(audioCore.toggleLatencyCalibrateModeEnabled()).toBe(false);
    });
  });

  describe('volume control (with init)', () => {
    test('get/set master volume', () => {
      audioCore.init();
      audioCore.setVolume(50, -1);
      expect(audioCore.getVolume(-1)).toBe(50);
    });

    test('set volume to 100', () => {
      audioCore.init();
      audioCore.setVolume(100, -1);
      expect(audioCore.getVolume(-1)).toBe(100);
    });
  });

  describe('mute control (with init)', () => {
    test('isMuted false by default', () => {
      expect(audioCore.isMuted(-1)).toBe(false);
    });

    test('toggle master mute', () => {
      audioCore.init();
      audioCore.toggleMute(-1);
      expect(audioCore.isMuted(-1)).toBe(true);
      audioCore.toggleMute(-1);
      expect(audioCore.isMuted(-1)).toBe(false);
    });
  });

  describe('addTrack', () => {
    test('adds a track', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410).fill(0.5), new Float32Array(4410).fill(0.3)]);
      expect(audioCore.getTracks().length).toBe(1);
    });

    test('track has source and gainNode', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410).fill(0.5), new Float32Array(4410).fill(0.3)]);
      const t = audioCore.getTracks()[0];
      expect(t).toHaveProperty('source');
      expect(t).toHaveProperty('gainNode');
    });

    test('broadcasts tracks:update', () => {
      audioCore.init();
      mockRootScope.$broadcast.mockClear();
      audioCore.addTrack([new Float32Array(4410).fill(0.5), new Float32Array(4410).fill(0.3)]);
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('tracks:update');
    });

    test('second track matches first track length', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410).fill(0.5), new Float32Array(4410).fill(0.3)]);
      audioCore.addTrack([new Float32Array(2205).fill(0.1), new Float32Array(2205).fill(0.1)]);
      const tracks = audioCore.getTracks();
      expect(tracks[1].source.buffer.length).toBe(tracks[0].source.buffer.length);
    });
  });

  describe('delRec', () => {
    test('deletes a specific track', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410), new Float32Array(4410)]);
      audioCore.addTrack([new Float32Array(4410), new Float32Array(4410)]);
      audioCore.delRec(0);
      expect(audioCore.getTracks().length).toBe(1);
    });

    test('deletes all tracks', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410), new Float32Array(4410)]);
      audioCore.addTrack([new Float32Array(4410), new Float32Array(4410)]);
      audioCore.delRec(-1);
      expect(audioCore.getTracks().length).toBe(0);
    });
  });

  describe('undoRec', () => {
    test('removes last track', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410), new Float32Array(4410)]);
      audioCore.addTrack([new Float32Array(4410), new Float32Array(4410)]);
      audioCore.undoRec();
      expect(audioCore.getTracks().length).toBe(1);
    });
  });

  describe('getBuffer', () => {
    test('returns undefined for non-existent track', () => {
      expect(audioCore.getBuffer(99)).toBeUndefined();
    });

    test('returns buffer for existing track', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(4410).fill(0.5), new Float32Array(4410).fill(0.3)]);
      const buf = audioCore.getBuffer(0, 0);
      expect(buf).toBeDefined();
      expect(buf.length).toBeGreaterThan(0);
    });
  });

  describe('getOutputGain', () => {
    test('returns gain node after init', () => {
      audioCore.init();
      expect(audioCore.getOutputGain()).toBeDefined();
    });
  });

  describe('stateService integration', () => {
    test('registers toggleMute listener', () => {
      expect(mockStateService.on).toHaveBeenCalledWith(expect.any(String), 'toggleMute', expect.any(Function));
    });
  });
});

/**
 * E2E Tests for Loopsoup Audio Flows
 *
 * Tests the complete audio recording, playback, and management flows
 * end-to-end by wiring together all services with mocked Web Audio API.
 */

const loadScript = require('../loadScript');
loadScript('app/js/patches/helpers.js');
loadScript('app/js/patches/webAudioPatch.js');

// ─── Web Audio API Mocks ────────────────────────────────────────
class MockAudioParam {
  constructor(v = 1) { this.value = v; this.muted = false; this.valueSaved = null; }
}
class MockGainNode {
  constructor() { this.gain = new MockAudioParam(1); }
  connect(d) { return d; }
  disconnect() {}
}
class MockAudioBufferSourceNode {
  constructor() { this.buffer = null; this.loop = false; }
  connect(d) { return d; }
  start() {}
  stop() {}
}
class MockAnalyserNode {
  constructor() { this.frequencyBinCount = 1024; this.context = null; }
  connect(d) { return d; }
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
    this.destination = { _mock: true };
  }
  createGain() { return new MockGainNode(); }
  createGainOrig() { return new MockGainNode(); }
  createBufferSource() { return new MockAudioBufferSourceNode(); }
  createAnalyser() { const a = new MockAnalyserNode(); a.context = this; return a; }
  createMediaStreamSource() { return { connect: jest.fn(d => d) }; }
  createBuffer(ch, len, sr) { return new MockAudioBuffer(ch, len, sr); }
  createScriptProcessor() { return { connect: jest.fn(), onaudioprocess: null }; }
}

global.AudioContext = MockAudioContext;
global.window.AudioContext = MockAudioContext;
// The audioCoreService iterates getUserMedia implementations and picks the last truthy one.
// We need to make sure the last truthy one is our mock that calls the success callback.
const getUserMediaMock = jest.fn((c, success) => success({ id: 'stream' }));
global.navigator.getUserMedia = getUserMediaMock;
global.navigator.mediaDevices = { getUserMedia: getUserMediaMock };
global.navigator.webkitGetUserMedia = null;
global.navigator.mozGetUserMedia = null;
global.Recorder = jest.fn(function() {
  this.record = jest.fn();
  this.stop = jest.fn(cb => cb && cb());
  this.getBuffer = jest.fn(cb => cb([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]));
  this.clear = jest.fn();
});

// ─── AngularJS Mock ──────────────────────────────────────────────
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

const mockRootScope = { $broadcast: jest.fn(), $on: jest.fn() };
const mockQ = {
  defer: () => {
    let _resolve;
    const promise = new Promise(r => _resolve = r);
    return { promise, resolve: (...args) => _resolve && _resolve(...args) };
  },
};
const mockStorage = { latency: 60 };

require('../../app/js/Services/alertService');
require('../../app/js/Services/stateService');
require('../../app/js/Services/colorService');
require('../../app/js/Services/audioCoreService');
require('../../app/js/Services/ioService');

describe('E2E: Complete Audio Flow', () => {
  let alertService, stateService, colorService, audioCore, ioService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.latency = 60;

    alertService = factories['alertService'].fn(mockRootScope);
    stateService = factories['stateService'].fn(mockRootScope);
    colorService = factories['colorService'].fn();
    audioCore = factories['audioCoreService'].fn(mockStorage, alertService, mockRootScope, mockQ, stateService);
    ioService = factories['ioService'].fn(mockRootScope, audioCore);
  });

  describe('Flow: App Initialization', () => {
    test('initializes and gets mic access', () => {
      audioCore.init();
      expect(audioCore.readyForRecord()).toBe(true);
    });

    test('starts with no tracks and not recording', () => {
      audioCore.init();
      expect(audioCore.getTracks()).toEqual([]);
      expect(audioCore.isRecording()).toBe(false);
    });
  });

  describe('Flow: Record First Loop', () => {
    test('can toggle recording on', () => {
      audioCore.init();
      audioCore.toggleRec();
      expect(audioCore.isRecording()).toBe(true);
    });

    test('adds track via addTrack', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      expect(audioCore.getTracks().length).toBe(1);
    });

    test('track has correct buffer', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      const buffer = audioCore.getBuffer(0, 0);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Flow: Record Multiple Loops', () => {
    test('can add multiple tracks', () => {
      audioCore.init();
      const buf = () => [new Float32Array(44100).fill(Math.random()), new Float32Array(44100).fill(Math.random())];
      audioCore.addTrack(buf());
      audioCore.addTrack(buf());
      audioCore.addTrack(buf());
      expect(audioCore.getTracks().length).toBe(3);
    });

    test('subsequent tracks match first track length', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      audioCore.addTrack([new Float32Array(22050).fill(0.1), new Float32Array(22050).fill(0.1)]);
      const tracks = audioCore.getTracks();
      expect(tracks[1].source.buffer.length).toBe(tracks[0].source.buffer.length);
    });

    test('longer tracks are trimmed', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      audioCore.addTrack([new Float32Array(88200).fill(0.1), new Float32Array(88200).fill(0.1)]);
      const tracks = audioCore.getTracks();
      expect(tracks[1].source.buffer.length).toBe(tracks[0].source.buffer.length);
    });
  });

  describe('Flow: Track Management', () => {
    function addTracks(n) {
      audioCore.init();
      for (let i = 0; i < n; i++) {
        audioCore.addTrack([new Float32Array(44100).fill(0.1 * (i + 1)), new Float32Array(44100).fill(0.1 * (i + 1))]);
      }
    }

    test('undo removes last track', () => {
      addTracks(3);
      audioCore.undoRec();
      expect(audioCore.getTracks().length).toBe(2);
    });

    test('delete specific track', () => {
      addTracks(3);
      audioCore.delRec(1);
      expect(audioCore.getTracks().length).toBe(2);
    });

    test('delete all tracks', () => {
      addTracks(3);
      audioCore.delRec(-1);
      expect(audioCore.getTracks().length).toBe(0);
    });

    test('multiple undos clear all tracks', () => {
      addTracks(3);
      audioCore.undoRec();
      audioCore.undoRec();
      audioCore.undoRec();
      expect(audioCore.getTracks().length).toBe(0);
    });
  });

  describe('Flow: Volume Control', () => {
    test('master volume set and get', () => {
      audioCore.init();
      audioCore.setVolume(75, -1);
      expect(audioCore.getVolume(-1)).toBe(75);
    });

    test('master volume at 0', () => {
      audioCore.init();
      audioCore.setVolume(0, -1);
      expect(audioCore.getVolume(-1)).toBe(0);
    });

    test('master volume at 100', () => {
      audioCore.init();
      audioCore.setVolume(100, -1);
      expect(audioCore.getVolume(-1)).toBe(100);
    });

    test('individual track volume', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.5)]);
      audioCore.setVolume(50, 0);
      expect(audioCore.getVolume(0)).toBe(50);
    });
  });

  describe('Flow: Mute Control', () => {
    test('toggle master mute', () => {
      audioCore.init();
      expect(audioCore.isMuted(-1)).toBe(false);
      audioCore.toggleMute(-1);
      expect(audioCore.isMuted(-1)).toBe(true);
      audioCore.toggleMute(-1);
      expect(audioCore.isMuted(-1)).toBe(false);
    });

    test('toggle individual track mute', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.5)]);
      expect(audioCore.isMuted(0)).toBe(false);
      audioCore.toggleMute(0);
      expect(audioCore.isMuted(0)).toBe(true);
    });
  });

  describe('Flow: Latency Calibration', () => {
    test('toggle calibration mode', () => {
      expect(audioCore.isLatencyCaibrateModeEnabled()).toBe(false);
      audioCore.toggleLatencyCalibrateModeEnabled();
      expect(audioCore.isLatencyCaibrateModeEnabled()).toBe(true);
    });

    test('latency compensation during track creation', () => {
      audioCore.init();
      mockStorage.latency = 100;
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      expect(audioCore.getTracks().length).toBe(1);
    });
  });

  describe('Flow: Track Timing', () => {
    test('getRecordStartTime returns date for track', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      expect(audioCore.getRecordStartTime(0)).toBeGreaterThan(0);
    });

    test('getTrackDuration returns positive value', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      expect(audioCore.getTrackDuration()).toBeGreaterThan(0);
    });
  });

  describe('Flow: State Service Coordination', () => {
    test('selecting track updates state', () => {
      stateService.selectTrack('test', 2);
      expect(stateService.state.selected).toBe(2);
    });

    test('unselecting resets to -1', () => {
      stateService.selectTrack('test', 2);
      stateService.unselectTrack('test');
      expect(stateService.state.selected).toBe(-1);
    });
  });

  describe('Flow: Color Assignment', () => {
    test('5 unique colors for 5 tracks', () => {
      const colors = new Set();
      for (let i = 0; i < 5; i++) colors.add(colorService.getColor(i));
      expect(colors.size).toBe(5);
    });

    test('colors cycle after 5', () => {
      expect(colorService.getColor(0)).toBe(colorService.getColor(5));
    });
  });

  describe('Flow: Alert System', () => {
    test('alert broadcasts update', () => {
      mockRootScope.$broadcast.mockClear();
      alertService.addAlert('Error', 'danger');
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('alerts:update');
    });

    test('alerts accumulate and close', () => {
      alertService.addAlert('E1', 'danger');
      alertService.addAlert('E2', 'warning');
      expect(alertService.getAlerts().length).toBe(2);
      alertService.closeAlert(0);
      expect(alertService.getAlerts()[0].msg).toBe('E2');
    });
  });

  describe('Flow: WAV Export', () => {
    test('does not throw with tracks', () => {
      audioCore.init();
      audioCore.addTrack([new Float32Array(44100).fill(0.5), new Float32Array(44100).fill(0.3)]);
      global.URL = { createObjectURL: jest.fn(() => 'blob:url') };
      global.document.createElement = jest.fn(() => ({ href: '', download: '', dispatchEvent: jest.fn() }));
      global.document.createEvent = jest.fn(() => ({ initEvent: jest.fn() }));
      expect(() => ioService.getWav(0)).not.toThrow();
    });
  });

  describe('Flow: Full Session Lifecycle', () => {
    test('init -> record -> mute -> delete -> undo -> delete all', () => {
      audioCore.init();
      expect(audioCore.readyForRecord()).toBe(true);

      for (let i = 0; i < 3; i++) {
        audioCore.addTrack([new Float32Array(44100).fill(0.1 * (i + 1)), new Float32Array(44100).fill(0.1 * (i + 1))]);
      }
      expect(audioCore.getTracks().length).toBe(3);

      audioCore.toggleMute(1);
      expect(audioCore.isMuted(1)).toBe(true);

      audioCore.delRec(0);
      expect(audioCore.getTracks().length).toBe(2);

      audioCore.undoRec();
      expect(audioCore.getTracks().length).toBe(1);

      audioCore.delRec(-1);
      expect(audioCore.getTracks().length).toBe(0);
    });
  });
});

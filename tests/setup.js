// Global test setup - provides browser-like environment mocks

// Mock Web Audio API
class MockAudioParam {
  constructor(defaultValue = 1) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.muted = false;
    this.valueSaved = null;
  }
}

class MockGainNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this._connections = [];
  }
  connect(destination) {
    this._connections.push(destination);
    return destination;
  }
  disconnect() {
    this._connections = [];
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.loop = false;
    this._connections = [];
    this._started = false;
    this._stopped = false;
  }
  connect(destination) {
    this._connections.push(destination);
    return destination;
  }
  start(when, offset) {
    this._started = true;
    this._startWhen = when;
    this._startOffset = offset;
  }
  stop() {
    this._stopped = true;
  }
}

class MockAnalyserNode {
  constructor() {
    this.frequencyBinCount = 1024;
    this._connections = [];
    this.context = null;
  }
  connect(destination) {
    this._connections.push(destination);
    return destination;
  }
  getByteFrequencyData(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
}

class MockMediaStreamSource {
  constructor() {
    this._connections = [];
  }
  connect(destination) {
    this._connections.push(destination);
    return destination;
  }
}

class MockAudioBuffer {
  constructor(numChannels, length, sampleRate) {
    this.numberOfChannels = numChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channels = [];
    for (let i = 0; i < numChannels; i++) {
      this._channels.push(new Float32Array(length));
    }
  }
  getChannelData(channel) {
    return this._channels[channel];
  }
}

class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = { _isMockDestination: true };
    this.state = 'running';
  }
  createGain() {
    return new MockGainNode();
  }
  createGainOrig() {
    return new MockGainNode();
  }
  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }
  createAnalyser() {
    const analyser = new MockAnalyserNode();
    analyser.context = this;
    return analyser;
  }
  createMediaStreamSource() {
    return new MockMediaStreamSource();
  }
  createBuffer(numChannels, length, sampleRate) {
    return new MockAudioBuffer(numChannels, length, sampleRate);
  }
  createScriptProcessor(bufferSize, inputChannels, outputChannels) {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null,
    };
  }
}

// Export mocks for use in tests
global.MockAudioContext = MockAudioContext;
global.MockGainNode = MockGainNode;
global.MockAudioBufferSourceNode = MockAudioBufferSourceNode;
global.MockAnalyserNode = MockAnalyserNode;
global.MockAudioBuffer = MockAudioBuffer;
global.MockMediaStreamSource = MockMediaStreamSource;

// Mock navigator.getUserMedia
if (!global.navigator) {
  global.navigator = {};
}
global.navigator.getUserMedia = jest.fn();
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(),
};

// Mock window.AudioContext
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

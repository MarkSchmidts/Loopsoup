/**
 * Tests for app/js/ls.recorder/recorderWorker.js
 *
 * Tests the Web Worker that handles audio buffer recording, merging,
 * and fade application. Since Web Workers run in isolation, we simulate
 * the worker environment by evaluating the script.
 */

describe('recorderWorker', () => {
  let workerScope;

  beforeEach(() => {
    // Simulate worker scope
    workerScope = {
      onmessage: null,
      postMessage: jest.fn(),
    };

    // Read and evaluate worker script in our mock scope
    const fs = require('fs');
    const workerCode = fs.readFileSync(
      require('path').join(__dirname, '../../app/js/ls.recorder/recorderWorker.js'),
      'utf8'
    );

    // Replace 'this.onmessage' and 'this.postMessage' with our mock
    const wrappedCode = `
      (function(self) {
        var recLength = 0, recBuffers = [], sampleRate, numChannels, prevBuffer;
        ${workerCode.replace(/this\.onmessage/g, 'self.onmessage').replace(/this\.postMessage/g, 'self.postMessage')}
      })(workerScope);
    `;

    // Use eval to run in current scope (workerScope is available)
    eval(wrappedCode);
  });

  function sendMessage(data) {
    workerScope.onmessage({ data });
  }

  describe('init command', () => {
    test('initializes with sample rate and channels', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });
      // Should not throw and buffers should be initialized
      expect(workerScope.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('clear command', () => {
    test('clears recording buffers', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });
      sendMessage({ command: 'clear' });
      // After clear, getBuffer should return empty buffers
      sendMessage({ command: 'getBuffer' });
      expect(workerScope.postMessage).toHaveBeenCalledWith({
        command: 'gotBuffer',
        buffer: expect.any(Array),
      });
    });
  });

  describe('getBuffer command', () => {
    test('returns empty buffers when nothing recorded', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });
      sendMessage({ command: 'getBuffer' });
      expect(workerScope.postMessage).toHaveBeenCalledWith({
        command: 'gotBuffer',
        buffer: expect.any(Array),
      });
      const result = workerScope.postMessage.mock.calls[0][0];
      expect(result.buffer.length).toBe(2); // 2 channels
    });
  });

  describe('record command', () => {
    test('records buffer when in recording range', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });

      const bufferSize = 4096;
      const buffer = [
        new Float32Array(bufferSize).fill(0.5),
        new Float32Array(bufferSize).fill(0.3),
      ];

      // Record: current time is after start, stop is -1 (not set)
      sendMessage({
        command: 'record',
        buffer,
        sampleRate: 44100,
        time: {
          current: 1.1, // after start
          start: 1.0,
          stop: -1, // recording in progress
        },
      });

      // Get the buffer and verify it has data
      sendMessage({ command: 'getBuffer' });
      const result = workerScope.postMessage.mock.calls[0][0];
      expect(result.buffer[0].length).toBeGreaterThan(0);
    });

    test('handles last buffer (stop time reached)', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });

      const bufferSize = 4096;
      const buffer = [
        new Float32Array(bufferSize).fill(0.5),
        new Float32Array(bufferSize).fill(0.3),
      ];

      sendMessage({
        command: 'record',
        buffer,
        sampleRate: 44100,
        time: {
          current: 2.0,
          start: 1.0,
          stop: 2.0, // stop now
        },
      });

      // Should post bufferReady
      expect(workerScope.postMessage).toHaveBeenCalledWith({
        command: 'bufferReady',
      });
    });

    test('handles first buffer (start time reached)', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });

      const bufferSize = 4096;
      const buffer = [
        new Float32Array(bufferSize).fill(0.5),
        new Float32Array(bufferSize).fill(0.3),
      ];

      // First buffer: current time is very close to start time
      sendMessage({
        command: 'record',
        buffer,
        sampleRate: 44100,
        time: {
          current: 1.05, // just after start, within one buffer length
          start: 1.0,
          stop: -1,
        },
      });

      // Get the buffer
      sendMessage({ command: 'getBuffer' });
      const result = workerScope.postMessage.mock.calls[0][0];
      expect(result.buffer[0].length).toBeGreaterThan(0);
    });

    test('ignores buffers outside recording range', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 2 },
      });

      const bufferSize = 4096;
      const buffer = [
        new Float32Array(bufferSize).fill(0.5),
        new Float32Array(bufferSize).fill(0.3),
      ];

      // Before recording starts
      sendMessage({
        command: 'record',
        buffer,
        sampleRate: 44100,
        time: {
          current: 0.5,
          start: -1, // not started
          stop: -1,
        },
      });

      sendMessage({ command: 'getBuffer' });
      const result = workerScope.postMessage.mock.calls[0][0];
      // Should have empty buffers (just the initialized empty arrays)
      expect(result.buffer[0].length).toBe(0);
    });
  });

  describe('mergeBuffers (internal)', () => {
    test('correctly accumulates recording data', () => {
      sendMessage({
        command: 'init',
        config: { sampleRate: 44100, numChannels: 1 },
      });

      const bufferSize = 100;
      // Record two buffers in sequence
      sendMessage({
        command: 'record',
        buffer: [new Float32Array(bufferSize).fill(0.1)],
        sampleRate: 44100,
        time: { current: 1.1, start: 1.0, stop: -1 },
      });

      sendMessage({
        command: 'record',
        buffer: [new Float32Array(bufferSize).fill(0.2)],
        sampleRate: 44100,
        time: { current: 1.2, start: 1.0, stop: -1 },
      });

      sendMessage({ command: 'getBuffer' });
      const result = workerScope.postMessage.mock.calls[0][0];
      // Total length should be sum of both buffers
      expect(result.buffer[0].length).toBe(bufferSize * 2);
    });
  });
});

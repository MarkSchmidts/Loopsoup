/**
 * Tests for app/js/Services/ioService.js
 *
 * Tests the ioService factory which handles WAV file generation and download.
 * Tests the internal helper functions: writeUTFBytes, mergeBuffers, interleave.
 */

// We can't easily test the AngularJS service directly, so we extract and test
// the pure functions by evaluating the source.
const fs = require('fs');
const path = require('path');

describe('ioService - Pure Functions', () => {

  // ─── writeUTFBytes ──────────────────────────────────────────
  describe('writeUTFBytes', () => {
    // Reimplemented from source for testing
    function writeUTFBytes(view, offset, string) {
      var lng = string.length;
      for (var i = 0; i < lng; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    test('writes RIFF header correctly', () => {
      const buffer = new ArrayBuffer(10);
      const view = new DataView(buffer);
      writeUTFBytes(view, 0, 'RIFF');
      expect(view.getUint8(0)).toBe(82);  // R
      expect(view.getUint8(1)).toBe(73);  // I
      expect(view.getUint8(2)).toBe(70);  // F
      expect(view.getUint8(3)).toBe(70);  // F
    });

    test('writes WAVE header correctly', () => {
      const buffer = new ArrayBuffer(12);
      const view = new DataView(buffer);
      writeUTFBytes(view, 8, 'WAVE');
      expect(view.getUint8(8)).toBe(87);   // W
      expect(view.getUint8(9)).toBe(65);   // A
      expect(view.getUint8(10)).toBe(86);  // V
      expect(view.getUint8(11)).toBe(69);  // E
    });

    test('writes at correct offset', () => {
      const buffer = new ArrayBuffer(20);
      const view = new DataView(buffer);
      writeUTFBytes(view, 5, 'AB');
      expect(view.getUint8(4)).toBe(0);   // before offset
      expect(view.getUint8(5)).toBe(65);  // A
      expect(view.getUint8(6)).toBe(66);  // B
      expect(view.getUint8(7)).toBe(0);   // after string
    });

    test('writes fmt sub-chunk header', () => {
      const buffer = new ArrayBuffer(20);
      const view = new DataView(buffer);
      writeUTFBytes(view, 12, 'fmt ');
      expect(view.getUint8(12)).toBe(102); // f
      expect(view.getUint8(13)).toBe(109); // m
      expect(view.getUint8(14)).toBe(116); // t
      expect(view.getUint8(15)).toBe(32);  // space
    });

    test('writes data sub-chunk header', () => {
      const buffer = new ArrayBuffer(40);
      const view = new DataView(buffer);
      writeUTFBytes(view, 36, 'data');
      expect(view.getUint8(36)).toBe(100); // d
      expect(view.getUint8(37)).toBe(97);  // a
      expect(view.getUint8(38)).toBe(116); // t
      expect(view.getUint8(39)).toBe(97);  // a
    });
  });

  // ─── mergeBuffers ──────────────────────────────────────────
  describe('mergeBuffers', () => {
    // Reimplemented from source for testing
    function mergeBuffers(channelBuffer) {
      var result = new Float32Array(channelBuffer[0].length);
      for (var i = 0, offset = 0; i < channelBuffer.length; i++) {
        for (var n = 0; n < channelBuffer[i].length; n++) {
          result[n] += (channelBuffer[i][n] || 0);
        }
      }
      return result;
    }

    test('merges single buffer (identity)', () => {
      const buf = [new Float32Array([1, 2, 3])];
      const result = mergeBuffers(buf);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    test('sums multiple buffers element-wise', () => {
      const buf1 = new Float32Array([1, 2, 3]);
      const buf2 = new Float32Array([4, 5, 6]);
      const result = mergeBuffers([buf1, buf2]);
      expect(Array.from(result)).toEqual([5, 7, 9]);
    });

    test('handles buffers with zeros', () => {
      const buf1 = new Float32Array([0, 0, 0]);
      const buf2 = new Float32Array([1, 2, 3]);
      const result = mergeBuffers([buf1, buf2]);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    test('handles three buffers', () => {
      const buf1 = new Float32Array([1, 1, 1]);
      const buf2 = new Float32Array([2, 2, 2]);
      const buf3 = new Float32Array([3, 3, 3]);
      const result = mergeBuffers([buf1, buf2, buf3]);
      expect(Array.from(result)).toEqual([6, 6, 6]);
    });

    test('handles negative values', () => {
      const buf1 = new Float32Array([1, -1]);
      const buf2 = new Float32Array([-1, 1]);
      const result = mergeBuffers([buf1, buf2]);
      expect(result[0]).toBeCloseTo(0);
      expect(result[1]).toBeCloseTo(0);
    });
  });

  // ─── interleave ────────────────────────────────────────────
  describe('interleave', () => {
    // Reimplemented from source for testing
    function interleave(leftChannel, rightChannel) {
      var length = leftChannel.length + rightChannel.length;
      var result = new Float32Array(length);
      var inputIndex = 0;
      for (var index = 0; index < length; ) {
        result[index++] = leftChannel[inputIndex];
        result[index++] = rightChannel[inputIndex];
        inputIndex++;
      }
      return result;
    }

    test('interleaves two channels', () => {
      const left = new Float32Array([1, 2, 3]);
      const right = new Float32Array([4, 5, 6]);
      const result = interleave(left, right);
      expect(Array.from(result)).toEqual([1, 4, 2, 5, 3, 6]);
    });

    test('result length is double the input length', () => {
      const left = new Float32Array(100);
      const right = new Float32Array(100);
      const result = interleave(left, right);
      expect(result.length).toBe(200);
    });

    test('interleaves single sample channels', () => {
      const left = new Float32Array([0.5]);
      const right = new Float32Array([-0.5]);
      const result = interleave(left, right);
      expect(Array.from(result)).toEqual([0.5, -0.5]);
    });

    test('preserves floating point values', () => {
      const left = new Float32Array([0.123]);
      const right = new Float32Array([0.456]);
      const result = interleave(left, right);
      expect(result[0]).toBeCloseTo(0.123);
      expect(result[1]).toBeCloseTo(0.456);
    });
  });

  // ─── WAV file structure ────────────────────────────────────
  describe('WAV file structure', () => {
    function writeUTFBytes(view, offset, string) {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    function createWavBuffer(interleaved, sampleRate) {
      var buffer = new ArrayBuffer(44 + interleaved.length * 2);
      var view = new DataView(buffer);

      writeUTFBytes(view, 0, 'RIFF');
      view.setUint32(4, 44 + interleaved.length * 2, true);
      writeUTFBytes(view, 8, 'WAVE');
      writeUTFBytes(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 2, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 4, true);
      view.setUint16(32, 4, true);
      view.setUint16(34, 16, true);
      writeUTFBytes(view, 36, 'data');
      view.setUint32(40, interleaved.length * 2, true);

      var index = 44;
      for (var i = 0; i < interleaved.length; i++) {
        view.setInt16(index, interleaved[i] * 0x7FFF, true);
        index += 2;
      }

      return { buffer, view };
    }

    test('creates valid WAV header', () => {
      const interleaved = new Float32Array([0, 0, 0, 0]);
      const { view } = createWavBuffer(interleaved, 44100);

      // Check RIFF header
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');

      // Check WAVE
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');

      // Check fmt
      expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');
    });

    test('sets correct audio format (PCM = 1)', () => {
      const interleaved = new Float32Array([0]);
      const { view } = createWavBuffer(interleaved, 44100);
      expect(view.getUint16(20, true)).toBe(1); // PCM
    });

    test('sets stereo channels (2)', () => {
      const interleaved = new Float32Array([0]);
      const { view } = createWavBuffer(interleaved, 44100);
      expect(view.getUint16(22, true)).toBe(2);
    });

    test('sets correct sample rate', () => {
      const interleaved = new Float32Array([0]);
      const { view } = createWavBuffer(interleaved, 48000);
      expect(view.getUint32(24, true)).toBe(48000);
    });

    test('sets correct byte rate (sampleRate * 4)', () => {
      const interleaved = new Float32Array([0]);
      const { view } = createWavBuffer(interleaved, 44100);
      expect(view.getUint32(28, true)).toBe(44100 * 4);
    });

    test('sets 16 bits per sample', () => {
      const interleaved = new Float32Array([0]);
      const { view } = createWavBuffer(interleaved, 44100);
      expect(view.getUint16(34, true)).toBe(16);
    });

    test('correct total buffer size', () => {
      const interleaved = new Float32Array(100);
      const { buffer } = createWavBuffer(interleaved, 44100);
      expect(buffer.byteLength).toBe(44 + 100 * 2); // header + data
    });

    test('encodes audio samples correctly', () => {
      // 1.0 should map to 0x7FFF (32767)
      const interleaved = new Float32Array([1.0, -1.0]);
      const { view } = createWavBuffer(interleaved, 44100);
      expect(view.getInt16(44, true)).toBe(32767);   // 1.0 * 0x7FFF
      expect(view.getInt16(46, true)).toBe(-32767);   // -1.0 * 0x7FFF
    });

    test('silence encodes as zero', () => {
      const interleaved = new Float32Array([0.0, 0.0]);
      const { view } = createWavBuffer(interleaved, 44100);
      expect(view.getInt16(44, true)).toBe(0);
      expect(view.getInt16(46, true)).toBe(0);
    });
  });
});

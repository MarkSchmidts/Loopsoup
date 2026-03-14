/**
 * Tests for app/js/patches/webAudioPatch.js
 *
 * Tests the extendAudioContext function that adds mute/unmute/toggleMute/
 * setVal/getVal methods to GainNodes created by the AudioContext.
 */

require('../../tests/setup');
const loadScript = require('../loadScript');
loadScript('app/js/patches/webAudioPatch.js');

describe('webAudioPatch.js - extendAudioContext', () => {
  let audioCtx;

  beforeEach(() => {
    audioCtx = extendAudioContext(new MockAudioContext());
  });

  test('extendAudioContext returns the same context object', () => {
    const ctx = new MockAudioContext();
    const extended = extendAudioContext(ctx);
    expect(extended).toBe(ctx);
  });

  test('createGain returns a gain node with extended methods', () => {
    const gain = audioCtx.createGain();
    expect(typeof gain.mute).toBe('function');
    expect(typeof gain.unmute).toBe('function');
    expect(typeof gain.toggleMute).toBe('function');
    expect(typeof gain.setVal).toBe('function');
    expect(typeof gain.getVal).toBe('function');
    expect(typeof gain.isMuted).toBe('function');
  });

  describe('GainNode.mute()', () => {
    test('sets gain value to 0', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.8;
      gain.mute();
      expect(gain.gain.value).toBe(0);
    });

    test('saves previous value', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.75;
      gain.mute();
      expect(gain.gain.valueSaved).toBe(0.75);
    });

    test('sets muted flag to true', () => {
      const gain = audioCtx.createGain();
      gain.mute();
      expect(gain.gain.muted).toBe(true);
    });

    test('does nothing if already muted', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.5;
      gain.mute();
      expect(gain.gain.valueSaved).toBe(0.5);
      gain.mute(); // again
      expect(gain.gain.valueSaved).toBe(0.5);
    });
  });

  describe('GainNode.unmute()', () => {
    test('restores previous gain value', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.6;
      gain.mute();
      expect(gain.gain.value).toBe(0);
      gain.unmute();
      expect(gain.gain.value).toBe(0.6);
    });

    test('sets muted flag to false', () => {
      const gain = audioCtx.createGain();
      gain.mute();
      gain.unmute();
      expect(gain.gain.muted).toBe(false);
    });

    test('clears saved value', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.5;
      gain.mute();
      gain.unmute();
      expect(gain.gain.valueSaved).toBeNull();
    });

    test('does nothing if not muted', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.8;
      gain.unmute();
      expect(gain.gain.value).toBe(0.8);
    });

    test('restores to 1 if no saved value', () => {
      const gain = audioCtx.createGain();
      gain.gain.muted = true;
      gain.gain.valueSaved = null;
      gain.unmute();
      expect(gain.gain.value).toBe(1);
    });
  });

  describe('GainNode.toggleMute()', () => {
    test('mutes when unmuted', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.7;
      gain.toggleMute();
      expect(gain.isMuted()).toBe(true);
      expect(gain.gain.value).toBe(0);
    });

    test('unmutes when muted', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.7;
      gain.mute();
      gain.toggleMute();
      expect(gain.isMuted()).toBe(false);
      expect(gain.gain.value).toBe(0.7);
    });

    test('toggles back and forth', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.5;
      gain.toggleMute();
      expect(gain.isMuted()).toBe(true);
      gain.toggleMute();
      expect(gain.isMuted()).toBe(false);
      expect(gain.gain.value).toBe(0.5);
    });
  });

  describe('GainNode.setVal()', () => {
    test('sets gain value directly', () => {
      const gain = audioCtx.createGain();
      gain.setVal(0.42);
      expect(gain.gain.value).toBe(0.42);
    });

    test('mutes when setting value to 0', () => {
      const gain = audioCtx.createGain();
      gain.setVal(0);
      expect(gain.isMuted()).toBe(true);
      expect(gain.gain.value).toBe(0);
    });

    test('unmutes when setting positive value while muted', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.5;
      gain.mute();
      gain.setVal(0.8);
      expect(gain.isMuted()).toBe(false);
      // Note: setVal sets value to 0.8, then unmute() restores the saved value (0.5).
      // This is a quirk in the original code.
      expect(gain.gain.value).toBe(0.5);
    });
  });

  describe('GainNode.getVal()', () => {
    test('returns current gain value', () => {
      const gain = audioCtx.createGain();
      gain.gain.value = 0.33;
      expect(gain.getVal()).toBe(0.33);
    });
  });

  describe('GainNode.isMuted()', () => {
    test('returns false by default', () => {
      const gain = audioCtx.createGain();
      expect(gain.isMuted()).toBe(false);
    });

    test('returns true after mute', () => {
      const gain = audioCtx.createGain();
      gain.mute();
      expect(gain.isMuted()).toBe(true);
    });
  });
});

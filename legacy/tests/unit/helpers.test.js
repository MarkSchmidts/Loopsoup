/**
 * Tests for app/js/patches/helpers.js
 *
 * Tests all pure utility functions: mergeFloat32Arrays, isFunction, isInt,
 * Array.prototype.remove, zeroTimeout, getGermanDateFormat, prependZero
 */

const loadScript = require('../loadScript');
loadScript('app/js/patches/helpers.js');

describe('helpers.js', () => {

  // ─── mergeFloat32Arrays ──────────────────────────────────────
  describe('mergeFloat32Arrays', () => {
    test('merges two non-empty Float32Arrays', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      const result = mergeFloat32Arrays(a, b);
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(6);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('merges empty array with non-empty array', () => {
      const a = new Float32Array([]);
      const b = new Float32Array([1, 2]);
      const result = mergeFloat32Arrays(a, b);
      expect(result.length).toBe(2);
      expect(Array.from(result)).toEqual([1, 2]);
    });

    test('merges non-empty array with empty array', () => {
      const a = new Float32Array([1, 2]);
      const b = new Float32Array([]);
      const result = mergeFloat32Arrays(a, b);
      expect(result.length).toBe(2);
      expect(Array.from(result)).toEqual([1, 2]);
    });

    test('merges two empty arrays', () => {
      const a = new Float32Array([]);
      const b = new Float32Array([]);
      const result = mergeFloat32Arrays(a, b);
      expect(result.length).toBe(0);
    });

    test('preserves floating point values', () => {
      const a = new Float32Array([0.1, 0.2]);
      const b = new Float32Array([0.3, 0.4]);
      const result = mergeFloat32Arrays(a, b);
      expect(result.length).toBe(4);
      expect(result[0]).toBeCloseTo(0.1);
      expect(result[3]).toBeCloseTo(0.4);
    });

    test('handles large arrays', () => {
      const a = new Float32Array(10000).fill(1.0);
      const b = new Float32Array(10000).fill(2.0);
      const result = mergeFloat32Arrays(a, b);
      expect(result.length).toBe(20000);
      expect(result[0]).toBe(1.0);
      expect(result[9999]).toBe(1.0);
      expect(result[10000]).toBe(2.0);
      expect(result[19999]).toBe(2.0);
    });
  });

  // ─── isFunction ──────────────────────────────────────────────
  describe('isFunction', () => {
    test('returns true for a function', () => {
      expect(isFunction(function() {})).toBe(true);
    });

    test('returns true for an arrow function', () => {
      expect(isFunction(() => {})).toBe(true);
    });

    test('returns false for a string', () => {
      expect(isFunction('hello')).toBe(false);
    });

    test('returns false for a number', () => {
      expect(isFunction(42)).toBe(false);
    });

    test('returns false for null', () => {
      expect(isFunction(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isFunction(undefined)).toBe(false);
    });

    test('returns false for an object', () => {
      expect(isFunction({})).toBe(false);
    });

    test('returns false for an array', () => {
      expect(isFunction([])).toBe(false);
    });
  });

  // ─── isInt ───────────────────────────────────────────────────
  describe('isInt', () => {
    test('returns true for positive integers', () => {
      expect(isInt('42')).toBe(true);
      expect(isInt('0')).toBe(true);
      expect(isInt('123456789')).toBe(true);
    });

    test('returns true for negative integers', () => {
      expect(isInt('-1')).toBe(true);
      expect(isInt('-999')).toBe(true);
    });

    test('returns false for floats', () => {
      expect(isInt('3.14')).toBe(false);
      expect(isInt('0.5')).toBe(false);
    });

    test('returns false for non-numeric strings', () => {
      expect(isInt('hello')).toBe(false);
      expect(isInt('')).toBe(false);
      expect(isInt('12abc')).toBe(false);
    });

    test('returns true for numeric integers', () => {
      expect(isInt(42)).toBe(true);
      expect(isInt(0)).toBe(true);
      expect(isInt(-5)).toBe(true);
    });
  });

  // ─── Array.prototype.remove ──────────────────────────────────
  describe('Array.prototype.remove', () => {
    test('removes single element at index', () => {
      const arr = [1, 2, 3, 4, 5];
      arr.remove(2);
      expect(arr).toEqual([1, 2, 4, 5]);
    });

    test('removes first element', () => {
      const arr = ['a', 'b', 'c'];
      arr.remove(0);
      expect(arr).toEqual(['b', 'c']);
    });

    test('removes last element', () => {
      const arr = ['a', 'b', 'c'];
      arr.remove(2);
      expect(arr).toEqual(['a', 'b']);
    });

    test('removes multiple elements with deleteCount', () => {
      const arr = [1, 2, 3, 4, 5];
      arr.remove(1, 3);
      expect(arr).toEqual([1, 5]);
    });

    test('removes from single element array', () => {
      const arr = [42];
      arr.remove(0);
      expect(arr).toEqual([]);
    });
  });

  // ─── prependZero ─────────────────────────────────────────────
  describe('prependZero', () => {
    test('prepends zero to single digit number', () => {
      expect(prependZero(5)).toBe('05');
    });

    test('does not prepend zero to double digit number', () => {
      expect(prependZero(12)).toBe('12');
    });

    test('prepends zero to 0', () => {
      expect(prependZero(0)).toBe('00');
    });

    test('handles string input', () => {
      expect(prependZero('3')).toBe('03');
    });

    test('does not prepend to multi-char string', () => {
      expect(prependZero('12')).toBe('12');
    });
  });

  // ─── getGermanDateFormat ─────────────────────────────────────
  describe('getGermanDateFormat', () => {
    test('formats a date correctly', () => {
      const date = new Date(2024, 0, 15, 10, 30); // Jan 15, 2024, 10:30
      const result = getGermanDateFormat(date);
      expect(result).toMatch(/^2024\.1\.15_10\.\d+$/);
    });

    test('returns a string', () => {
      const date = new Date();
      expect(typeof getGermanDateFormat(date)).toBe('string');
    });

    test('includes year', () => {
      const date = new Date(2023, 5, 1);
      const result = getGermanDateFormat(date);
      expect(result).toContain('2023');
    });
  });

  // ─── zeroTimeout ─────────────────────────────────────────────
  describe('zeroTimeout', () => {
    test('calls setTimeout with 0 delay for function', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      zeroTimeout(fn);
      jest.runAllTimers();
      expect(fn).toHaveBeenCalled();
      jest.useRealTimers();
    });

    test('does not throw for non-function argument', () => {
      jest.useFakeTimers();
      expect(() => zeroTimeout('not a function')).not.toThrow();
      jest.runAllTimers();
      jest.useRealTimers();
    });

    test('does not throw for undefined', () => {
      jest.useFakeTimers();
      expect(() => zeroTimeout(undefined)).not.toThrow();
      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  // ─── updateWatchers ──────────────────────────────────────────
  describe('updateWatchers', () => {
    test('calls all watcher callbacks', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();
      updateWatchers([fn1, fn2, fn3]);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    test('handles empty watchers array', () => {
      expect(() => updateWatchers([])).not.toThrow();
    });
  });
});

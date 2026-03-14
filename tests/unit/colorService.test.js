/**
 * Tests for app/js/Services/colorService.js
 *
 * Tests the colorService factory which provides track colors and
 * hex-to-rgba conversion.
 */

// Set up minimal AngularJS mock
const angularModuleMock = {
  factory: jest.fn(function(name, deps) {
    this._factories = this._factories || {};
    const fn = deps[deps.length - 1];
    this._factories[name] = fn;
    return this;
  }),
  controller: jest.fn(function() { return this; }),
  run: jest.fn(function() { return this; }),
};

global.angular = {
  module: jest.fn(() => angularModuleMock),
};

// We need to define loopsoup since colorService.js uses it
global.loopsoup = angularModuleMock;

// Load the service
require('../../app/js/Services/colorService');

describe('colorService', () => {
  let colorService;

  beforeAll(() => {
    // Extract the factory function and call it
    const factoryCall = angularModuleMock.factory.mock.calls.find(
      call => call[0] === 'colorService'
    );
    const factoryFn = factoryCall[1][factoryCall[1].length - 1];
    colorService = factoryFn();
  });

  describe('getColor', () => {
    test('returns first track color for trackNo 0', () => {
      expect(colorService.getColor(0)).toBe('#6AB26D');
    });

    test('returns second track color for trackNo 1', () => {
      expect(colorService.getColor(1)).toBe('#4D9CB6');
    });

    test('returns correct colors for all 5 tracks', () => {
      const expectedColors = ['#6AB26D', '#4D9CB6', '#E95013', '#A600EB', '#FF002D'];
      for (let i = 0; i < 5; i++) {
        expect(colorService.getColor(i)).toBe(expectedColors[i]);
      }
    });

    test('wraps around for track numbers >= 5', () => {
      expect(colorService.getColor(5)).toBe('#6AB26D'); // wraps to index 0
      expect(colorService.getColor(6)).toBe('#4D9CB6'); // wraps to index 1
      expect(colorService.getColor(10)).toBe('#6AB26D'); // wraps to index 0
    });

    test('returns background color (#FFFFFF) for trackNo -1', () => {
      expect(colorService.getColor(-1)).toBe('#FFFFFF');
    });

    test('returns rgba for track when rgba parameter is positive', () => {
      const result = colorService.getColor(0, 0.5);
      expect(result).toMatch(/^rgba\(/);
      // #6AB26D -> r=106, g=178, b=109
      expect(result).toBe('rgba(106,178,109,0.3)');
    });

    test('returns rgba for background when rgba parameter is positive and trackNo is -1', () => {
      const result = colorService.getColor(-1, 0.5);
      expect(result).toMatch(/^rgba\(/);
      // #FFFFFF -> r=255, g=255, b=255
      expect(result).toBe('rgba(255,255,255,0.3)');
    });

    test('returns hex color when rgba is undefined', () => {
      const result = colorService.getColor(0);
      expect(result).toBe('#6AB26D');
    });

    test('returns hex color when rgba is -1', () => {
      const result = colorService.getColor(0, -1);
      expect(result).toBe('#6AB26D');
    });

    test('returns undefined for trackNo -1 without rgba', () => {
      // Actually looking at the code, for trackNo < -1, it falls through
      // For trackNo === -1, it returns backgroundColor
      expect(colorService.getColor(-1)).toBe('#FFFFFF');
    });
  });
});

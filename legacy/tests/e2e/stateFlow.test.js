/**
 * E2E Tests for State Management Flows
 *
 * Tests the complete state flow between stateService and consumers,
 * verifying that track selection, muting, and events propagate correctly
 * across the entire application.
 */

require('../../app/js/patches/helpers');

// Mock AngularJS with working event system
const eventHandlers = {};

const mockRootScope = {
  $broadcast: jest.fn((event, data) => {
    if (eventHandlers[event]) {
      eventHandlers[event].forEach(({ handler }) => handler({}, data));
    }
  }),
  $on: jest.fn((event, handler) => {
    eventHandlers[event] = eventHandlers[event] || [];
    eventHandlers[event].push({ handler });
    return () => {
      eventHandlers[event] = eventHandlers[event].filter(h => h.handler !== handler);
    };
  }),
};

const factories = {};
const angularModuleMock = {
  factory: jest.fn(function(name, deps) {
    const fn = deps[deps.length - 1];
    factories[name] = { deps: deps.slice(0, -1), fn };
    return this;
  }),
  controller: jest.fn(function() { return this; }),
  run: jest.fn(function() { return this; }),
};

global.angular = {
  module: jest.fn(() => angularModuleMock),
  isArray: Array.isArray,
};
global.loopsoup = angularModuleMock;

require('../../app/js/Services/stateService');
require('../../app/js/Services/colorService');

describe('E2E: State Management Flow', () => {
  let stateService, colorService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear event handlers
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);

    stateService = factories['stateService'].fn(mockRootScope);
    colorService = factories['colorService'].fn();
  });

  describe('Cross-component track selection', () => {
    test('selecting track notifies all listeners except caller', () => {
      const visuListener = jest.fn();
      const uiListener = jest.fn();

      stateService.on('visuCtrl', 'select', visuListener);
      stateService.on('uiCtrl', 'select', uiListener);

      // UI selects track 2
      stateService.selectTrack('uiCtrl', 2);

      // Visu should be notified
      expect(visuListener).toHaveBeenCalledWith(2);
      // UI should NOT be notified (it's the caller)
      expect(uiListener).not.toHaveBeenCalled();
    });

    test('unselecting track notifies all listeners', () => {
      const visuListener = jest.fn();
      stateService.on('visuCtrl', 'unselect', visuListener);

      stateService.unselectTrack('uiCtrl');

      expect(visuListener).toHaveBeenCalled();
      expect(stateService.state.selected).toBe(-1);
    });

    test('selecting different tracks updates state', () => {
      stateService.selectTrack('caller1', 0);
      expect(stateService.state.selected).toBe(0);

      stateService.selectTrack('caller1', 3);
      expect(stateService.state.selected).toBe(3);

      stateService.unselectTrack('caller1');
      expect(stateService.state.selected).toBe(-1);
    });
  });

  describe('Cross-component mute toggling', () => {
    test('mute toggle from visu notifies audio and ui', () => {
      const audioListener = jest.fn();
      const uiListener = jest.fn();

      stateService.on('audioCore', 'toggleMute', audioListener);
      stateService.on('uiCtrl', 'toggleMute', uiListener);

      stateService.toggleMuteTrack('visuCtrl', 1);

      expect(audioListener).toHaveBeenCalledWith(1);
      expect(uiListener).toHaveBeenCalledWith(1);
    });
  });

  describe('Multiple event action listeners', () => {
    test('listener can subscribe to multiple actions', () => {
      const handler = jest.fn();
      stateService.on('listener1', ['select', 'unselect', 'toggleMute'], handler);

      stateService.selectTrack('caller', 0);
      expect(handler).toHaveBeenCalledTimes(1);

      stateService.unselectTrack('caller');
      expect(handler).toHaveBeenCalledTimes(2);

      stateService.toggleMuteTrack('caller', 0);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Color-state coordination', () => {
    test('each track selection maps to a color', () => {
      for (let i = 0; i < 10; i++) {
        stateService.selectTrack('caller', i);
        const color = colorService.getColor(stateService.state.selected);
        expect(typeof color).toBe('string');
        expect(color.length).toBe(7); // #RRGGBB
      }
    });

    test('unselected state (-1) maps to white background', () => {
      stateService.unselectTrack('caller');
      const color = colorService.getColor(stateService.state.selected);
      expect(color).toBe('#FFFFFF');
    });
  });

  describe('Event isolation', () => {
    test('listeners only receive events they subscribed to', () => {
      const selectHandler = jest.fn();
      const muteHandler = jest.fn();

      stateService.on('listener1', 'select', selectHandler);
      stateService.on('listener2', 'toggleMute', muteHandler);

      stateService.selectTrack('caller', 0);
      expect(selectHandler).toHaveBeenCalled();
      expect(muteHandler).not.toHaveBeenCalled();

      jest.clearAllMocks();

      stateService.toggleMuteTrack('caller', 0);
      expect(muteHandler).toHaveBeenCalled();
      expect(selectHandler).not.toHaveBeenCalled();
    });
  });

  describe('Rapid state changes', () => {
    test('handles rapid track selection changes', () => {
      const handler = jest.fn();
      stateService.on('listener', 'select', handler);

      for (let i = 0; i < 100; i++) {
        stateService.selectTrack('caller', i % 5);
      }

      expect(handler).toHaveBeenCalledTimes(100);
      expect(stateService.state.selected).toBe(4); // last: 99 % 5 = 4
    });

    test('handles interleaved select/unselect/mute', () => {
      stateService.selectTrack('c', 0);
      stateService.toggleMuteTrack('c', 0);
      stateService.selectTrack('c', 1);
      stateService.unselectTrack('c');
      stateService.toggleMuteTrack('c', 1);

      expect(stateService.state.selected).toBe(-1);
    });
  });
});

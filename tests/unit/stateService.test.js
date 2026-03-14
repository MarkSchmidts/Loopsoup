/**
 * Tests for app/js/Services/stateService.js
 *
 * Tests the stateService factory which manages track state (selection,
 * mute, add, remove) and event broadcasting between controllers.
 */

const mockRootScope = {
  $broadcast: jest.fn(),
  $on: jest.fn(),
};

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
  isArray: Array.isArray,
};
global.loopsoup = angularModuleMock;

require('../../app/js/Services/stateService');

describe('stateService', () => {
  let stateService;

  beforeEach(() => {
    mockRootScope.$broadcast.mockClear();
    mockRootScope.$on.mockClear();

    const factoryCall = angularModuleMock.factory.mock.calls.find(
      call => call[0] === 'stateService'
    );
    const factoryFn = factoryCall[1][factoryCall[1].length - 1];
    stateService = factoryFn(mockRootScope);
  });

  test('has eventName set to "trackUpdate"', () => {
    expect(stateService.eventName).toBe('trackUpdate');
  });

  test('initial state has selected = -1', () => {
    expect(stateService.state.selected).toBe(-1);
  });

  describe('addTrack', () => {
    test('broadcasts add event with track id', () => {
      stateService.addTrack('caller1', 2);
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('trackUpdate', {
        action: 'add',
        track: 2,
        caller: 'caller1',
      });
    });
  });

  describe('removeTrack', () => {
    test('broadcasts remove event with track id', () => {
      stateService.removeTrack('caller1', 3);
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('trackUpdate', {
        action: 'remove',
        track: 3,
        caller: 'caller1',
      });
    });
  });

  describe('toggleMuteTrack', () => {
    test('broadcasts toggleMute event with track id', () => {
      stateService.toggleMuteTrack('caller1', 1);
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('trackUpdate', {
        action: 'toggleMute',
        track: 1,
        caller: 'caller1',
      });
    });
  });

  describe('selectTrack', () => {
    test('broadcasts select event and updates state', () => {
      stateService.selectTrack('caller1', 2);
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('trackUpdate', {
        action: 'select',
        track: 2,
        caller: 'caller1',
      });
      expect(stateService.state.selected).toBe(2);
    });
  });

  describe('unselectTrack', () => {
    test('broadcasts unselect event and resets state to -1', () => {
      stateService.selectTrack('caller1', 2);
      stateService.unselectTrack('caller1');
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('trackUpdate', {
        action: 'unselect',
        caller: 'caller1',
      });
      expect(stateService.state.selected).toBe(-1);
    });
  });

  describe('on', () => {
    test('registers event listener via $rootScope.$on', () => {
      const callback = jest.fn();
      stateService.on('listener1', 'select', callback);
      expect(mockRootScope.$on).toHaveBeenCalledWith('trackUpdate', expect.any(Function));
    });

    test('calls callback when event action matches and caller differs', () => {
      const callback = jest.fn();
      stateService.on('listener1', 'select', callback);

      // Get the registered handler
      const handler = mockRootScope.$on.mock.calls[0][1];

      // Simulate event from different caller
      handler({}, { action: 'select', track: 3, caller: 'otherCaller' });
      expect(callback).toHaveBeenCalledWith(3);
    });

    test('does not call callback when caller matches listener', () => {
      const callback = jest.fn();
      stateService.on('listener1', 'select', callback);

      const handler = mockRootScope.$on.mock.calls[0][1];

      // Same caller - should not trigger
      handler({}, { action: 'select', track: 3, caller: 'listener1' });
      expect(callback).not.toHaveBeenCalled();
    });

    test('does not call callback when action does not match', () => {
      const callback = jest.fn();
      stateService.on('listener1', 'select', callback);

      const handler = mockRootScope.$on.mock.calls[0][1];

      handler({}, { action: 'toggleMute', track: 3, caller: 'otherCaller' });
      expect(callback).not.toHaveBeenCalled();
    });

    test('handles array of event actions', () => {
      const callback = jest.fn();
      stateService.on('listener1', ['select', 'unselect'], callback);

      const handler = mockRootScope.$on.mock.calls[0][1];

      handler({}, { action: 'select', track: 1, caller: 'otherCaller' });
      expect(callback).toHaveBeenCalledTimes(1);

      handler({}, { action: 'unselect', caller: 'otherCaller' });
      expect(callback).toHaveBeenCalledTimes(2);

      handler({}, { action: 'toggleMute', track: 1, caller: 'otherCaller' });
      expect(callback).toHaveBeenCalledTimes(2); // not called for toggleMute
    });
  });
});

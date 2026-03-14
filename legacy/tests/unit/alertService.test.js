/**
 * Tests for app/js/Services/alertService.js
 *
 * Tests the alertService factory which manages alert notifications
 * with add, close, and get operations.
 */

// Set up AngularJS mock
const mockRootScope = {
  $broadcast: jest.fn(),
};

const angularModuleMock = {
  factory: jest.fn(function(name, deps) {
    this._factories = this._factories || {};
    const fn = deps[deps.length - 1];
    const injected = deps.slice(0, -1).map(dep => {
      if (dep === '$rootScope') return mockRootScope;
      return {};
    });
    this._factories[name] = { fn, injected };
    return this;
  }),
  controller: jest.fn(function() { return this; }),
  run: jest.fn(function() { return this; }),
};

global.angular = {
  module: jest.fn(() => angularModuleMock),
};
global.loopsoup = angularModuleMock;

require('../../app/js/Services/alertService');

describe('alertService', () => {
  let alertService;

  beforeEach(() => {
    mockRootScope.$broadcast.mockClear();

    const factoryCall = angularModuleMock.factory.mock.calls.find(
      call => call[0] === 'alertService'
    );
    const factoryFn = factoryCall[1][factoryCall[1].length - 1];
    alertService = factoryFn(mockRootScope);
  });

  describe('addAlert', () => {
    test('adds an alert with message and type', () => {
      alertService.addAlert('Test message', 'danger');
      const alerts = alertService.getAlerts();
      expect(alerts.length).toBe(1);
      expect(alerts[0]).toEqual({ type: 'danger', msg: 'Test message' });
    });

    test('broadcasts alerts:update event', () => {
      alertService.addAlert('Test', 'info');
      expect(mockRootScope.$broadcast).toHaveBeenCalledWith('alerts:update');
    });

    test('adds multiple alerts', () => {
      alertService.addAlert('Alert 1', 'danger');
      alertService.addAlert('Alert 2', 'warning');
      alertService.addAlert('Alert 3', 'info');
      const alerts = alertService.getAlerts();
      expect(alerts.length).toBe(3);
    });

    test('preserves alert order', () => {
      alertService.addAlert('First', 'danger');
      alertService.addAlert('Second', 'warning');
      const alerts = alertService.getAlerts();
      expect(alerts[0].msg).toBe('First');
      expect(alerts[1].msg).toBe('Second');
    });
  });

  describe('closeAlert', () => {
    test('removes alert at specified index', () => {
      alertService.addAlert('Alert 0', 'danger');
      alertService.addAlert('Alert 1', 'warning');
      alertService.addAlert('Alert 2', 'info');
      alertService.closeAlert(1);
      const alerts = alertService.getAlerts();
      expect(alerts.length).toBe(2);
      expect(alerts[0].msg).toBe('Alert 0');
      expect(alerts[1].msg).toBe('Alert 2');
    });

    test('removes first alert', () => {
      alertService.addAlert('Alert 0', 'danger');
      alertService.addAlert('Alert 1', 'warning');
      alertService.closeAlert(0);
      const alerts = alertService.getAlerts();
      expect(alerts.length).toBe(1);
      expect(alerts[0].msg).toBe('Alert 1');
    });

    test('removes last alert', () => {
      alertService.addAlert('Alert 0', 'danger');
      alertService.addAlert('Alert 1', 'warning');
      alertService.closeAlert(1);
      const alerts = alertService.getAlerts();
      expect(alerts.length).toBe(1);
      expect(alerts[0].msg).toBe('Alert 0');
    });
  });

  describe('getAlerts', () => {
    test('returns empty array when no alerts', () => {
      const alerts = alertService.getAlerts();
      expect(alerts).toEqual([]);
    });

    test('returns reference to internal alerts array', () => {
      alertService.addAlert('Test', 'info');
      const alerts1 = alertService.getAlerts();
      const alerts2 = alertService.getAlerts();
      expect(alerts1).toBe(alerts2); // same reference
    });
  });
});

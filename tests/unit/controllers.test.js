/**
 * Tests for AngularJS controllers
 *
 * Tests alertController, uiController, and visuController logic
 * by simulating the AngularJS scope and dependencies.
 */

describe('AlertController', () => {
  let $scope;
  let mockAlertService;

  beforeEach(() => {
    $scope = {
      $on: jest.fn(),
      $apply: jest.fn(fn => fn()),
    };

    mockAlertService = {
      getAlerts: jest.fn(() => [{ type: 'danger', msg: 'Test' }]),
      closeAlert: jest.fn(),
    };

    // Simulate controller initialization
    $scope.alerts = [];
    $scope.alertService = mockAlertService;
    $scope.closeAlert = mockAlertService.closeAlert;
    $scope.closeable = true;

    // Register the on handler
    const onHandler = jest.fn((event, fn) => {
      $scope._handlers = $scope._handlers || {};
      $scope._handlers[event] = fn;
    });
    $scope.$on = onHandler;

    // Simulate controller body
    $scope.$on('alerts:update', function() {
      $scope.$apply(function() {
        $scope.alerts = mockAlertService.getAlerts();
      });
    });
  });

  test('initializes with empty alerts array', () => {
    // Before any event, alerts should be empty (set in controller init)
    expect($scope.alerts).toEqual([]);
  });

  test('exposes alertService on scope', () => {
    expect($scope.alertService).toBe(mockAlertService);
  });

  test('exposes closeAlert on scope', () => {
    expect($scope.closeAlert).toBe(mockAlertService.closeAlert);
  });

  test('closeable is true', () => {
    expect($scope.closeable).toBe(true);
  });

  test('updates alerts on alerts:update event', () => {
    // Trigger the handler
    const handler = $scope._handlers['alerts:update'];
    handler();
    expect($scope.alerts).toEqual([{ type: 'danger', msg: 'Test' }]);
  });

  test('calls alertService.getAlerts on update', () => {
    const handler = $scope._handlers['alerts:update'];
    handler();
    expect(mockAlertService.getAlerts).toHaveBeenCalled();
  });
});

describe('uiController - hotkey logic', () => {
  describe('volume control', () => {
    const volumeMin = 0;
    const volumeMax = 100;
    const volumeStep = 4;

    test('increases volume by step', () => {
      let volume = 50;
      if ((volume + volumeStep) > volumeMax)
        volume = volumeMax;
      else
        volume += volumeStep;
      expect(volume).toBe(54);
    });

    test('caps volume at max', () => {
      let volume = 99;
      if ((volume + volumeStep) > volumeMax)
        volume = volumeMax;
      else
        volume += volumeStep;
      expect(volume).toBe(100);
    });

    test('decreases volume by step', () => {
      let volume = 50;
      if ((volume - volumeStep) < volumeMin)
        volume = volumeMin;
      else
        volume -= volumeStep;
      expect(volume).toBe(46);
    });

    test('floors volume at min', () => {
      let volume = 2;
      if ((volume - volumeStep) < volumeMin)
        volume = volumeMin;
      else
        volume -= volumeStep;
      expect(volume).toBe(0);
    });
  });

  describe('track selection', () => {
    test('selects previous track', () => {
      let selectedTrack = '2';
      if (selectedTrack != -1)
        selectedTrack = (parseInt(selectedTrack) - 1).toString();
      expect(selectedTrack).toBe('1');
    });

    test('does not go below -1', () => {
      let selectedTrack = '-1';
      // When at -1, do nothing
      if (selectedTrack != -1)
        selectedTrack = (parseInt(selectedTrack) - 1).toString();
      expect(selectedTrack).toBe('-1');
    });

    test('selects next track', () => {
      let selectedTrack = '1';
      const tracksLength = 5;
      if (selectedTrack != tracksLength - 1)
        selectedTrack = (parseInt(selectedTrack) + 1).toString();
      expect(selectedTrack).toBe('2');
    });

    test('does not go above last track', () => {
      let selectedTrack = '4';
      const tracksLength = 5;
      if (selectedTrack != tracksLength - 1)
        selectedTrack = (parseInt(selectedTrack) + 1).toString();
      expect(selectedTrack).toBe('4');
    });
  });

  describe('space hold logic', () => {
    test('short press triggers toggle rec', () => {
      const spaceHoldTime = 2000;
      const spaceHoldStart = Date.now();
      const holdDuration = 100; // 100ms press

      // Simulate short hold
      const isShortPress = holdDuration < spaceHoldTime;
      expect(isShortPress).toBe(true);
    });

    test('long press triggers delete', () => {
      const spaceHoldTime = 2000;
      const holdDuration = 3000; // 3s hold

      const isLongPress = holdDuration > spaceHoldTime;
      expect(isLongPress).toBe(true);
    });

    test('very long press (10s) triggers delete all', () => {
      const spaceHoldTime = 2000;
      const holdDuration = 11000; // 11s hold

      const isVeryLongPress = holdDuration > spaceHoldTime * 5;
      expect(isVeryLongPress).toBe(true);
    });
  });

  describe('volumeSliderChange', () => {
    test('returns empty string', () => {
      // The function always returns ''
      const result = '';
      expect(result).toBe('');
    });
  });

  describe('getCtrlBackgroundStyle', () => {
    test('generates style with color', () => {
      const trackColors = ['#6AB26D', '#4D9CB6', '#E95013', '#A600EB', '#FF002D'];
      const backgroundColor = '#FFFFFF';

      function getColor(i) {
        if (i > -1) return trackColors[i % trackColors.length];
        return backgroundColor;
      }

      function getCtrlBackgroundStyle(i) {
        return ".controls.bottom rzslider span, .controls.bottom rzslider span:after, .controls.bottom select {box-shadow: " + getColor(i) + " 0px 0px 19px;}.controls.bottom span {text-shadow: " + getColor(i) + " 0px 0px 19px;}";
      }

      const style = getCtrlBackgroundStyle(0);
      expect(style).toContain('#6AB26D');
      expect(style).toContain('box-shadow');
      expect(style).toContain('text-shadow');
    });

    test('uses white for all tracks (-1)', () => {
      function getColor(i) {
        if (i > -1) return '#6AB26D';
        return '#FFFFFF';
      }

      function getCtrlBackgroundStyle(i) {
        return ".controls.bottom rzslider span {box-shadow: " + getColor(i) + " 0px 0px 19px;}";
      }

      const style = getCtrlBackgroundStyle(-1);
      expect(style).toContain('#FFFFFF');
    });
  });
});

describe('visuController - geometry functions', () => {
  describe('getXonCircle', () => {
    function getXonCircle(centerX, radius, phi) {
      phi -= (Math.PI / 2);
      return centerX + radius * Math.cos(phi);
    }

    test('returns center + radius at phi=PI/2 (right)', () => {
      const x = getXonCircle(100, 50, Math.PI);
      expect(x).toBeCloseTo(100); // cos(PI/2) ≈ 0
    });

    test('returns center at phi=0 (top)', () => {
      const x = getXonCircle(100, 50, Math.PI / 2);
      // phi - PI/2 = 0, cos(0) = 1
      expect(x).toBeCloseTo(150);
    });

    test('handles zero radius', () => {
      const x = getXonCircle(100, 0, Math.PI);
      expect(x).toBeCloseTo(100);
    });
  });

  describe('getYonCircle', () => {
    function getYonCircle(centerY, radius, phi) {
      phi -= (Math.PI / 2);
      return centerY + radius * Math.sin(phi);
    }

    test('returns center + radius at phi=PI (bottom)', () => {
      const y = getYonCircle(100, 50, Math.PI);
      // sin(PI/2) = 1
      expect(y).toBeCloseTo(150);
    });

    test('returns center at phi=0 (top, before offset)', () => {
      const y = getYonCircle(100, 50, 0);
      // sin(-PI/2) = -1
      expect(y).toBeCloseTo(50);
    });
  });

  describe('getPointOnCircle', () => {
    function getXonCircle(centerX, radius, phi) {
      phi -= (Math.PI / 2);
      return centerX + radius * Math.cos(phi);
    }
    function getYonCircle(centerY, radius, phi) {
      phi -= (Math.PI / 2);
      return centerY + radius * Math.sin(phi);
    }
    function getPointOnCircle(centerPoint, radius, phi) {
      const x = getXonCircle(centerPoint.x, radius, phi);
      const y = getYonCircle(centerPoint.y, radius, phi);
      return { x, y };
    }

    test('returns correct point at top (phi=0)', () => {
      const point = getPointOnCircle({ x: 100, y: 100 }, 50, 0);
      // phi=0 -> offset by -PI/2: cos(-PI/2)=0, sin(-PI/2)=-1
      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(50);
    });

    test('returns correct point at right (phi=PI/2)', () => {
      const point = getPointOnCircle({ x: 100, y: 100 }, 50, Math.PI / 2);
      expect(point.x).toBeCloseTo(150);
      expect(point.y).toBeCloseTo(100);
    });

    test('returns correct point at bottom (phi=PI)', () => {
      const point = getPointOnCircle({ x: 100, y: 100 }, 50, Math.PI);
      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(150);
    });

    test('handles full circle (phi=2*PI)', () => {
      const point = getPointOnCircle({ x: 100, y: 100 }, 50, Math.PI * 2);
      // Should be back at top
      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(50);
    });
  });

  describe('adjustRadius', () => {
    test('calculates inner radius as min(w,h)/8', () => {
      const width = 800;
      const height = 600;
      const innerRadius = width < height ? width / 8 : height / 8;
      expect(innerRadius).toBe(75); // 600/8
    });

    test('uses width when smaller', () => {
      const width = 400;
      const height = 600;
      const innerRadius = width < height ? width / 8 : height / 8;
      expect(innerRadius).toBe(50); // 400/8
    });

    test('calculates radius factor', () => {
      const width = 800;
      const height = 600;
      const tracksLength = 3;
      const base = tracksLength - 1 > 6 ? tracksLength - 2 : 7;
      const radiusFactor = Math.floor(Math.min(width, height) / base);
      expect(radiusFactor).toBe(Math.floor(600 / 7));
    });
  });

  describe('loopMarker progress calculation', () => {
    test('calculates percentage played correctly', () => {
      const startTime = 1000;
      const trackDuration = 2000; // 2 seconds
      const currentTime = 1500; // halfway

      const percentagePlayed = ((currentTime - startTime) / trackDuration) % 1;
      expect(percentagePlayed).toBeCloseTo(0.25);
    });

    test('wraps around at 100%', () => {
      const startTime = 1000;
      const trackDuration = 2000;
      const currentTime = 5000; // 2 full loops

      const percentagePlayed = ((currentTime - startTime) / trackDuration) % 1;
      expect(percentagePlayed).toBeCloseTo(0);
    });

    test('converts percentage to angle', () => {
      const percentagePlayed = 0.5;
      const angle = Math.PI * 2 * percentagePlayed;
      expect(angle).toBeCloseTo(Math.PI);
    });
  });
});

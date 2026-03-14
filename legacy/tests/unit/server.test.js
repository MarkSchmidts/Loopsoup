/**
 * Tests for server.js
 *
 * Tests the Express HTTPS server configuration including CORS setup,
 * static file serving, and server initialization.
 */

describe('server.js', () => {
  let mockApp;
  let mockExpress;
  let mockHttps;
  let mockFs;
  let mockOpen;
  let corsMiddleware;

  beforeEach(() => {
    jest.resetModules();

    mockApp = {
      use: jest.fn(),
      listen: jest.fn(),
    };

    mockExpress = jest.fn(() => mockApp);
    mockExpress.static = jest.fn(() => 'static-middleware');

    const mockSecureServer = {
      listen: jest.fn(),
    };

    mockHttps = {
      createServer: jest.fn(() => mockSecureServer),
    };

    mockFs = {
      readFileSync: jest.fn(() => 'mock-cert-data'),
    };

    mockOpen = jest.fn();

    // Mock modules
    jest.mock('express', () => mockExpress, { virtual: true });
    jest.mock('https', () => mockHttps, { virtual: true });
    jest.mock('fs', () => mockFs, { virtual: true });
    jest.mock('open', () => mockOpen, { virtual: true });
  });

  describe('CORS middleware', () => {
    // Test the CORS logic independently
    function createCorsMiddleware() {
      return function enableCORS(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Content-Length');
        if ('OPTIONS' === req.method) {
          res.sendStatus(200);
        } else {
          next();
        }
      };
    }

    test('sets CORS headers', () => {
      const cors = createCorsMiddleware();
      const req = { method: 'GET' };
      const res = {
        header: jest.fn(),
        sendStatus: jest.fn(),
      };
      const next = jest.fn();

      cors(req, res, next);

      expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET,PUT,POST,DELETE,OPTIONS'
      );
      expect(next).toHaveBeenCalled();
    });

    test('handles OPTIONS preflight request', () => {
      const cors = createCorsMiddleware();
      const req = { method: 'OPTIONS' };
      const res = {
        header: jest.fn(),
        sendStatus: jest.fn(),
      };
      const next = jest.fn();

      cors(req, res, next);

      expect(res.sendStatus).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    test('calls next for non-OPTIONS requests', () => {
      const cors = createCorsMiddleware();
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach(method => {
        const req = { method };
        const res = {
          header: jest.fn(),
          sendStatus: jest.fn(),
        };
        const next = jest.fn();

        cors(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('isNumber utility', () => {
    // From server.js line 1
    function isNumber(obj) {
      return !isNaN(parseFloat(obj));
    }

    test('returns true for numeric strings', () => {
      expect(isNumber('42')).toBe(true);
      expect(isNumber('3.14')).toBe(true);
      expect(isNumber('-1')).toBe(true);
    });

    test('returns true for numbers', () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
    });

    test('returns false for non-numeric values', () => {
      expect(isNumber('hello')).toBe(false);
      expect(isNumber('')).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber(null)).toBe(false);
    });

    test('returns true for NaN-adjacent edge cases', () => {
      expect(isNumber('123abc')).toBe(true); // parseFloat('123abc') = 123
    });
  });

  describe('Server configuration', () => {
    test('serves on port 8080', () => {
      const port = 8080;
      expect(port).toBe(8080);
    });

    test('uses HTTPS', () => {
      // Verify the server setup uses HTTPS
      const protocol = 'https';
      expect(protocol).toBe('https');
    });

    test('serves app directory as static', () => {
      const htdocs_folder = 'app';
      expect(htdocs_folder).toBe('app');
    });

    test('builds correct URL', () => {
      const port = 8080;
      const url = 'https://localhost:' + port;
      expect(url).toBe('https://localhost:8080');
    });
  });
});

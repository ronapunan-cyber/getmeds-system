const { isTestModeEnabled, requireTestMode } = require('../src/middleware/testMode');
const testController = require('../src/controllers/test.controller');
const db = require('../src/db/database');

describe('Test Mode Security & Controller', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isTestModeEnabled', () => {
    test('returns true when TEST_MODE=true and NODE_ENV=development', () => {
      process.env.TEST_MODE = 'true';
      process.env.NODE_ENV = 'development';
      expect(isTestModeEnabled()).toBe(true);
    });

    test('returns false when TEST_MODE is not "true"', () => {
      process.env.TEST_MODE = 'false';
      process.env.NODE_ENV = 'development';
      expect(isTestModeEnabled()).toBe(false);

      delete process.env.TEST_MODE;
      expect(isTestModeEnabled()).toBe(false);
    });

    test('returns false in production even if TEST_MODE=true (Production Safeguard)', () => {
      process.env.TEST_MODE = 'true';
      process.env.NODE_ENV = 'production';
      expect(isTestModeEnabled()).toBe(false);
    });
  });

  describe('requireTestMode middleware', () => {
    test('calls next() when TEST_MODE is active', () => {
      process.env.TEST_MODE = 'true';
      process.env.NODE_ENV = 'development';
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const req = { method: 'POST', originalUrl: '/api/test/accounts' };

      requireTestMode(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 403 Forbidden when TEST_MODE is disabled', () => {
      process.env.TEST_MODE = 'false';
      process.env.NODE_ENV = 'development';
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const req = { method: 'POST', originalUrl: '/api/test/accounts' };

      requireTestMode(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'FORBIDDEN' })
        })
      );
    });
  });

  describe('Bulk Account Creation & Cleanup', () => {
    beforeEach(() => {
      process.env.TEST_MODE = 'true';
      process.env.NODE_ENV = 'development';
      testController.cleanupTestAccounts({}, { json: () => {} }, () => {});
    });

    afterEach(() => {
      // Clean up any test users created during test
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      testController.cleanupTestAccounts({}, res, () => {});
    });

    test('creates test accounts in bulk with proper naming and roles', () => {
      const req = {
        body: {
          count: 3,
          prefix: 'testunit',
          role: 'medrep',
          password: 'TestPassword123!',
          domain: 'test.getmeds.ph'
        }
      };
      let responseData = null;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          responseData = data;
        })
      };

      testController.createBulkAccounts(req, res, (err) => { throw err; });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.createdCount).toBe(3);
      expect(responseData.data.accounts).toHaveLength(3);
      expect(responseData.data.accounts[0].email).toBe('testunit001@test.getmeds.ph');
      expect(responseData.data.accounts[1].email).toBe('testunit002@test.getmeds.ph');
      expect(responseData.data.accounts[2].email).toBe('testunit003@test.getmeds.ph');
      expect(responseData.data.accounts[0].role).toBe('medrep');

      // Verify users are saved in DB
      const userInDb = db.prepare('SELECT * FROM users WHERE email = ?').get('testunit001@test.getmeds.ph');
      expect(userInDb).toBeDefined();
      expect(userInDb.name).toBe('Testunit User 001');
    });

    test('supports mixed roles distribution', () => {
      const req = {
        body: {
          count: 5,
          prefix: 'testmixed',
          role: 'mixed',
          password: 'TestPassword123!',
          domain: 'test.getmeds.ph'
        }
      };
      let responseData = null;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => { responseData = data; })
      };

      testController.createBulkAccounts(req, res, (err) => { throw err; });

      expect(responseData.data.createdCount).toBe(5);
      const roles = responseData.data.accounts.map(a => a.role);
      expect(roles).toEqual(['medrep', 'finance', 'dispatch', 'management', 'admin']);
    });

    test('safely cleans up only test accounts without touching protected system accounts', () => {
      // Seeded / protected account check
      const adminBefore = db.prepare("SELECT * FROM users WHERE email = 'admin@getmeds.ph'").get();
      
      // Create some test accounts
      const createReq = {
        body: { count: 2, prefix: 'testuser', role: 'medrep' }
      };
      const dummyRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      testController.createBulkAccounts(createReq, dummyRes, () => {});

      // Perform cleanup
      let cleanupData = null;
      const cleanupRes = {
        json: jest.fn((data) => { cleanupData = data; })
      };
      testController.cleanupTestAccounts({}, cleanupRes, () => {});

      expect(cleanupData.success).toBe(true);
      expect(cleanupData.data.deletedCount).toBeGreaterThanOrEqual(2);

      // Verify test accounts were deleted
      const testUser = db.prepare("SELECT * FROM users WHERE email = 'testuser001@test.getmeds.ph'").get();
      expect(testUser).toBeUndefined();

      // Verify protected admin still exists
      if (adminBefore) {
        const adminAfter = db.prepare("SELECT * FROM users WHERE email = 'admin@getmeds.ph'").get();
        expect(adminAfter).toBeDefined();
        expect(adminAfter.email).toBe('admin@getmeds.ph');
      }
    });

    test('authenticates user via quickLogin without password check when test mode is enabled', () => {
      // Ensure admin@getmeds.ph exists
      const req = { body: { email: 'admin@getmeds.ph' } };
      let responseData = null;
      const res = {
        json: jest.fn((data) => { responseData = data; })
      };

      testController.quickLogin(req, res, (err) => { throw err; });

      expect(responseData.success).toBe(true);
      expect(responseData.data.token).toBeDefined();
      expect(responseData.data.user.email).toBe('admin@getmeds.ph');
      expect(responseData.data.user.role).toBe('admin');
    });

    test('returns 404 when quickLogin is attempted with nonexistent email', () => {
      const req = { body: { email: 'nonexistent@test.getmeds.ph' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      testController.quickLogin(req, res, (err) => { throw err; });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'NOT_FOUND' })
        })
      );
    });
  });
});

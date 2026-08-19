/**
 * Test Mode Middleware & Helper Functions
 * 
 * Safeguards test-only endpoints by verifying TEST_MODE=true and
 * guaranteeing it cannot be enabled in production environments.
 */

function isTestModeEnabled() {
  const isTestMode = process.env.TEST_MODE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  // Safeguard: Never allow TEST_MODE in production
  if (isProduction && isTestMode) {
    console.error('🚨 [TEST_MODE_SECURITY_ALERT] TEST_MODE=true was detected in NODE_ENV=production! Test Mode is strictly blocked in production.');
    return false;
  }

  return isTestMode && !isProduction;
}

function requireTestMode(req, res, next) {
  if (!isTestModeEnabled()) {
    console.warn(`⚠️ [TEST_MODE] Blocked unauthorized access attempt to ${req.method} ${req.originalUrl} (TEST_MODE is disabled or in production)`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Test Mode is disabled. To enable, set TEST_MODE=true in your local backend environment (.env) and ensure NODE_ENV is not "production".'
      }
    });
  }
  next();
}

module.exports = {
  isTestModeEnabled,
  requireTestMode
};

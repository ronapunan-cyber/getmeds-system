require('dotenv').config();
const app = require('./src/app');
const zohoRetryService = require('./src/services/zohoRetryService');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  const isTestMode = process.env.TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
  const isDebug = process.env.DEBUG === 'true';

  console.log(`\n🚀 Getmeds API Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Debug Mode: ${isDebug ? 'ENABLED' : 'disabled'}`);
  console.log(`   Test Mode:  ${isTestMode ? '🧪 ENABLED (Local Development)' : 'disabled'}\n`);

  // Background Zoho sync retry loop — only in the real running server, never
  // under `jest` (tests drive zohoRetryService.processQueue() directly).
  const intervalMs = parseInt(process.env.ZOHO_RETRY_INTERVAL_MS, 10) || 30000;
  zohoRetryService.start(intervalMs);
  console.log(`   Zoho Retry: polling every ${intervalMs / 1000}s for failed syncs to retry\n`);
});

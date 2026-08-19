require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  const isTestMode = process.env.TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
  const isDebug = process.env.DEBUG === 'true';

  console.log(`\n🚀 GetMeds API Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Debug Mode: ${isDebug ? 'ENABLED' : 'disabled'}`);
  console.log(`   Test Mode:  ${isTestMode ? '🧪 ENABLED (Local Development)' : 'disabled'}\n`);
});

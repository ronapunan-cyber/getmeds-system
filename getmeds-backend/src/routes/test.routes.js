const express = require('express');
const router = express.Router();
const { requireTestMode } = require('../middleware/testMode');
const c = require('../controllers/test.controller');

// Status route is always accessible to check if TEST_MODE is active
router.get('/status', c.getStatus);

// All operational test endpoints strictly require TEST_MODE to be enabled
router.use(requireTestMode);

router.get('/accounts', c.getTestAccounts);
router.post('/accounts', c.createBulkAccounts);
router.delete('/accounts', c.cleanupTestAccounts);
router.post('/accounts/cleanup', c.cleanupTestAccounts);

module.exports = router;

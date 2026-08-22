const express = require('express');
const router = express.Router();
const c = require('../controllers/inventory.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/status', requireAuth, c.getInventoryStatus);
router.post('/sync-push', requireAuth, requireRole('admin', 'management', 'dispatch'), c.syncPushCatalog);
router.post('/sync-pull', requireAuth, requireRole('admin', 'management', 'dispatch'), c.syncPullStock);
router.post('/adjust', requireAuth, requireRole('admin', 'management', 'dispatch'), c.adjustStock);

module.exports = router;

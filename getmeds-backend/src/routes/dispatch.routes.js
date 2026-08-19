const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/dispatch.controller');

router.use(requireAuth);
router.use(requireRole('dispatch', 'admin', 'management'));

router.get('/queue', c.getQueue);
router.post('/orders/:id/update-status', requireRole('dispatch', 'admin'), c.updateStatus);
router.post('/orders/:id/tracking', requireRole('dispatch', 'admin'), c.enterTracking);

module.exports = router;

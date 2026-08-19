const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/finance.controller');

router.use(requireAuth);
router.use(requireRole('finance', 'admin', 'management'));

router.get('/queue', c.getQueue);
router.get('/orders/:id/payment', c.getPayment);
router.post('/orders/:id/verify-payment', requireRole('finance', 'admin'), c.verifyPayment);

module.exports = router;

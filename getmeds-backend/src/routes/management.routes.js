const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/management.controller');

router.use(requireAuth);
router.use(requireRole('management', 'admin'));

router.get('/summary', c.getSummary);
router.get('/orders', c.getAllOrders);

module.exports = router;

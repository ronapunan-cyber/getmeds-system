const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/admin.controller');

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/users', c.getAll);
router.post('/users', c.create);
router.patch('/users/:id', c.update);

module.exports = router;

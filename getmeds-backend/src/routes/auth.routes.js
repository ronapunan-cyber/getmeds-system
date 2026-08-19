const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/auth.controller');

router.post('/login', c.login);
router.get('/me', requireAuth, c.me);

module.exports = router;

const express = require('express');
const router = express.Router();
const { requireAuth, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

// Secure all admin routes: require valid authentication and Admin role
router.use(requireAuth);
router.use(isAdmin);

// Route to get all users: GET /api/admin/users
router.get('/users', adminController.getAllUsers);

// Route to create a new user: POST /api/admin/users
router.post('/users', adminController.create);

// Route to update user: PATCH /api/admin/users/:id
router.patch('/users/:id', adminController.update);

// Route to deactivate a user (Soft Delete): PATCH /api/admin/users/:id/deactivate
router.patch('/users/:id/deactivate', adminController.deactivateUser);

// Zoho sync retry outbox: view queued/failed syncs, or trigger an immediate retry pass
router.get('/zoho/queue', adminController.getZohoQueue);
router.post('/zoho/queue/retry', adminController.retryZohoQueue);

module.exports = router;


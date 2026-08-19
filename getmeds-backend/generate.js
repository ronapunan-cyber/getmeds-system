const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const routesDir = path.join(srcDir, 'routes');
const controllersDir = path.join(srcDir, 'controllers');

const files = {
    'routes/auth.routes.js': `const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', auth, authController.me);

module.exports = router;`,
    'controllers/auth.controller.js': `const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    const { username, password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.me = (req, res) => {
    res.json({ user: req.user });
};`,
    'routes/orders.routes.js': `const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', ordersController.getAll);
router.get('/:id', ordersController.getById);
router.post('/', ordersController.create);
router.post('/:id/submit', ordersController.submit);

module.exports = router;`,
    'controllers/orders.controller.js': `const db = require('../db/database');
const stateMachine = require('../workflow/stateMachine');

exports.getAll = (req, res) => {
    try {
        const orders = db.prepare('SELECT * FROM orders').all();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = (req, res) => {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = (req, res) => {
    try {
        const { customer_name, items } = req.body;
        const result = db.prepare('INSERT INTO orders (customer_name, items, status) VALUES (?, ?, ?)').run(customer_name, JSON.stringify(items), 'DRAFT');
        res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.submit = (req, res) => {
    const orderId = req.params.id;
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        if (order.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Order must be in DRAFT status to submit' });
        }
        
        const generatedId = \`ORD-\${Date.now()}\`;
        const zohoSoId = \`ZOHO-\${Date.now()}\`;
        
        const nextState = stateMachine.transition(order.status, 'SUBMIT');
        
        db.prepare('UPDATE orders SET status = ?, generated_id = ?, zoho_so_id = ? WHERE id = ?').run(nextState, generatedId, zohoSoId, orderId);
        db.prepare('INSERT INTO notifications (order_id, message) VALUES (?, ?)').run(orderId, 'Order submitted successfully');
        
        res.json({ message: 'Order submitted', status: nextState, generatedId, zohoSoId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`,
    'routes/finance.routes.js': `const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/:id/approve', financeController.approve);
router.post('/:id/reject', financeController.reject);

module.exports = router;`,
    'controllers/finance.controller.js': `const db = require('../db/database');
const stateMachine = require('../workflow/stateMachine');

exports.approve = (req, res) => {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const nextState = stateMachine.transition(order.status, 'FINANCE_APPROVE');
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextState, req.params.id);
        
        res.json({ message: 'Finance approved', status: nextState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.reject = (req, res) => {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const nextState = stateMachine.transition(order.status, 'FINANCE_REJECT');
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextState, req.params.id);
        
        res.json({ message: 'Finance rejected', status: nextState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`,
    'routes/dispatch.routes.js': `const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatch.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/:id/ship', dispatchController.ship);

module.exports = router;`,
    'controllers/dispatch.controller.js': `const db = require('../db/database');
const stateMachine = require('../workflow/stateMachine');

exports.ship = (req, res) => {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const nextState = stateMachine.transition(order.status, 'DISPATCH_SHIP');
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextState, req.params.id);
        
        res.json({ message: 'Order shipped', status: nextState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`,
    'routes/management.routes.js': `const express = require('express');
const router = express.Router();
const managementController = require('../controllers/management.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/:id/review', managementController.review);

module.exports = router;`,
    'controllers/management.controller.js': `const db = require('../db/database');
const stateMachine = require('../workflow/stateMachine');

exports.review = (req, res) => {
    try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const nextState = stateMachine.transition(order.status, 'MANAGEMENT_REVIEW');
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextState, req.params.id);
        
        res.json({ message: 'Order reviewed', status: nextState });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`,
    'routes/notifications.routes.js': `const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', notificationsController.getAll);

module.exports = router;`,
    'controllers/notifications.controller.js': `const db = require('../db/database');

exports.getAll = (req, res) => {
    try {
        const notifications = db.prepare('SELECT * FROM notifications ORDER BY id DESC').all();
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`,
    'routes/admin.routes.js': `const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/stats', adminController.getStats);

module.exports = router;`,
    'controllers/admin.controller.js': `const db = require('../db/database');

exports.getStats = (req, res) => {
    try {
        const stats = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`
};

for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(srcDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
}

console.log('Files created successfully');

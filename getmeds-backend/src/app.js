require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const ordersRoutes = require('./routes/orders.routes');
const financeRoutes = require('./routes/finance.routes');
const dispatchRoutes = require('./routes/dispatch.routes');
const managementRoutes = require('./routes/management.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const adminRoutes = require('./routes/admin.routes');
const testRoutes = require('./routes/test.routes');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'GetMeds API is running', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/test', testRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } }));

app.use(errorHandler);

module.exports = app;

const db = require('../db/database');
const { logEvent } = require('../services/auditService');
const { notify, getUserIdsByRole } = require('../services/notificationService');

// Finance queue: orders waiting for payment verification
exports.getQueue = (req, res, next) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, c.name as customer_name, c.contact_number,
             u.name as medrep_name, u.email as medrep_email,
             p.status as payment_status, p.payment_reference, p.amount as payment_amount
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.status = 'waiting_for_payment'
      ORDER BY o.submitted_at ASC
    `).all();
    res.json({ success: true, data: { orders } });
  } catch (err) { next(err); }
};

// Get payment details for a specific order
exports.getPayment = (req, res, next) => {
  try {
    const payment = db.prepare(`
      SELECT p.*, u.name as verified_by_name, o.getmeds_order_id, o.total_amount, o.customer_type
      FROM payments p
      LEFT JOIN users u ON p.verified_by = u.id
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.order_id = ?
    `).get(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No payment record found for this order' } });
    res.json({ success: true, data: { payment } });
  } catch (err) { next(err); }
};

// Verify or reject payment
exports.verifyPayment = (req, res, next) => {
  try {
    const { status, payment_reference, payment_date, amount, payment_method, notes } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status must be verified or rejected' } });
    }

    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, u.name as medrep_name, u.email as medrep_email, u.id as medrep_user_id
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    if (order.status !== 'waiting_for_payment') {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Order status is ${order.status}, not waiting_for_payment` } });
    }

    const now = new Date().toISOString();

    if (status === 'verified') {
      const txn = db.transaction(() => {
        // Update payment record
        db.prepare(`
          UPDATE payments SET status = 'verified', payment_reference = ?, payment_date = ?,
          amount = ?, payment_method = ?, notes = ?, verified_by = ?, verified_at = ?
          WHERE order_id = ?
        `).run(payment_reference || null, payment_date || null, amount || order.total_amount, payment_method || null, notes || null, req.user.id, now, order.id);

        // Advance order: payment_verified → ready_for_dispatch
        db.prepare('UPDATE orders SET status = \'ready_for_dispatch\', updated_at = ? WHERE id = ?').run(now, order.id);

        // Create dispatch record
        const existing = db.prepare('SELECT id FROM dispatch_records WHERE order_id = ?').get(order.id);
        if (!existing) {
          db.prepare('INSERT INTO dispatch_records (order_id, status, created_at) VALUES (?, \'queued\', datetime(\'now\'))').run(order.id);
        }

        logEvent({ orderId: order.id, eventType: 'PAYMENT_VERIFIED', oldStatus: 'waiting_for_payment', newStatus: 'ready_for_dispatch', actorId: req.user.id, actorName: req.user.name, notes: `Reference: ${payment_reference || 'N/A'}` });

        // Notify MedRep + Dispatch
        const dispatchIds = getUserIdsByRole('dispatch');
        notify({ orderId: order.id, recipientIds: [order.medrep_user_id, ...dispatchIds], message: `Payment verified for ${order.getmeds_order_id}. Order is ready for dispatch.`, eventType: 'PAYMENT_VERIFIED', orderData: order });
      });
      txn();

    } else {
      // Rejected: order → on_hold
      const txn = db.transaction(() => {
        db.prepare(`
          UPDATE payments SET status = 'rejected', notes = ?, verified_by = ?, verified_at = ?
          WHERE order_id = ?
        `).run(notes || null, req.user.id, now, order.id);

        db.prepare('UPDATE orders SET status = \'on_hold\', updated_at = ? WHERE id = ?').run(now, order.id);

        logEvent({ orderId: order.id, eventType: 'PAYMENT_REJECTED', oldStatus: 'waiting_for_payment', newStatus: 'on_hold', actorId: req.user.id, actorName: req.user.name, notes: notes || 'Payment rejected' });

        notify({ orderId: order.id, recipientIds: [order.medrep_user_id], message: `Payment rejected for ${order.getmeds_order_id}. Order is on hold. Notes: ${notes || 'None'}`, eventType: 'PAYMENT_REJECTED', orderData: order });
      });
      txn();
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ success: true, data: { order: updatedOrder } });
  } catch (err) { next(err); }
};

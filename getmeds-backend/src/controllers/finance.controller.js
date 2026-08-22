const db = require('../db/database');
const zoho = require('../integrations/zoho');
const { logEvent, resolveActor } = require('../services/auditService');
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
exports.verifyPayment = async (req, res, next) => {
  try {
    const { status, payment_reference, payment_date, amount, payment_method, notes } = req.body;
    const effectiveActor = resolveActor(req.user, 'finance');

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
        `).run(payment_reference || null, payment_date || null, amount || order.total_amount, payment_method || null, notes || null, effectiveActor.id, now, order.id);

        // Advance order: payment_verified → ready_for_dispatch
        db.prepare('UPDATE orders SET status = \'ready_for_dispatch\', updated_at = ? WHERE id = ?').run(now, order.id);

        // Create dispatch record
        const existing = db.prepare('SELECT id FROM dispatch_records WHERE order_id = ?').get(order.id);
        if (!existing) {
          db.prepare('INSERT INTO dispatch_records (order_id, status, created_at) VALUES (?, \'queued\', ?)').run(order.id, now);
        }

        logEvent({ orderId: order.id, eventType: 'PAYMENT_VERIFIED', oldStatus: 'waiting_for_payment', newStatus: 'ready_for_dispatch', actorId: effectiveActor.id, actorName: effectiveActor.name, notes: `Reference: ${payment_reference || 'N/A'}` });

        // Notify MedRep + Dispatch
        const dispatchIds = getUserIdsByRole('dispatch');
        notify({ orderId: order.id, recipientIds: [order.medrep_user_id, ...dispatchIds], message: `Payment verified for ${order.getmeds_order_id}. Order is ready for dispatch.`, eventType: 'PAYMENT_VERIFIED', orderData: order });
      });
      txn();

      // Sync status to Zoho (Create Invoice + Register Payment -> Marks SO as Paid)
      if (order.zoho_so_id) {
        try {
          const zohoPayRes = await zoho.recordPaymentForSalesOrder({
            salesorderId: order.zoho_so_id,
            amount: amount || order.total_amount,
            paymentReference: payment_reference,
            paymentDate: payment_date,
            paymentMethod: payment_method,
            notes: notes
          });
          console.log(`[ZOHO] Payment registered in Zoho for SO ${order.zoho_so_id}:`, zohoPayRes?.message || 'Success');
        } catch (zohoPayErr) {
          console.error(`[ZOHO_PAYMENT_FAIL] Failed to register payment in Zoho for SO ${order.zoho_so_id}:`, zohoPayErr.message);
        }
      }

    } else {
      // Rejected: order → on_hold
      const txn = db.transaction(() => {
        db.prepare(`
          UPDATE payments SET status = 'rejected', notes = ?, verified_by = ?, verified_at = ?
          WHERE order_id = ?
        `).run(notes || null, effectiveActor.id, now, order.id);

        db.prepare('UPDATE orders SET status = \'on_hold\', updated_at = ? WHERE id = ?').run(now, order.id);

        logEvent({ orderId: order.id, eventType: 'PAYMENT_REJECTED', oldStatus: 'waiting_for_payment', newStatus: 'on_hold', actorId: effectiveActor.id, actorName: effectiveActor.name, notes: notes || 'Payment rejected' });

        notify({ orderId: order.id, recipientIds: [order.medrep_user_id], message: `Payment rejected for ${order.getmeds_order_id}. Order is on hold. Notes: ${notes || 'None'}`, eventType: 'PAYMENT_REJECTED', orderData: order });
      });
      txn();

      if (order.zoho_so_id) {
        try {
          await zoho.addOrderComment(order.zoho_so_id, `Payment Rejected by ${effectiveActor.name} | Notes: ${notes || 'None'}`);
        } catch (commentErr) {
          console.warn(`[ZOHO_COMMENT_WARN] Could not add rejection comment to SO ${order.zoho_so_id}:`, commentErr.message);
        }
      }
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ success: true, data: { order: updatedOrder } });
  } catch (err) { next(err); }
};

// Force Zoho Payment Sync (Manual retry / Test Mode helper)
exports.syncPaymentToZoho = async (req, res, next) => {
  try {
    const order = db.prepare(`
      SELECT o.*, p.payment_reference, p.payment_date, p.amount as payment_amount, p.payment_method, p.notes as payment_notes, p.status as payment_status
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ? OR o.getmeds_order_id = ?
    `).get(req.params.id, req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    if (!order.zoho_so_id) {
      return res.status(400).json({ success: false, error: { code: 'NO_ZOHO_SO', message: 'Order does not have a Zoho Sales Order ID yet.' } });
    }

    const result = await zoho.recordPaymentForSalesOrder({
      salesorderId: order.zoho_so_id,
      amount: order.payment_amount || order.total_amount,
      paymentReference: order.payment_reference || `REF-${order.getmeds_order_id}`,
      paymentDate: order.payment_date || new Date().toISOString().slice(0, 10),
      paymentMethod: order.payment_method || 'Bank Transfer',
      notes: order.payment_notes || `Force Payment Sync from Getmeds`
    });

    logEvent({
      orderId: order.id,
      eventType: 'ZOHO_PAYMENT_SYNCED',
      actorId: req.user?.id || null,
      actorName: req.user?.name || 'Finance User',
      notes: `Manual Zoho payment sync: ${result?.message || 'Success'}`
    });

    return res.json({
      success: true,
      data: {
        message: result?.message || 'Payment synced to Zoho successfully',
        result
      }
    });
  } catch (err) {
    next(err);
  }
};


const db = require('../db/database');
const zoho = require('../integrations/zoho');
const { logEvent } = require('../services/auditService');
const { notify, getUserIdsByRole } = require('../services/notificationService');

// Dispatch queue: ready_for_dispatch and picking_packing orders
exports.getQueue = (req, res, next) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, c.name as customer_name, c.contact_number,
             u.name as medrep_name,
             d.status as dispatch_status, d.courier, d.tracking_number, d.created_at as dispatch_created_at
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      LEFT JOIN dispatch_records d ON o.id = d.order_id
      WHERE o.status IN ('ready_for_dispatch', 'picking_packing', 'dispatched')
      ORDER BY o.updated_at ASC
    `).all();
    res.json({ success: true, data: { orders } });
  } catch (err) { next(err); }
};

// Update dispatch status: picking | packing | dispatched
exports.updateStatus = (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['picking', 'packing', 'dispatched'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status must be picking, packing, or dispatched' } });
    }

    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, u.id as medrep_user_id, u.name as medrep_name, u.email as medrep_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });

    const now = new Date().toISOString();

    if (status === 'picking' || status === 'packing') {
      if (!['ready_for_dispatch', 'picking_packing'].includes(order.status)) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Order status is ${order.status}` } });
      }

      const txn = db.transaction(() => {
        db.prepare('UPDATE orders SET status = \'picking_packing\', updated_at = ? WHERE id = ?').run(now, order.id);
        db.prepare('UPDATE dispatch_records SET status = ? WHERE order_id = ?').run(status, order.id);
        logEvent({ orderId: order.id, eventType: 'DISPATCH_STATUS_UPDATE', oldStatus: order.status, newStatus: 'picking_packing', actorId: req.user.id, actorName: req.user.name, notes: `Dispatch status: ${status}` });
      });
      txn();

      if (order.zoho_so_id) {
        if (status === 'picking') {
          zoho.addOrderComment(order.zoho_so_id, `Pharmacy Picking in progress by ${req.user.name}`).catch(() => {});
        } else if (status === 'packing') {
          zoho.packSalesOrder(order.zoho_so_id).catch(() => {});
          zoho.addOrderComment(order.zoho_so_id, `Order Packed by ${req.user.name}`).catch(() => {});
        }
      }

    } else if (status === 'dispatched') {
      if (order.status !== 'picking_packing') {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Order must be in picking_packing to mark dispatched` } });
      }

      const txn = db.transaction(() => {
        db.prepare('UPDATE orders SET status = \'dispatched\', updated_at = ? WHERE id = ?').run(now, order.id);
        db.prepare('UPDATE dispatch_records SET status = \'dispatched\', dispatched_by = ?, dispatched_at = ? WHERE order_id = ?').run(req.user.id, now, order.id);
        logEvent({ orderId: order.id, eventType: 'ORDER_DISPATCHED', oldStatus: 'picking_packing', newStatus: 'dispatched', actorId: req.user.id, actorName: req.user.name });
      });
      txn();

      if (order.zoho_so_id) {
        zoho.packSalesOrder(order.zoho_so_id).catch(() => {});
        zoho.addOrderComment(order.zoho_so_id, `Order Dispatched by ${req.user.name} — Awaiting courier tracking`).catch(() => {});
      }

      notify({ orderId: order.id, recipientIds: [order.medrep_user_id], message: `Order ${order.getmeds_order_id} has been dispatched. Awaiting tracking details.`, eventType: 'ORDER_DISPATCHED', orderData: order });
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ success: true, data: { order: updated } });
  } catch (err) { next(err); }
};

// Enter tracking information → order becomes tracking_shared → completed
exports.enterTracking = (req, res, next) => {
  try {
    const { courier, tracking_number, dispatch_notes } = req.body;

    if (!courier || !tracking_number) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'courier and tracking_number are required' } });
    }

    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, u.id as medrep_user_id, u.name as medrep_name, u.email as medrep_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    if (order.status !== 'dispatched') {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Order must be dispatched to enter tracking. Current: ${order.status}` } });
    }

    const now = new Date().toISOString();

    const txn = db.transaction(() => {
      db.prepare(`
        UPDATE dispatch_records SET courier = ?, tracking_number = ?, dispatch_notes = ?, status = 'dispatched'
        WHERE order_id = ?
      `).run(courier, tracking_number, dispatch_notes || null, order.id);

      // tracking_shared → completed (auto-advance)
      db.prepare('UPDATE orders SET status = \'tracking_shared\', updated_at = ? WHERE id = ?').run(now, order.id);

      logEvent({ orderId: order.id, eventType: 'TRACKING_ENTERED', oldStatus: 'dispatched', newStatus: 'tracking_shared', actorId: req.user.id, actorName: req.user.name, notes: `${courier}: ${tracking_number}` });

      // Auto-complete
      db.prepare('UPDATE orders SET status = \'completed\', updated_at = ? WHERE id = ?').run(now, order.id);
      logEvent({ orderId: order.id, eventType: 'ORDER_COMPLETED', oldStatus: 'tracking_shared', newStatus: 'completed', actorId: req.user.id, actorName: req.user.name });

      // Notify MedRep with tracking details
      notify({
        orderId: order.id,
        recipientIds: [order.medrep_user_id],
        message: `Order ${order.getmeds_order_id} is completed! Courier: ${courier}, Tracking: ${tracking_number}`,
        eventType: 'ORDER_COMPLETED',
        orderData: { ...order, status: 'completed' }
      });
    });
    txn();

    // Sync shipment & tracking to Zoho
    if (order.zoho_so_id) {
      zoho.shipSalesOrder({
        salesorderId: order.zoho_so_id,
        trackingNumber: tracking_number,
        courier: courier
      }).catch(() => {});
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    res.json({ success: true, data: { order: updated } });
  } catch (err) { next(err); }
};

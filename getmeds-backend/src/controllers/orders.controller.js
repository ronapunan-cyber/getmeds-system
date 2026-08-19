const db = require('../db/database');
const stateMachine = require('../workflow/stateMachine');
const { generateOrderId } = require('../services/orderIdService');
const { logEvent } = require('../services/auditService');
const { notify, getUserIdsByRole } = require('../services/notificationService');
const { createSalesOrderMock } = require('../integrations/zoho/zohoMock');

// ─── META ──────────────────────────────────────────────────────────────────────

exports.getCustomers = (req, res, next) => {
  try {
    const customers = db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name').all();
    res.json({ success: true, data: { customers } });
  } catch (err) { next(err); }
};

exports.getProducts = (req, res, next) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name').all();
    res.json({ success: true, data: { products } });
  } catch (err) { next(err); }
};

// ─── LIST / GET ────────────────────────────────────────────────────────────────

exports.getAll = (req, res, next) => {
  try {
    const { status, customer_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    // MedReps only see their own orders
    if (req.user.role === 'medrep') {
      where.push('o.medrep_id = ?');
      params.push(req.user.id);
    }
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (customer_type) { where.push('o.customer_type = ?'); params.push(customer_type); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const orders = db.prepare(`
      SELECT o.*, c.name as customer_name, c.type as customer_type_detail,
             u.name as medrep_name,
             p.status as payment_status,
             d.status as dispatch_status, d.tracking_number, d.courier
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      LEFT JOIN dispatch_records d ON o.id = d.order_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    const totalRow = db.prepare(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`
    ).get(...params);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: totalRow.total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalRow.total / parseInt(limit))
        }
      }
    });
  } catch (err) { next(err); }
};

exports.getById = (req, res, next) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.contact_person, c.contact_number,
             u.name as medrep_name, u.email as medrep_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });

    // MedRep can only see their own orders
    if (req.user.role === 'medrep' && order.medrep_id !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.sku, p.unit
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);

    const payment = db.prepare(`
      SELECT p.*, u.name as verified_by_name
      FROM payments p
      LEFT JOIN users u ON p.verified_by = u.id
      WHERE p.order_id = ?
    `).get(order.id);

    const dispatch = db.prepare(`
      SELECT d.*, u.name as dispatched_by_name
      FROM dispatch_records d
      LEFT JOIN users u ON d.dispatched_by = u.id
      WHERE d.order_id = ?
    `).get(order.id);

    const events = db.prepare(
      'SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC'
    ).all(order.id);

    res.json({ success: true, data: { order, items, payment, dispatch, events } });
  } catch (err) { next(err); }
};

exports.getEvents = (req, res, next) => {
  try {
    const events = db.prepare(
      'SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC'
    ).all(req.params.id);
    res.json({ success: true, data: { events } });
  } catch (err) { next(err); }
};

// ─── CREATE (DRAFT) ───────────────────────────────────────────────────────────

exports.create = (req, res, next) => {
  try {
    const { customer_id, items, delivery_address, delivery_notes, customer_type } = req.body;

    // Validation
    if (!customer_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'customer_id is required' } });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one order item is required' } });
    if (!delivery_address) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'delivery_address is required' } });
    if (!customer_type || !['credit', 'direct'].includes(customer_type)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'customer_type must be credit or direct' } });

    // Verify customer exists
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(customer_id);
    if (!customer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });

    // Calculate totals and validate products
    let total_amount = 0;
    const resolvedItems = [];
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Each item needs product_id and quantity > 0' } });
      }
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
      if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Product ${item.product_id} not found` } });
      const subtotal = product.unit_price * item.quantity;
      total_amount += subtotal;
      resolvedItems.push({ product_id: item.product_id, quantity: item.quantity, unit_price: product.unit_price, subtotal, sku: product.sku, name: product.name });
    }

    // Generate a temporary placeholder Order ID (real one assigned on submit)
    const tempId = `DRAFT-${Date.now()}`;

    const createOrderTxn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO orders (getmeds_order_id, customer_id, medrep_id, status, customer_type, total_amount, delivery_address, delivery_notes, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(tempId, customer_id, req.user.id, customer_type, total_amount, delivery_address, delivery_notes || null);

      const orderId = result.lastInsertRowid;

      const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)');
      for (const ri of resolvedItems) {
        insItem.run(orderId, ri.product_id, ri.quantity, ri.unit_price, ri.subtotal);
      }

      logEvent({ orderId, eventType: 'ORDER_CREATED', newStatus: 'draft', actorId: req.user.id, actorName: req.user.name, notes: 'Draft order created' });

      return orderId;
    });

    const orderId = createOrderTxn();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.status(201).json({ success: true, data: { order } });
  } catch (err) { next(err); }
};

// ─── SUBMIT ───────────────────────────────────────────────────────────────────

exports.submit = (req, res, next) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.contact_number, u.name as medrep_name, u.email as medrep_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.medrep_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    if (req.user.role === 'medrep' && order.medrep_id !== req.user.id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your order' } });
    }
    if (order.status !== 'draft') {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: `Order is already ${order.status}, cannot submit` } });
    }

    const items = db.prepare(`
      SELECT oi.*, p.name as name, p.sku FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?
    `).all(order.id);

    const submitTxn = db.transaction(() => {
      // Step 1: submitted → validating → so_pending → so_created
      const getmedsOrderId = generateOrderId();
      const now = new Date().toISOString();

      // Step 2: Create Zoho SO (mock)
      const zohoResult = createSalesOrderMock({
        getmeds_order_id: getmedsOrderId,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        delivery_address: order.delivery_address,
        items
      });

      // Step 3: Determine next status based on customer type
      // credit → ready_for_dispatch (no payment needed)
      // direct → waiting_for_payment
      const finalStatus = order.customer_type === 'credit' ? 'ready_for_dispatch' : 'waiting_for_payment';

      db.prepare(`
        UPDATE orders SET
          getmeds_order_id = ?, status = ?, submitted_at = ?, updated_at = ?,
          zoho_so_id = ?, zoho_so_number = ?, zoho_sync_status = 'synced'
        WHERE id = ?
      `).run(getmedsOrderId, finalStatus, now, now,
        zohoResult.salesorder.salesorder_id,
        zohoResult.salesorder.salesorder_number,
        order.id);

      // Step 4: If direct patient, create payment record
      if (order.customer_type === 'direct') {
        db.prepare(`
          INSERT INTO payments (order_id, status, created_at)
          VALUES (?, 'pending', datetime('now'))
        `).run(order.id);
      }

      // Step 5: If credit customer, create dispatch record immediately
      if (order.customer_type === 'credit') {
        db.prepare(`
          INSERT INTO dispatch_records (order_id, status, created_at)
          VALUES (?, 'queued', datetime('now'))
        `).run(order.id);
      }

      // Audit trail — log all status hops
      const statusPath = order.customer_type === 'credit'
        ? ['submitted', 'validating', 'so_pending', 'so_created', 'ready_for_dispatch']
        : ['submitted', 'validating', 'so_pending', 'so_created', 'waiting_for_payment'];

      let prev = 'draft';
      for (const s of statusPath) {
        logEvent({ orderId: order.id, eventType: 'STATUS_CHANGE', oldStatus: prev, newStatus: s, actorId: req.user.id, actorName: req.user.name,
          notes: s === 'so_created' ? `Zoho SO created: ${zohoResult.salesorder.salesorder_number}` : undefined });
        prev = s;
      }

      // Step 6: Notify
      const orderDataForNotif = { getmeds_order_id: getmedsOrderId, customer_name: order.customer_name, status: finalStatus, medrep_email: order.medrep_email };
      if (order.customer_type === 'direct') {
        const financeIds = getUserIdsByRole('finance');
        notify({ orderId: order.id, recipientIds: financeIds, message: `New direct patient order ${getmedsOrderId} requires payment verification.`, eventType: 'PAYMENT_VERIFICATION_REQUIRED', orderData: orderDataForNotif });
      } else {
        const dispatchIds = getUserIdsByRole('dispatch');
        notify({ orderId: order.id, recipientIds: dispatchIds, message: `New credit order ${getmedsOrderId} is ready for dispatch.`, eventType: 'ORDER_READY_FOR_DISPATCH', orderData: orderDataForNotif });
      }

      return { getmedsOrderId, finalStatus, zohoResult };
    });

    const result = submitTxn();
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: { order: updatedOrder, zoho: result.zohoResult.salesorder } });
  } catch (err) { next(err); }
};

// ─── EXCEPTION / ON HOLD ──────────────────────────────────────────────────────

exports.setException = (req, res, next) => {
  try {
    const { reason, status } = req.body;
    const targetStatus = status === 'on_hold' ? 'on_hold' : 'exception';

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    if (!stateMachine.canTransition(order.status, targetStatus)) {
      return res.status(409).json({ success: false, error: { code: 'INVALID_TRANSITION', message: `Cannot move from ${order.status} to ${targetStatus}` } });
    }

    db.prepare('UPDATE orders SET status = ?, exception_reason = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(targetStatus, reason || null, order.id);

    logEvent({ orderId: order.id, eventType: 'EXCEPTION_SET', oldStatus: order.status, newStatus: targetStatus, actorId: req.user.id, actorName: req.user.name, notes: reason });

    const medrepIds = [order.medrep_id];
    const mgmtIds = getUserIdsByRole('management');
    notify({ orderId: order.id, recipientIds: [...medrepIds, ...mgmtIds], message: `Order ${order.getmeds_order_id} is now ${targetStatus}. Reason: ${reason || 'None provided'}`, eventType: 'ORDER_EXCEPTION', orderData: order });

    res.json({ success: true, data: { status: targetStatus } });
  } catch (err) { next(err); }
};

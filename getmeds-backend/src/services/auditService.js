const db = require('../db/database');

/**
 * Log an order event to the order_events audit table.
 */
function logEvent({ orderId, eventType, oldStatus, newStatus, actorId, actorName, notes, metadata }) {
  db.prepare(`
    INSERT INTO order_events (order_id, event_type, old_status, new_status, actor_id, actor_name, notes, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    orderId,
    eventType,
    oldStatus || null,
    newStatus || null,
    actorId || null,
    actorName || null,
    notes || null,
    metadata ? JSON.stringify(metadata) : null
  );
}

module.exports = { logEvent };

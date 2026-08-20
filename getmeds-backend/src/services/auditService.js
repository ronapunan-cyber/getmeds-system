const db = require('../db/database');

// 1. Prepare the statement once at module load for better performance
const insertEventStmt = db.prepare(`
  INSERT INTO order_events (
    order_id, event_type, old_status, new_status, 
    actor_id, actor_name, notes, metadata, created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

/**
 * Log an order event to the order_events audit table.
 * 
 * @param {Object} params - The event details.
 * @param {number|string} params.orderId - Required. The ID of the order.
 * @param {string} params.eventType - Required. The type of event.
 * @param {string} [params.oldStatus] - The previous status.
 * @param {string} [params.newStatus] - The new status.
 * @param {number|string} [params.actorId] - ID of the user performing the action.
 * @param {string} [params.actorName] - Name of the user.
 * @param {string} [params.notes] - Additional context.
 * @param {Object} [params.metadata] - Extra data to be stored as JSON.
 */
function logEvent({ orderId, eventType, oldStatus, newStatus, actorId, actorName, notes, metadata }) {
  // 2. Validate required fields
  if (!orderId || !eventType) {
    throw new Error('orderId and eventType are required to log an event.');
  }

  try {
    // 3. Execute the cached statement
    // 4. Use '??' instead of '||' to preserve falsy values like 0 or ""
    insertEventStmt.run(
      orderId,
      eventType,
      oldStatus ?? null,
      newStatus ?? null,
      actorId ?? null,
      actorName ?? null,
      notes ?? null,
      metadata ? JSON.stringify(metadata) : null
    );
  } catch (error) {
    // 5. Handle potential database errors (e.g., constraint violations)
    console.error(`Failed to log order event for orderId: ${orderId}`, error);
    throw error;
  }
}

module.exports = { logEvent };


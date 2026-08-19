const db = require('../db/database');

/**
 * Send a notification to one or more recipients.
 * Creates in_app DB record, logs simulated email and Google Chat payloads.
 */
function notify({ orderId, recipientIds, message, eventType, orderData = {} }) {
  const now = new Date().toISOString();

  // 1. In-App notification (stored in DB for each recipient)
  if (recipientIds && recipientIds.length > 0) {
    const ins = db.prepare(`
      INSERT INTO notifications (order_id, recipient_id, channel, message, payload, sent_at)
      VALUES (?, ?, 'in_app', ?, ?, ?)
    `);
    for (const rid of recipientIds) {
      if (rid) ins.run(orderId || null, rid, message, null, now);
    }
  }

  // 2. Simulated Email Log (no real SMTP)
  const emailPayload = {
    to: orderData.medrep_email || 'medrep@getmeds.ph',
    subject: `[GetMeds] Order ${orderData.getmeds_order_id || ''} — ${eventType}`,
    body: message,
    order_id: orderData.getmeds_order_id,
    timestamp: now
  };
  console.log('[EMAIL_LOG]', JSON.stringify(emailPayload));

  // 3. Simulated Google Chat Log (log the full card payload structure)
  const chatPayload = {
    webhook_url: process.env.GOOGLE_CHAT_WEBHOOK_URL || 'NOT_CONFIGURED',
    _note: 'This is a simulated payload. Set GOOGLE_CHAT_WEBHOOK_URL in .env to send real messages.',
    cards: [{
      header: {
        title: `GetMeds Order Update`,
        subtitle: `Order: ${orderData.getmeds_order_id || 'N/A'}`,
        imageUrl: 'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg'
      },
      sections: [{
        widgets: [
          { keyValue: { topLabel: 'Event', content: eventType } },
          { keyValue: { topLabel: 'Order ID', content: orderData.getmeds_order_id || 'N/A' } },
          { keyValue: { topLabel: 'Customer', content: orderData.customer_name || 'N/A' } },
          { keyValue: { topLabel: 'Status', content: orderData.status || 'N/A' } },
          { keyValue: { topLabel: 'Message', content: message } },
          { keyValue: { topLabel: 'Timestamp', content: now } }
        ]
      }]
    }],
    timestamp: now
  };
  console.log('[GOOGLE_CHAT_LOG]', JSON.stringify(chatPayload));
}

/**
 * Get user IDs by role(s)
 */
function getUserIdsByRole(...roles) {
  const placeholders = roles.map(() => '?').join(',');
  const users = db.prepare(
    `SELECT id FROM users WHERE role IN (${placeholders}) AND is_active = 1`
  ).all(...roles);
  return users.map(u => u.id);
}

module.exports = { notify, getUserIdsByRole };

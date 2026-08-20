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

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const orderIdentifier = orderData.getmeds_order_id || orderId || '';
  const triggeredBy = orderData.actorName || orderData.triggered_by || (eventType === 'ORDER_READY_FOR_DISPATCH' && orderData.customer_type === 'credit' ? 'System (Auto-Approval)' : 'System');

  // Determine next operational step for internal team
  let nextAction = 'None';
  if (orderData.status === 'waiting_for_payment') {
    nextAction = 'Awaiting Finance Payment Verification (Direct Patient)';
  } else if (orderData.status === 'ready_for_dispatch') {
    nextAction = 'Awaiting Pharmacy Picking & Packing';
  } else if (orderData.status === 'dispatched') {
    nextAction = 'Awaiting Dispatch Courier Tracking Input';
  } else if (orderData.status === 'on_hold' || orderData.status === 'exception') {
    nextAction = 'Action Required: Resolve Order Exception';
  }

  // 2a. Enhanced Internal Email (Staff/MedRep)
  const internalEmailPayload = {
    to: orderData.medrep_email || 'medrep@getmeds.ph',
    subject: `[GetMeds] Order ${orderData.getmeds_order_id || ''} — ${eventType}`,
    body: message,
    order_id: orderData.getmeds_order_id || 'N/A',
    customer_name: orderData.customer_name || 'N/A',
    order_total: orderData.total_amount ? `PHP ${Number(orderData.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : undefined,
    status: orderData.status || 'N/A',
    next_action_required: nextAction,
    action_link: `${appBaseUrl}/orders/${orderIdentifier}`,
    timestamp: now,
    triggered_by: triggeredBy
  };
  console.log('[EMAIL_LOG]', JSON.stringify(internalEmailPayload, null, 2));

  // 2b. Customer-Facing Email Variant (Conditional on customer-relevant events)
  const customerFacingEvents = ['ORDER_SUBMITTED', 'PAYMENT_VERIFIED', 'ORDER_DISPATCHED', 'ORDER_COMPLETED'];
  if (customerFacingEvents.includes(eventType) && orderData.customer_name) {
    let customerStatus = 'Processing';
    let customerMessage = `Thank you for your order! Your GetMeds order ${orderData.getmeds_order_id || ''} is being prepared by our pharmacy team.`;

    if (eventType === 'PAYMENT_VERIFIED') {
      customerStatus = 'Payment Confirmed';
      customerMessage = `Your payment for order ${orderData.getmeds_order_id || ''} has been confirmed. Your medicines will now be prepared for delivery.`;
    } else if (eventType === 'ORDER_DISPATCHED' || eventType === 'ORDER_COMPLETED') {
      customerStatus = 'Dispatched';
      customerMessage = orderData.tracking_number
        ? `Your order is on the way! Courier: ${orderData.courier || 'Express'}, Tracking Number: ${orderData.tracking_number}.`
        : `Your order has been packed and handed over to our delivery partner.`;
    }

    const customerEmailPayload = {
      recipient_type: 'customer',
      to: orderData.customer_email || `patient.${orderData.customer_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
      subject: `GetMeds Order Update: ${orderData.getmeds_order_id || ''} — ${customerStatus}`,
      body: customerMessage,
      order_id: orderData.getmeds_order_id || 'N/A',
      customer_name: orderData.customer_name,
      status: customerStatus,
      tracking_details: orderData.tracking_number ? {
        courier: orderData.courier,
        tracking_number: orderData.tracking_number
      } : undefined,
      timestamp: now
    };
    console.log('[CUSTOMER_EMAIL_LOG]', JSON.stringify(customerEmailPayload, null, 2));
  }

  // 3. Simulated Google Chat Log (log the full card payload structure with CTA button)

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
          { keyValue: { topLabel: 'Triggered By', content: triggeredBy } },
          { keyValue: { topLabel: 'Message', content: message } },
          { keyValue: { topLabel: 'Timestamp', content: now } },
          {
            buttons: [
              {
                textButton: {
                  text: 'VIEW IN GETMEDS',
                  onClick: {
                    openLink: {
                      url: `${appBaseUrl}/orders/${orderIdentifier}`
                    }
                  }
                }
              }
            ]
          }
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

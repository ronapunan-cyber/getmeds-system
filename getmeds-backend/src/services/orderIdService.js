const db = require('../db/database');

/**
 * Generates a unique Getmeds Order ID in format GM-YYYYMMDD-XXXX
 * Uses DB sequence for the day to ensure uniqueness.
 */
function generateOrderId() {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `GM-${yyyymmdd}-`;

  // Find the highest sequence for today
  const row = db.prepare(
    `SELECT getmeds_order_id FROM orders WHERE getmeds_order_id LIKE ? ORDER BY getmeds_order_id DESC LIMIT 1`
  ).get(`${prefix}%`);

  let seq = 1;
  if (row) {
    const lastSeq = parseInt(row.getmeds_order_id.split('-')[2], 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
}

module.exports = { generateOrderId };

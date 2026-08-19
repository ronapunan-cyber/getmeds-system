/**
 * Zoho Mock Integration
 * Mirrors the real Zoho Books API shape for POST /salesorders.
 * In production, set ZOHO_CLIENT_ID etc in .env to use the real API.
 */

function createSalesOrderMock(orderData) {
  const soNumber = `SO-${Math.floor(Math.random() * 90000 + 10000)}`;
  const soId = `MOCK-SO-${Date.now()}`;

  // Log what would be sent to real Zoho
  const zohoPayload = {
    _endpoint: 'POST https://www.zohoapis.com/books/v3/salesorders?organization_id={ZOHO_ORG_ID}',
    _auth: 'Bearer {ZOHO_ACCESS_TOKEN} (obtained via OAuth2 refresh_token grant)',
    _note: 'Mock mode active. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID in .env for live integration.',
    body: {
      customer_id: `{zoho_customer_id_for:${orderData.customer_name}}`,
      salesorder_number: soNumber,
      date: new Date().toISOString().slice(0, 10),
      reference_number: orderData.getmeds_order_id,
      notes: `GetMeds Order: ${orderData.getmeds_order_id}`,
      line_items: (orderData.items || []).map(item => ({
        item_id: `{zoho_item_id_for_sku:${item.sku}}`,
        name: item.name,
        quantity: item.quantity,
        rate: item.unit_price,
        amount: item.subtotal
      })),
      shipping_address: {
        address: orderData.delivery_address
      }
    }
  };

  console.log('[ZOHO_MOCK] Would POST to Zoho Books API:', JSON.stringify(zohoPayload, null, 2));

  // Return mock Zoho response mirroring real API shape
  return {
    code: 0,
    message: 'Sales order created successfully [MOCK MODE]',
    salesorder: {
      salesorder_id: soId,
      salesorder_number: soNumber,
      status: 'draft',
      customer_name: orderData.customer_name,
      total: orderData.total_amount,
      reference_number: orderData.getmeds_order_id,
      created_time: new Date().toISOString(),
      _mock: true
    }
  };
}

module.exports = { createSalesOrderMock };

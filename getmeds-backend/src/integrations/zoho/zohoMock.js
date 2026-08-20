/**
 * Zoho Mock Integration
 * Mirrors the real Zoho Books API shape for POST /salesorders.
 * In production, set ZOHO_CLIENT_ID etc in .env to use the real API.
 */

function createSalesOrderMock(orderData) {
  // In production, Zoho Books auto-generates sequential SO numbers (e.g. SO-00001).
  // In mock mode, we generate one for the returned API response.
  const soNumber = `SO-${Math.floor(Math.random() * 90000 + 10000)}`;
  const soId = `MOCK-SO-${Date.now()}`;

  const isCredit = orderData.customer_type === 'credit' || orderData.customer_master_type === 'credit';
  const customerTypeLabel = isCredit ? 'Credit Customer' : 'Non-Credit Patient';
  const paymentStatusLabel = isCredit ? 'Credit Terms (Auto-approved)' : 'Pending Finance Verification';

  // Log what would be sent to real Zoho
  // Note: salesorder_number is omitted from the request body to let Zoho auto-generate it.
  const zohoPayload = {
    _endpoint: 'POST https://www.zohoapis.com/books/v3/salesorders?organization_id={ZOHO_ORG_ID}',
    _auth: 'Bearer {ZOHO_ACCESS_TOKEN} (obtained via OAuth2 refresh_token grant)',
    _note: 'Mock mode active. salesorder_number is omitted in request body so Zoho auto-generates sequential SO numbers. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID in .env for live integration.',
    body: {
      customer_id: `{zoho_customer_id_for:${orderData.customer_name}}`,
      date: new Date().toISOString().slice(0, 10),
      reference_number: orderData.getmeds_order_id,
      notes: `GetMeds Order: ${orderData.getmeds_order_id}`,
      custom_fields: [
        {
          label: 'GetMeds Customer Type',
          value: customerTypeLabel
        },
        {
          label: 'Payment Status',
          value: paymentStatusLabel
        }
      ],
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

  // Return mock Zoho response mirroring real API shape (capturing Zoho's auto-generated SO Number and ID)
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
      custom_fields: zohoPayload.body.custom_fields,
      created_time: new Date().toISOString(),
      _mock: true
    }
  };
}

module.exports = { createSalesOrderMock };

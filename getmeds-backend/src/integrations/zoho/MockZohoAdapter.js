const ZohoAdapter = require('./ZohoAdapter');
const { items, contacts } = require('./fixtures');

/**
 * MockZohoAdapter — pure in-memory, zero network calls, zero external
 * dependency. This is the default and the safest possible mode: it is
 * physically incapable of touching any real Zoho organization because it
 * never opens a socket.
 *
 * Behavior mirrors the real Zoho Books/Inventory API response shape so
 * that controller code written against this adapter needs no changes to
 * run against LiveZohoAdapter later. Deterministic IDs (a counter, not
 * Date.now()/Math.random()) so tests and demo recordings are reproducible
 * run to run.
 */
class MockZohoAdapter extends ZohoAdapter {
  constructor({ seedItems = items, seedContacts = contacts, log = console.log } = {}) {
    super();
    this._log = log;
    this._items = new Map(seedItems.map((i) => [i.item_id, { ...i }]));
    this._contacts = new Map(seedContacts.map((c) => [c.contact_id, { ...c }]));
    this._salesOrders = new Map();
    this._soCounter = 1;
    this._simulatedOutage = false;
  }

  get mode() {
    return 'mock';
  }

  /** Test Mode uses this to demo "Zoho is down" without touching any network. */
  setSimulatedOutage(enabled) {
    this._simulatedOutage = !!enabled;
    this._log(`[ZOHO_MOCK] Simulated outage ${this._simulatedOutage ? 'ENABLED — createSalesOrder will reject' : 'disabled'}`);
  }

  isSimulatedOutage() {
    return !!this._simulatedOutage;
  }

  _nextSalesOrderId() {
    const n = this._soCounter++;
    return {
      salesorder_id: `MOCK-SO-${String(n).padStart(6, '0')}`,
      salesorder_number: `SO-${String(n).padStart(5, '0')}`
    };
  }

  async findOrCreateContact(customerData) {
    const existing = [...this._contacts.values()].find(
      (c) => c.contact_name === customerData.customer_name
    );
    if (existing) {
      return { code: 0, message: 'success', contact: existing };
    }
    const contact = {
      contact_id: `MOCK-CONTACT-${this._contacts.size + 1}`,
      contact_name: customerData.customer_name,
      company_name: customerData.customer_name,
      contact_type: 'customer',
      customer_sub_type: customerData.customer_master_type === 'credit' ? 'business' : 'individual',
      getmeds_customer_type: customerData.customer_type || customerData.customer_master_type || 'direct'
    };
    this._contacts.set(contact.contact_id, contact);
    this._log('[ZOHO_MOCK] Created contact:', contact.contact_id, contact.contact_name);
    return { code: 0, message: 'success', contact };
  }

  async createSalesOrder(orderData) {
    if (this._simulatedOutage) {
      throw new Error('Simulated Zoho API outage (Test Mode) — createSalesOrder rejected on purpose.');
    }

    const { salesorder_id, salesorder_number } = this._nextSalesOrderId();
    const isCredit =
      orderData.customer_type === 'credit' || orderData.customer_master_type === 'credit';
    const customerTypeLabel = isCredit ? 'Credit Customer' : 'Non-Credit Patient';
    const paymentStatusLabel = isCredit
      ? 'Credit Terms (Auto-approved)'
      : 'Pending Finance Verification';

    // Mirrors the real request body shape (organization_id + auth would be
    // added by LiveZohoAdapter; here we just log what *would* be sent).
    this._log('[ZOHO_MOCK] Would POST /inventory/v1/salesorders:', {
      customer_name: orderData.customer_name,
      reference_number: orderData.getmeds_order_id,
      line_items: (orderData.items || []).map((i) => ({ sku: i.sku, quantity: i.quantity }))
    });

    const salesorder = {
      salesorder_id,
      salesorder_number,
      status: 'draft',
      customer_name: orderData.customer_name,
      total: orderData.total_amount,
      reference_number: orderData.getmeds_order_id,
      date: new Date().toISOString().slice(0, 10),
      line_items: (orderData.items || []).map((item) => ({
        item_id: `MOCK-ITEM-${item.sku}`,
        name: item.name,
        quantity: item.quantity,
        rate: item.unit_price,
        item_total: item.subtotal
      })),
      custom_fields: [
        { label: 'GetMeds Customer Type', value: customerTypeLabel },
        { label: 'Payment Status', value: paymentStatusLabel }
      ],
      created_time: new Date().toISOString(),
      _mock: true
    };

    this._salesOrders.set(salesorder_id, salesorder);
    return { code: 0, message: 'Sales order created successfully [MOCK MODE]', salesorder };
  }

  async getSalesOrder(salesorderId) {
    const salesorder = this._salesOrders.get(salesorderId);
    if (!salesorder) {
      return { code: 4, message: `The Sales Order ID given seems to be incorrect. [MOCK MODE]` };
    }
    return { code: 0, message: 'success', salesorder };
  }

  async listSalesOrders() {
    return { code: 0, message: 'success', salesorders: [...this._salesOrders.values()] };
  }

  async listContacts() {
    return { code: 0, message: 'success', contacts: [...this._contacts.values()] };
  }

  async listItems() {
    return { code: 0, message: 'success', items: [...this._items.values()] };
  }
}

module.exports = MockZohoAdapter;

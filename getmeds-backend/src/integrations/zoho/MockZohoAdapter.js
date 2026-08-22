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
        { label: 'Getmeds Customer Type', value: customerTypeLabel },
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

  async createItem(itemData) {
    const itemId = `MOCK-ITEM-${itemData.sku || this._items.size + 1}`;
    const item = {
      item_id: itemId,
      name: itemData.name,
      sku: itemData.sku,
      rate: itemData.rate ?? itemData.unit_price ?? 0,
      stock_on_hand: itemData.initial_stock ?? itemData.stock ?? 0,
      unit: itemData.unit || 'pc',
      status: 'active',
      _mock: true
    };
    this._items.set(itemId, item);
    this._log('[ZOHO_MOCK] Created item:', itemId, item.name);
    return { code: 0, message: 'Item created successfully [MOCK MODE]', item };
  }

  async findOrCreateItem(productData) {
    const existing = [...this._items.values()].find(
      (i) => (productData.sku && i.sku === productData.sku) || i.name === productData.name
    );
    if (existing) {
      return { code: 0, message: 'success', item: existing };
    }
    return this.createItem(productData);
  }

  async adjustStock({ itemId, sku, quantityAdjusted, reason = 'Mock adjustment' }) {
    let item = itemId ? this._items.get(itemId) : null;
    if (!item && sku) {
      item = [...this._items.values()].find((i) => i.sku === sku);
    }
    if (!item) {
      throw new Error(`[ZOHO_MOCK] Item not found for adjustStock (itemId=${itemId}, sku=${sku})`);
    }

    item.stock_on_hand = Math.max(0, (item.stock_on_hand || 0) + quantityAdjusted);
    this._log(`[ZOHO_MOCK] Adjusted stock for ${item.sku}: delta=${quantityAdjusted}, new stock=${item.stock_on_hand}`);
    return {
      code: 0,
      message: 'Inventory adjusted successfully [MOCK MODE]',
      inventory_adjustment: {
        inventory_adjustment_id: `MOCK-ADJ-${Date.now()}`,
        reason,
        quantity_adjusted: quantityAdjusted,
        line_items: [{ item_id: item.item_id, sku: item.sku, quantity_adjusted: quantityAdjusted }]
      }
    };
  }

  async confirmSalesOrder(salesorderId) {
    const so = this._salesOrders.get(salesorderId);
    if (so) {
      so.status = 'confirmed';
      this._log('[ZOHO_MOCK] Confirmed sales order:', salesorderId);
    }
    return { code: 0, message: 'Sales order status has been changed to Confirmed. [MOCK MODE]' };
  }

  async packSalesOrder(salesorderId) {
    const so = this._salesOrders.get(salesorderId);
    if (so) {
      so.status = 'confirmed';
      so.package_status = 'packed';
      this._log('[ZOHO_MOCK] Packed sales order:', salesorderId);
    }
    return { code: 0, message: 'Package created successfully [MOCK MODE]', package: { package_id: `MOCK-PKG-${Date.now()}` } };
  }

  async shipSalesOrder({ salesorderId, trackingNumber, courier }) {
    const so = this._salesOrders.get(salesorderId);
    if (so) {
      so.status = 'shipped';
      so.shipped_status = 'shipped';
      so.tracking_number = trackingNumber;
      this._log(`[ZOHO_MOCK] Shipped sales order ${salesorderId}: ${courier} ${trackingNumber}`);
    }
    return { code: 0, message: 'Shipment Order Created Successfully. [MOCK MODE]' };
  }

  async addOrderComment(salesorderId, commentText) {
    this._log(`[ZOHO_MOCK] Added comment to ${salesorderId}: ${commentText}`);
    return { code: 0, message: 'Comments added. [MOCK MODE]' };
  }
}

module.exports = MockZohoAdapter;

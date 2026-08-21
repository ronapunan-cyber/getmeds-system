/**
 * ZohoAdapter — the ONLY contract the rest of the app is allowed to talk to.
 *
 * Why this exists:
 *   Controllers should never import a Zoho HTTP client, an OAuth token helper,
 *   or a mock directly. They call `require('./integrations/zoho')` (the
 *   factory in index.js) and get back an object shaped like this class.
 *   That means swapping mock <-> sandbox <-> live is a one-line env change,
 *   never a code change, and it means every implementation is forced to
 *   expose the exact same, deliberately small, surface.
 *
 * Safety-by-design:
 *   There is NO delete, void, bulk-delete, or write-off method on this
 *   contract — on purpose. GetMeds' order automation never needs to delete
 *   or void anything in Zoho; it only ever creates and reads sales orders,
 *   contacts, and items. Because the interface itself doesn't declare those
 *   destructive methods, no implementation (mock, sandbox, or live) can be
 *   called to do them through this adapter, and no future controller code
 *   can accidentally reach for `zoho.deleteSalesOrder(...)` — it simply
 *   doesn't exist. If a real destructive Zoho operation is ever genuinely
 *   needed, that should be a deliberate, reviewed addition to this file,
 *   not an ad-hoc call from a controller.
 *
 * Every method here mirrors the real Zoho Books/Inventory REST API's
 * request/response shape (see MockZohoAdapter.js and mock-server/ for the
 * exact field names), so code written against the mock needs zero changes
 * to run against the live API later.
 */
class ZohoAdapter {
  /** @returns {string} 'mock' | 'http-mock' | 'live' — for logging/audit only, never branch app logic on this. */
  get mode() {
    throw new Error('ZohoAdapter.mode must be implemented by subclass');
  }

  /**
   * Create a Sales Order.
   * @param {object} orderData - {getmeds_order_id, customer_name, customer_type,
   *   customer_master_type, total_amount, delivery_address, items: [{sku, name, quantity, unit_price, subtotal}]}
   * @returns {Promise<{code:number, message:string, salesorder:object}>}
   */
  async createSalesOrder(orderData) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{code:number, message:string, salesorder:object}>} */
  async getSalesOrder(salesorderId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{code:number, message:string, salesorders:object[]}>} */
  async listSalesOrders(params = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Look up (or lazily create) the Zoho contact_id for a GetMeds customer.
   * Read-mostly by design — order automation needs a contact_id to attach
   * to a sales order, it does not need to edit or delete customer records.
   * @returns {Promise<{code:number, message:string, contact:object}>}
   */
  async findOrCreateContact(customerData) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{code:number, message:string, contacts:object[]}>} */
  async listContacts(params = {}) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{code:number, message:string, items:object[]}>} */
  async listItems(params = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Toggle a simulated outage, for demoing "Zoho is down" on demand
   * (Test Mode only calls this). Meaningful only for MockZohoAdapter — the
   * base implementation is a no-op so calling this against LiveZohoAdapter
   * (which already fails naturally if the real API is unreachable) never
   * throws or does anything surprising.
   * @param {boolean} enabled
   */
  setSimulatedOutage(enabled) {
    // no-op by default
  }

  /** @returns {boolean} */
  isSimulatedOutage() {
    return false;
  }
}

module.exports = ZohoAdapter;

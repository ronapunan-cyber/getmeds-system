const ZohoAdapter = require('./ZohoAdapter');

/**
 * LiveZohoAdapter — makes real HTTP calls, using the built-in global
 * `fetch` (Node 18+, no new dependency added to package.json).
 *
 * "Live" is a loaded word here on purpose: this class doesn't know or care
 * whether `baseUrl` points at the real Zoho API, an isolated test/sandbox
 * Zoho organization, or the local mock-server/ in this same repo — it just
 * makes the HTTP calls the ZohoAdapter contract promises. That's what lets
 * the SAME code path be exercised safely in "http-mock" mode (baseUrl =
 * http://127.0.0.1:4100, a fake org) and later, deliberately, in a real
 * mode (baseUrl = https://www.zohoapis.com/inventory/v1, a real org) —
 * see index.js for how mode selects baseUrl and org id.
 *
 * Guardrails baked into this class (in addition to the factory's checks in
 * index.js, so there's no single point of failure):
 *  - organizationId is validated against `allowedOrgIds` on every single
 *    call, not just at construction — a config that mutates at runtime
 *    can't silently widen scope.
 *  - No delete/void/write-off methods exist here at all (see ZohoAdapter.js
 *    for why) — there is no code path in this class that can issue a
 *    destructive Zoho call.
 *  - Every outbound request is logged (method, path, org id) before it is
 *    sent, satisfying the project's audit-trail requirement independently
 *    of whatever the caller logs.
 */
class LiveZohoAdapter extends ZohoAdapter {
  constructor({
    baseUrl,
    organizationId,
    allowedOrgIds,
    getAccessToken,
    modeLabel = 'live',
    log = console.log
  }) {
    super();
    if (!baseUrl) throw new Error('LiveZohoAdapter requires baseUrl');
    if (!organizationId) throw new Error('LiveZohoAdapter requires organizationId');
    if (!Array.isArray(allowedOrgIds) || allowedOrgIds.length === 0) {
      throw new Error('LiveZohoAdapter requires a non-empty allowedOrgIds allowlist');
    }
    if (!allowedOrgIds.includes(organizationId)) {
      throw new Error(
        `Refusing to construct LiveZohoAdapter: organization_id "${organizationId}" is not in ` +
          `ZOHO_ALLOWED_ORG_IDS (${allowedOrgIds.join(', ')}). This is a fail-closed safety check — ` +
          `add the org id to the allowlist only after you've confirmed it is the intended test/sandbox org.`
      );
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.organizationId = organizationId;
    this.allowedOrgIds = allowedOrgIds;
    this.getAccessToken = getAccessToken || (async () => {
      throw new Error(
        'No getAccessToken() provided to LiveZohoAdapter — set ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN ' +
          'and wire up OAuth token refresh before using live mode.'
      );
    });
    this._modeLabel = modeLabel;
    this._log = log;
  }

  get mode() {
    return this._modeLabel;
  }

  _assertOrgAllowed() {
    if (!this.allowedOrgIds.includes(this.organizationId)) {
      throw new Error(`organization_id "${this.organizationId}" is no longer in the allowlist — aborting call.`);
    }
  }

  async _request(method, path, { query = {}, body } = {}) {
    this._assertOrgAllowed();
    const params = new URLSearchParams({ organization_id: this.organizationId, ...query });
    const url = `${this.baseUrl}${path}?${params.toString()}`;
    this._log(`[ZOHO_${this._modeLabel.toUpperCase()}] ${method} ${path} (org=${this.organizationId})`);

    const token = await this.getAccessToken();
    const resp = await fetch(url, {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const err = new Error(json.message || `Zoho API error (HTTP ${resp.status})`);
      err.zohoResponse = json;
      err.httpStatus = resp.status;
      throw err;
    }
    return json;
  }

  async findOrCreateContact(customerData) {
    const existing = await this._request('GET', '/contacts', {
      query: { contact_name_contains: customerData.customer_name }
    });
    if (existing.contacts && existing.contacts.length > 0) {
      return { code: 0, message: 'success', contact: existing.contacts[0] };
    }
    const created = await this._request('POST', '/contacts', {
      body: {
        contact_name: customerData.customer_name,
        contact_type: 'customer',
        customer_sub_type: customerData.customer_master_type === 'credit' ? 'business' : 'individual'
      }
    });
    return { code: 0, message: 'success', contact: created.contact };
  }

  async createSalesOrder(orderData) {
    const contactResult = await this.findOrCreateContact(orderData);
    const body = {
      customer_id: contactResult.contact.contact_id,
      date: new Date().toISOString().slice(0, 10),
      reference_number: orderData.getmeds_order_id,
      notes: `GetMeds Order: ${orderData.getmeds_order_id}`,
      line_items: (orderData.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        rate: item.unit_price
      }))
    };
    const result = await this._request('POST', '/salesorders', { body });
    return { code: 0, message: 'Sales order created successfully', salesorder: result.salesorder };
  }

  async getSalesOrder(salesorderId) {
    const result = await this._request('GET', `/salesorders/${salesorderId}`);
    return { code: 0, message: 'success', salesorder: result.salesorder };
  }

  async listSalesOrders(params = {}) {
    const result = await this._request('GET', '/salesorders', { query: params });
    return { code: 0, message: 'success', salesorders: result.salesorders || [] };
  }

  async listContacts(params = {}) {
    const result = await this._request('GET', '/contacts', { query: params });
    return { code: 0, message: 'success', contacts: result.contacts || [] };
  }

  async listItems(params = {}) {
    const result = await this._request('GET', '/items', { query: params });
    return { code: 0, message: 'success', items: result.items || [] };
  }
}

module.exports = LiveZohoAdapter;

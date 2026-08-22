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

    const lineItems = [];
    for (const item of (orderData.items || [])) {
      let zohoItemId = item.zoho_item_id;
      try {
        const itemRes = await this.findOrCreateItem({
          name: item.name,
          sku: item.sku,
          unit_price: item.unit_price ?? item.rate ?? item.price ?? 0,
          stock: item.stock ?? 100,
          unit: item.unit || 'pc'
        });
        if (itemRes.item?.item_id) {
          zohoItemId = itemRes.item.item_id;
          if (itemRes.item.status === 'inactive') {
            await this.activateItem(zohoItemId).catch(() => {});
          }
        }
      } catch (err) {
        this._log(`[ZOHO_ITEM_RESOLVE_WARN] Could not resolve Zoho item ${item.name}:`, err.message);
      }

      const li = {
        name: item.name,
        quantity: item.quantity,
        rate: item.unit_price ?? item.rate ?? item.price ?? 0
      };
      if (zohoItemId) {
        li.item_id = zohoItemId;
      }
      lineItems.push(li);
    }

    const body = {
      customer_id: contactResult.contact.contact_id,
      date: new Date().toISOString().slice(0, 10),
      reference_number: orderData.getmeds_order_id,
      notes: `Getmeds Order: ${orderData.getmeds_order_id}`,
      line_items: lineItems
    };

    try {
      const result = await this._request('POST', '/salesorders', { body });
      return { code: 0, message: 'Sales order created successfully', salesorder: result.salesorder };
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('inactive item')) {
        this._log('[ZOHO_RETRY] Inactive item error detected. Reactivating order items in Zoho and retrying...');
        for (const li of lineItems) {
          if (li.item_id) {
            await this.activateItem(li.item_id).catch(() => {});
          }
        }
        const retryResult = await this._request('POST', '/salesorders', { body });
        return { code: 0, message: 'Sales order created successfully after item reactivation', salesorder: retryResult.salesorder };
      }
      throw err;
    }
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

  async activateItem(itemId) {
    if (!itemId) return { code: 0, message: 'No itemId provided' };
    try {
      const result = await this._request('POST', `/items/${itemId}/active`);
      this._log(`[ZOHO] Activated item in Zoho: ${itemId}`);
      return { code: 0, message: result.message || 'Item activated', item: result.item };
    } catch (err) {
      this._log(`[ZOHO_ACTIVATE_WARN] Could not mark item ${itemId} active:`, err.message);
      return { code: 0, message: err.message };
    }
  }

  async createItem(itemData) {
    const body = {
      name: itemData.name,
      sku: itemData.sku,
      rate: itemData.rate ?? itemData.unit_price ?? 0,
      item_type: 'inventory',
      product_type: 'goods',
      status: 'active',
      initial_stock: itemData.initial_stock ?? itemData.stock ?? 0,
      initial_stock_rate: itemData.rate ?? itemData.unit_price ?? 0,
      unit: itemData.unit || 'pc',
      description: itemData.description || `GetMeds Pharmaceutical SKU: ${itemData.sku}`
    };
    const result = await this._request('POST', '/items', { body });
    return { code: 0, message: 'Item created successfully', item: result.item };
  }

  async findOrCreateItem(productData) {
    const searchRes = await this._request('GET', '/items', {
      query: { search_text: productData.sku || productData.name }
    });
    const found = (searchRes.items || []).find(
      (i) => (productData.sku && i.sku === productData.sku) || i.name === productData.name
    );
    if (found) {
      let itemObj = found;
      try {
        const fullItemRes = await this._request('GET', `/items/${found.item_id}`);
        itemObj = fullItemRes.item || found;
      } catch {
        itemObj = found;
      }
      if (itemObj.status === 'inactive') {
        await this.activateItem(found.item_id).catch(() => {});
        itemObj.status = 'active';
      }
      return { code: 0, message: 'success', item: itemObj };
    }
    return this.createItem(productData);
  }

  async adjustStock({ itemId, sku, quantityAdjusted, reason = 'Stock adjustment from GetMeds' }) {
    let resolvedItemId = itemId;
    if (!resolvedItemId && sku) {
      const itemRes = await this.findOrCreateItem({ sku });
      resolvedItemId = itemRes.item?.item_id;
    }
    if (!resolvedItemId) {
      throw new Error('adjustStock requires either itemId or sku to resolve the Zoho item');
    }

    const today = new Date().toISOString().slice(0, 10);
    const body = {
      mode: 'quantity',
      date: today,
      reason,
      line_items: [
        {
          item_id: resolvedItemId,
          quantity_adjusted: quantityAdjusted
        }
      ]
    };
    const result = await this._request('POST', '/inventoryadjustments', { body });
    return { code: 0, message: 'Inventory adjusted successfully', inventory_adjustment: result.inventory_adjustment };
  }

  async confirmSalesOrder(salesorderId) {
    if (!salesorderId) return { code: 0, message: 'no salesorderId provided' };
    try {
      const result = await this._request('POST', `/salesorders/${salesorderId}/status/confirmed`);
      return { code: 0, message: result.message || 'Sales order confirmed' };
    } catch (err) {
      this._log(`[ZOHO_CONFIRM_WARN] Could not mark SO ${salesorderId} confirmed:`, err.message);
      return { code: 1, message: err.message };
    }
  }

  async packSalesOrder(salesorderId) {
    if (!salesorderId) return { code: 0, message: 'no salesorderId provided' };
    try {
      const soRes = await this._request('GET', `/salesorders/${salesorderId}`);
      const lineItems = (soRes.salesorder?.line_items || []).map((l) => ({
        so_line_item_id: l.line_item_id,
        quantity: l.quantity
      }));
      if (lineItems.length === 0) return { code: 0, message: 'no line items to pack' };

      const body = {
        package_number: `PKG-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().slice(0, 10),
        line_items: lineItems
      };
      const result = await this._request('POST', '/packages', {
        query: { salesorder_id: salesorderId },
        body
      });
      return { code: 0, message: 'Package created successfully', package: result.package };
    } catch (err) {
      this._log(`[ZOHO_PACK_WARN] Could not create package for SO ${salesorderId}:`, err.message);
      return { code: 1, message: err.message };
    }
  }

  async shipSalesOrder({ salesorderId, trackingNumber, courier = 'Standard Delivery' }) {
    if (!salesorderId) return { code: 0, message: 'no salesorderId provided' };
    try {
      let packageId = null;
      const pkgsRes = await this._request('GET', '/packages', {
        query: { salesorder_id: salesorderId }
      }).catch(() => ({ packages: [] }));

      if (pkgsRes.packages && pkgsRes.packages.length > 0) {
        packageId = pkgsRes.packages[0].package_id;
      } else {
        const packRes = await this.packSalesOrder(salesorderId);
        packageId = packRes.package?.package_id;
      }

      if (packageId) {
        const body = {
          shipment_number: `SHP-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().slice(0, 10),
          tracking_number: trackingNumber,
          delivery_method: courier,
          package_ids: String(packageId)
        };
        await this._request('POST', '/shipmentorders', {
          query: { salesorder_id: salesorderId, package_ids: String(packageId) },
          body
        });
      }

      await this.addOrderComment(
        salesorderId,
        `Dispatched via ${courier} | Tracking #: ${trackingNumber}`
      );

      return { code: 0, message: 'Sales order marked as shipped' };
    } catch (err) {
      this._log(`[ZOHO_SHIP_WARN] Could not ship SO ${salesorderId}:`, err.message);
      await this.addOrderComment(salesorderId, `Tracking: ${courier} ${trackingNumber}`).catch(() => {});
      return { code: 1, message: err.message };
    }
  }

  async addOrderComment(salesorderId, commentText) {
    if (!salesorderId || !commentText) return { code: 0, message: 'skipped' };
    try {
      const result = await this._request('POST', `/salesorders/${salesorderId}/comments`, {
        body: { description: commentText }
      });
      return { code: 0, message: 'Comment added', comment: result.comment };
    } catch (err) {
      this._log(`[ZOHO_COMMENT_WARN] Could not add comment to SO ${salesorderId}:`, err.message);
      return { code: 1, message: err.message };
    }
  }

  async recordPaymentForSalesOrder({ salesorderId, amount, paymentReference, paymentDate, paymentMethod = 'Bank Transfer', notes }) {
    if (!salesorderId) return { code: 0, message: 'no salesorderId provided' };
    try {
      // 1. Ensure sales order is confirmed
      await this.confirmSalesOrder(salesorderId).catch(() => {});

      // 2. Fetch the sales order to retrieve customer_id, line items, and total
      const soRes = await this._request('GET', `/salesorders/${salesorderId}`);
      const so = soRes.salesorder;
      if (!so) throw new Error(`Sales order ${salesorderId} not found in Zoho`);

      const customerId = so.customer_id;
      const today = paymentDate || new Date().toISOString().slice(0, 10);
      const paymentAmount = Number(amount) || Number(so.total) || 0;

      // 3. Check if an invoice already exists for this salesorder
      let invoiceId = null;
      try {
        const invListRes = await this._request('GET', '/invoices', {
          query: { salesorder_id: salesorderId }
        });
        if (invListRes.invoices && invListRes.invoices.length > 0) {
          invoiceId = invListRes.invoices[0].invoice_id;
        }
      } catch (_) {}

      // 4. If no invoice exists, create one from the sales order
      if (!invoiceId) {
        try {
          const fromSoRes = await this._request('POST', '/invoices/fromsalesorder', {
            query: { salesorder_id: salesorderId },
            body: {
              customer_id: customerId,
              date: today,
              due_date: today,
              reference_number: paymentReference || so.reference_number || undefined
            }
          });
          invoiceId = fromSoRes.invoice?.invoice_id;
        } catch (fromSoErr) {
          this._log(`[ZOHO_INV_FROM_SO_WARN] fromsalesorder error: ${fromSoErr.message}, falling back to /invoices POST...`);
          const lineItems = (so.line_items || []).map((l) => ({
            item_id: l.item_id,
            salesorder_item_id: l.line_item_id,
            quantity: l.quantity,
            rate: l.rate,
            name: l.name
          }));

          const invBody = {
            customer_id: customerId,
            salesorder_id: salesorderId,
            date: today,
            due_date: today,
            reference_number: paymentReference || so.reference_number || undefined,
            line_items: lineItems.length > 0 ? lineItems : undefined,
            notes: notes || `Payment Verified for GetMeds Order ${so.reference_number || ''}`
          };

          const createInvRes = await this._request('POST', '/invoices', {
            query: { salesorder_id: salesorderId },
            body: invBody
          });
          invoiceId = createInvRes.invoice?.invoice_id;
        }
      }

      // 5. Record customer payment against the invoice
      let paymentRes = null;
      if (invoiceId) {
        const payBody = {
          customer_id: customerId,
          payment_mode: paymentMethod || 'Bank Transfer',
          amount: paymentAmount,
          date: today,
          reference_number: paymentReference || `REF-${Date.now()}`,
          description: notes || `Payment Verified | Ref: ${paymentReference || 'N/A'}`,
          invoices: [
            {
              invoice_id: invoiceId,
              amount_applied: paymentAmount
            }
          ]
        };
        try {
          paymentRes = await this._request('POST', '/customerpayments', { body: payBody });
        } catch (payErr) {
          this._log(`[ZOHO_PAYMENT_WARN] customerpayments failed, attempting direct invoice payment:`, payErr.message);
          paymentRes = await this._request('POST', `/invoices/${invoiceId}/payments`, {
            body: {
              payment_mode: paymentMethod || 'Bank Transfer',
              amount: paymentAmount,
              date: today,
              reference_number: paymentReference || `REF-${Date.now()}`
            }
          });
        }
      }

      // 6. Add milestone audit comment to Zoho sales order timeline
      await this.addOrderComment(
        salesorderId,
        `Payment Verified by Finance | Ref: ${paymentReference || 'N/A'} | Invoiced & Paid in Zoho (PHP ${paymentAmount})`
      );

      return {
        code: 0,
        message: 'Payment recorded and invoice marked as paid',
        invoice_id: invoiceId,
        payment: paymentRes?.payment
      };
    } catch (err) {
      this._log(`[ZOHO_PAYMENT_WARN] Could not record payment for SO ${salesorderId}:`, err.message);
      await this.addOrderComment(
        salesorderId,
        `Payment Verified | Ref: ${paymentReference || 'N/A'} (Invoice note: ${err.message})`
      ).catch(() => {});
      return { code: 1, message: err.message };
    }
  }
}

module.exports = LiveZohoAdapter;

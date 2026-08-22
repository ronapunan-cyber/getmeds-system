const db = require('../db/database');
const zoho = require('../integrations/zoho');

/**
 * GET /api/inventory/status
 * Compare local SQLite stock against live Zoho Inventory stock
 */
async function getInventoryStatus(req, res) {
  try {
    const localProducts = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC').all();
    
    let zohoItems = [];
    let zohoError = null;
    try {
      const zohoRes = await zoho.listItems();
      zohoItems = zohoRes.items || [];
    } catch (err) {
      console.warn('[INVENTORY] Could not fetch live Zoho items:', err.message);
      zohoError = err.message;
    }

    // Build Zoho lookup map by SKU (and lowercase name fallback)
    const zohoMapBySku = new Map();
    const zohoMapByName = new Map();
    for (const item of zohoItems) {
      if (item.sku) zohoMapBySku.set(item.sku.trim(), item);
      if (item.name) zohoMapByName.set(item.name.toLowerCase().trim(), item);
    }

    let syncedCount = 0;
    let mismatchCount = 0;
    let missingInZohoCount = 0;

    const products = localProducts.map((p) => {
      const matchedZoho = zohoMapBySku.get(p.sku) || zohoMapByName.get(p.name.toLowerCase().trim());
      const zohoStock = matchedZoho ? (matchedZoho.stock_on_hand ?? matchedZoho.actual_available_stock ?? 0) : null;
      const zohoItemId = matchedZoho ? matchedZoho.item_id : p.zoho_item_id;

      let syncStatus = 'not_in_zoho';
      if (matchedZoho) {
        if (Number(zohoStock) === Number(p.stock)) {
          syncStatus = 'in_sync';
          syncedCount++;
        } else {
          syncStatus = 'mismatch';
          mismatchCount++;
        }
      } else {
        missingInZohoCount++;
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit_price: p.unit_price,
        unit: p.unit,
        local_stock: p.stock,
        zoho_stock: zohoStock,
        zoho_item_id: zohoItemId,
        last_synced_at: p.last_synced_at,
        sync_status: syncStatus
      };
    });

    res.json({
      success: true,
      data: {
        mode: zoho.mode,
        organization_id: process.env.ZOHO_ORG_ID || 'MOCK-ORG',
        zoho_error: zohoError,
        summary: {
          total_products: products.length,
          in_sync: syncedCount,
          mismatches: mismatchCount,
          not_in_zoho: missingInZohoCount
        },
        products
      }
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/inventory/sync-push
 * Push all local GetMeds products into Zoho Inventory
 */
async function syncPushCatalog(req, res) {
  try {
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
    const results = [];

    const updateStmt = db.prepare('UPDATE products SET zoho_item_id = ?, last_synced_at = datetime(\'now\') WHERE id = ?');

    for (const p of products) {
      try {
        const itemRes = await zoho.findOrCreateItem({
          name: p.name,
          sku: p.sku,
          unit_price: p.unit_price,
          stock: p.stock,
          unit: p.unit
        });

        const zohoItemId = itemRes.item?.item_id;
        if (zohoItemId) {
          updateStmt.run(zohoItemId, p.id);
        }
        results.push({ id: p.id, sku: p.sku, status: 'success', zoho_item_id: zohoItemId });
      } catch (itemErr) {
        console.error(`Failed to push product ${p.sku} to Zoho:`, itemErr.message);
        results.push({ id: p.id, sku: p.sku, status: 'error', error: itemErr.message });
      }
    }

    res.json({
      success: true,
      message: `Pushed ${results.filter(r => r.status === 'success').length} of ${products.length} products to Zoho`,
      data: { results }
    });
  } catch (error) {
    console.error('Error in syncPushCatalog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/inventory/sync-pull
 * Pull stock levels from Zoho Inventory and reconcile local database
 */
async function syncPullStock(req, res) {
  try {
    const zohoRes = await zoho.listItems();
    const zohoItems = zohoRes.items || [];

    const updateStmt = db.prepare(`
      UPDATE products 
      SET stock = ?, zoho_item_id = ?, last_synced_at = datetime('now')
      WHERE sku = ? OR name = ?
    `);

    let updatedCount = 0;
    const updateTx = db.transaction(() => {
      for (const item of zohoItems) {
        const zohoStock = item.stock_on_hand ?? item.actual_available_stock ?? item.initial_stock ?? 0;
        const info = updateStmt.run(zohoStock, item.item_id, item.sku, item.name);
        if (info.changes > 0) {
          updatedCount += info.changes;
        }
      }
    });

    updateTx();

    res.json({
      success: true,
      message: `Successfully updated ${updatedCount} local product stock levels from Zoho`,
      data: { updated_count: updatedCount }
    });
  } catch (error) {
    console.error('Error in syncPullStock:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/inventory/adjust
 * Adjust stock in both GetMeds and Zoho Inventory
 */
async function adjustStock(req, res) {
  try {
    const { product_id, delta, reason } = req.body;
    if (!product_id || delta === undefined || isNaN(delta)) {
      return res.status(400).json({ success: false, message: 'product_id and numeric delta are required' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newStock = product.stock + Number(delta);
    if (newStock < 0) {
      return res.status(400).json({ success: false, message: `Cannot reduce stock below 0 (current: ${product.stock}, delta: ${delta})` });
    }

    // 1. Send live adjustment to Zoho
    let zohoAdjRes = null;
    try {
      zohoAdjRes = await zoho.adjustStock({
        itemId: product.zoho_item_id,
        sku: product.sku,
        quantityAdjusted: Number(delta),
        reason: reason || `Manual adjustment by ${req.user?.name || 'Staff'}`
      });
    } catch (zohoErr) {
      console.warn('[INVENTORY] Zoho adjustment warning:', zohoErr.message);
      // Even if Zoho warns, in demo/offline mode we can proceed or report
    }

    // 2. Update local stock
    db.prepare('UPDATE products SET stock = ?, last_synced_at = datetime(\'now\') WHERE id = ?').run(newStock, product.id);

    res.json({
      success: true,
      message: `Stock updated successfully: ${product.name} is now ${newStock} (${delta > 0 ? '+' : ''}${delta})`,
      data: {
        product_id: product.id,
        old_stock: product.stock,
        new_stock: newStock,
        delta: Number(delta),
        zoho_adjustment: zohoAdjRes?.inventory_adjustment || null
      }
    });
  } catch (error) {
    console.error('Error in adjustStock:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getInventoryStatus,
  syncPushCatalog,
  syncPullStock,
  adjustStock
};

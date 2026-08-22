import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchInventoryStatus,
  syncPushCatalog,
  syncPullStock,
  adjustProductStock
} from '../../api/queries';
import toast from 'react-hot-toast';
import {
  Package,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Plus,
  Minus,
  Sparkles,
  Search,
  Building2
} from 'lucide-react';

const InventoryPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState(10);
  const [adjustReason, setAdjustReason] = useState('Physical Stock Audit / Restock');

  // Fetch Inventory Status
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['inventoryStatus'],
    queryFn: fetchInventoryStatus,
    refetchInterval: 30000 // auto-refresh every 30s
  });

  // Mutations
  const pushMutation = useMutation({
    mutationFn: syncPushCatalog,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventoryStatus'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(res.message || 'Catalog pushed to Zoho successfully', { icon: '🚀' });
    },
    onError: (err) => {
      toast.error(`Push failed: ${err.response?.data?.message || err.message}`);
    }
  });

  const pullMutation = useMutation({
    mutationFn: syncPullStock,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventoryStatus'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(res.message || 'Stock pulled from Zoho successfully', { icon: '🔄' });
    },
    onError: (err) => {
      toast.error(`Pull failed: ${err.response?.data?.message || err.message}`);
    }
  });

  const adjustMutation = useMutation({
    mutationFn: adjustProductStock,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventoryStatus'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(res.message || 'Stock adjusted successfully', { icon: '⚡' });
      setSelectedProduct(null);
    },
    onError: (err) => {
      toast.error(`Adjustment failed: ${err.response?.data?.message || err.message}`);
    }
  });

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    adjustMutation.mutate({
      product_id: selectedProduct.id,
      delta: Number(adjustDelta),
      reason: adjustReason
    });
  };

  const inventoryData = data?.data || {};
  const products = inventoryData.products || [];
  const summary = inventoryData.summary || {};
  const mode = inventoryData.mode || 'mock';
  const orgId = inventoryData.organization_id || '936158981';

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Zoho Live Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-getmeds-blue">
                <Package size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink-primary flex items-center gap-2">
                  Inventory & Zoho Live Synchronization
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    mode === 'live' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {mode === 'live' ? '⚡ Zoho Live API Connected' : `Mode: ${mode}`}
                  </span>
                </h1>
                <p className="text-xs text-ink-secondary mt-0.5 flex items-center gap-2">
                  <span>Linked Organization: <strong className="text-slate-800 font-semibold">{orgId}</strong> (Getmeds Demo Sandbox)</span>
                  <span>•</span>
                  <span>Currency: <strong className="text-slate-800 font-semibold">PHP (₱)</strong></span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Refresh Status
            </button>

            <button
              onClick={() => pullMutation.mutate()}
              disabled={pullMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Fetch live stock_on_hand from Zoho and update GetMeds DB"
            >
              <DownloadCloud size={15} className={pullMutation.isPending ? 'animate-bounce' : ''} />
              {pullMutation.isPending ? 'Pulling from Zoho...' : 'Pull from Zoho'}
            </button>

            <button
              onClick={() => pushMutation.mutate()}
              disabled={pushMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Push all products and quantities to Zoho Inventory"
            >
              <UploadCloud size={15} className={pushMutation.isPending ? 'animate-bounce' : ''} />
              {pushMutation.isPending ? 'Pushing to Zoho...' : 'Push Catalog to Zoho'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Total Catalog Items</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{summary.total_products || 0}</span>
            <span className="text-xs font-medium text-slate-400">Medicines</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">Fully In-Sync</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700">{summary.in_sync || 0}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary.total_products ? Math.round(((summary.in_sync || 0) / summary.total_products) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 block">Stock Discrepancy</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-700">{summary.mismatches || 0}</span>
            <span className="text-xs text-amber-600">Items</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 block">Zoho Integration</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-purple-900 truncate">REST OAuth 2.0</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded uppercase">Active</span>
          </div>
        </div>
      </div>

      {/* Product Comparison & Sync Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or medicine name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-getmeds-blue"
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing <strong>{filteredProducts.length}</strong> items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Medicine / SKU</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4 text-center">GetMeds Stock</th>
                <th className="py-3 px-4 text-center">Zoho Live Stock</th>
                <th className="py-3 px-4">Zoho Item ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-getmeds-blue" />
                    Connecting to Zoho Inventory Sandbox and fetching live stocks...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No products found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSync = p.sync_status === 'in_sync';
                  const isMismatch = p.sync_status === 'mismatch';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">
                        ₱{Number(p.unit_price).toFixed(2)} / {p.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-md font-bold text-xs bg-slate-100 text-slate-800">
                          {p.local_stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.zoho_stock !== null ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs ${
                              isSync
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-300 font-black'
                            }`}
                          >
                            {p.zoho_stock} {p.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not created</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {p.zoho_item_id ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {p.zoho_item_id}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isSync && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={12} /> In Sync
                          </span>
                        )}
                        {isMismatch && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            <AlertCircle size={12} /> Diff (Δ {p.zoho_stock - p.local_stock})
                          </span>
                        )}
                        {p.sync_status === 'not_in_zoho' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Not in Zoho
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustDelta(10);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                          title="Simulate a live stock adjustment pushed to Zoho"
                        >
                          <ArrowUpDown size={12} /> Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-getmeds-blue">
                  <ArrowUpDown size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Adjust Inventory Level</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedProduct.name} ({selectedProduct.sku})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Current GetMeds Stock:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedProduct.local_stock} {selectedProduct.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Zoho Stock:</span>
                  <span className="font-bold text-emerald-700 text-sm">{selectedProduct.zoho_stock ?? '—'} {selectedProduct.unit}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Quantity Delta (+ to Add, - to Deduct)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((prev) => Number(prev) - 10)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((prev) => Number(prev) - 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    className="w-full text-center py-2 text-sm font-black border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-getmeds-blue"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((prev) => Number(prev) + 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((prev) => Number(prev) + 10)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                  >
                    +10
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  New calculated stock: <strong className="text-slate-800">{selectedProduct.local_stock + Number(adjustDelta || 0)} {selectedProduct.unit}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Adjustment Reason (Logged in Zoho Audit Trail)
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-getmeds-blue"
                >
                  <option value="Physical Stock Audit / Restock">Physical Stock Audit / Restock</option>
                  <option value="Supplier Delivery Batch Received">Supplier Delivery Batch Received</option>
                  <option value="Damaged / Expired Medication Write-off">Damaged / Expired Medication Write-off</option>
                  <option value="Emergency Hospital Re-allocation">Emergency Hospital Re-allocation</option>
                  <option value="Stakeholder Live Integration Demo">Stakeholder Live Integration Demo</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {adjustMutation.isPending ? 'Syncing with Zoho...' : 'Apply & Sync Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;

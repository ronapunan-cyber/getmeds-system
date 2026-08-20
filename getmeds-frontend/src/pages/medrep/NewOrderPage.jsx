import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import { Plus, Trash2, ShoppingCart, CheckCircle, AlertCircle, ArrowLeft, Send, Sparkles } from 'lucide-react';
import { useDebug } from '../../context/DebugContext';

const NewOrderPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isDebug } = useDebug();

  const [customerId, setCustomerId] = useState('');
  const [customerType, setCustomerType] = useState('credit');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => client.get('/api/orders/meta/customers').then(r => r.data)
  });
  const { data: productsRes } = useQuery({
    queryKey: ['products'],
    queryFn: () => client.get('/api/orders/meta/products').then(r => r.data)
  });

  const customers = customersRes?.data?.customers || [];
  const products = productsRes?.data?.products || [];

  const selectedCustomer = customers.find(c => String(c.id) === String(customerId));

  // Auto-set customer type and address when customer changes
  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const c = customers.find(c => String(c.id) === String(id));
    if (c) {
      setCustomerType(c.type);
      if (!deliveryAddress.trim() && c.address) {
        setDeliveryAddress(c.address);
      }
    }
  };

  // Quick auto-fill test sample data when DEBUG mode is enabled
  const handleAutoFill = () => {
    if (!customers.length || !products.length) {
      toast.error('Products or customers not loaded yet');
      return;
    }
    const sampleCustomer = customers[0];
    setCustomerId(sampleCustomer.id);
    setCustomerType(sampleCustomer.type);
    setDeliveryAddress(sampleCustomer.address || 'Unit 402 Medical Arts Bldg, Ermita, Manila');
    setDeliveryNotes('Deliver directly to Pharmacy receiving bay. Call upon arrival.');

    if (products.length >= 2) {
      setItems([
        { product_id: products[0].id, quantity: 10 },
        { product_id: products[1].id, quantity: 5 }
      ]);
    } else {
      setItems([{ product_id: products[0].id, quantity: 10 }]);
    }
    toast.success('⚡ Sample order auto-filled!');
  };

  const addItem = () => setItems([...items, { product_id: '', quantity: 1 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    setItems(updated);
  };

  const getProduct = (id) => products.find(p => String(p.id) === String(id));

  const subtotal = (item) => {
    const p = getProduct(item.product_id);
    return p ? (p.unit_price * (item.quantity || 0)) : 0;
  };

  const total = items.reduce((sum, item) => sum + subtotal(item), 0);

  const mutation = useMutation({
    mutationFn: async () => {
      // Create draft
      const createRes = await client.post('/api/orders', {
        customer_id: parseInt(customerId),
        items: items.filter(i => i.product_id && i.quantity > 0).map(i => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity)
        })),
        delivery_address: deliveryAddress,
        delivery_notes: deliveryNotes,
        customer_type: customerType
      });
      const newOrderId = createRes.data.data.order.id;

      // Submit immediately
      await client.post(`/api/orders/${newOrderId}/submit`);
      return createRes.data.data.order;
    },
    onSuccess: (order) => {
      toast.success(`Order ${order.getmeds_order_id} submitted! Routing: ${order.customer_type === 'direct' ? 'Finance Queue' : 'Dispatch Queue'} 🚀`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['medrep-orders'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit order');
    }
  });

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!customerId) { toast.error('Please select a customer'); return; }
    const validItems = items.filter(i => i.product_id && Number(i.quantity) > 0);
    if (!validItems.length) { toast.error('Add at least one product with quantity greater than 0'); return; }
    if (!deliveryAddress.trim()) { toast.error('Delivery address is required'); return; }
    setIsReviewOpen(true);
  };

  const handleConfirmSubmit = () => {
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Create New Order</h1>
          <p className="text-sm text-ink-secondary mt-1">Submit a new purchase requisition on behalf of a customer.</p>
        </div>
        <div className="flex items-center gap-2">
          {isDebug && (
            <button
              type="button"
              onClick={handleAutoFill}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-2xs"
            >
              <Sparkles size={14} className="text-amber-700" />
              Auto-Fill Sample Data
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-md text-sm text-ink-secondary hover:bg-surface hover:text-ink-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleOpenReview} className="space-y-6">
        {/* Customer */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={customerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-getmeds-blue text-sm"
                required
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'credit' ? '🏦 Credit Account' : '💳 Direct Patient'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-1">Customer Account Type *</label>
              <div className="flex gap-3 mt-2">
                {['credit', 'direct'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={t} checked={customerType === t} onChange={() => setCustomerType(t)} className="accent-getmeds-blue" />
                    <span className="capitalize text-sm font-medium text-ink-primary">{t === 'credit' ? '🏦 Credit Account' : '💳 Direct Patient'}</span>
                  </label>
                ))}
              </div>
              {selectedCustomer && (
                <div className="mt-2 text-xs">
                  {customerType === 'credit' ? (
                    <span className="inline-flex items-center text-pharmacy-green-dark bg-pharmacy-green/15 px-2.5 py-1 rounded border border-pharmacy-green/30 font-medium">
                      ✓ Credit Limit: ₱{Number(selectedCustomer.credit_limit || 0).toLocaleString()} (Dispatches directly to fulfillment)
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-amber-950 bg-state-warning-light px-2.5 py-1 rounded border border-state-warning/40 font-medium">
                      ⚠️ Direct Patient: Requires advance payment verification by Finance before dispatch
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-primary mb-1">Delivery Address *</label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Full delivery address..."
              className="w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-getmeds-blue text-sm"
              required
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-primary mb-1">Delivery Notes</label>
            <textarea
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="Optional delivery instructions..."
              rows={2}
              className="w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-getmeds-blue text-sm"
            />
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink-primary">Order Items</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-getmeds-blue hover:text-getmeds-blue-dark font-semibold">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => {
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-md">
                  <div className="flex-1">
                    <select
                      value={item.product_id}
                      onChange={e => updateItem(i, 'product_id', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue"
                      required
                    >
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — ₱{p.unit_price}/{p.unit}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-getmeds-blue"
                      required
                    />
                  </div>
                  <div className="w-28 text-right text-sm font-semibold text-ink-primary">
                    ₱{subtotal(item).toFixed(2)}
                  </div>
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-ink-secondary">Total Amount</p>
              <p className="text-2xl font-bold text-ink-primary">₱{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/orders')} className="px-4 py-2 border border-slate-200 rounded-md text-sm text-ink-secondary hover:bg-surface hover:text-ink-primary">
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-getmeds-blue text-white rounded-md text-sm font-semibold hover:bg-getmeds-blue-hover shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Review Order
          </button>
        </div>
      </form>

      {/* Final Order Review & Confirmation Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => !mutation.isPending && setIsReviewOpen(false)}
        title="Confirm Order Submission"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p className="text-gray-500 text-xs">
            Please review the final order details below before submitting to the GetMeds workflow.
          </p>

          {/* Customer & Route Details */}
          <div className="bg-gray-50 rounded-lg p-3.5 space-y-2 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Customer:</span>
              <span className="font-semibold text-gray-900">{selectedCustomer?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Customer Type:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                customerType === 'credit' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {customerType === 'credit' ? '🏦 Credit Customer' : '💳 Direct Patient'}
              </span>
            </div>
            <div className="flex justify-between items-start pt-1 border-t border-gray-200">
              <span className="text-xs text-gray-500 font-medium">Delivery Address:</span>
              <span className="font-medium text-gray-800 text-right max-w-[240px] truncate">{deliveryAddress}</span>
            </div>
            {deliveryNotes && (
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-medium">Notes:</span>
                <span className="text-gray-600 text-right max-w-[240px] italic">{deliveryNotes}</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Order Items</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Item</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Price</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.filter(i => i.product_id && Number(i.quantity) > 0).map((item, idx) => {
                    const p = getProduct(item.product_id);
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {p?.name} <span className="text-gray-400">({p?.sku})</span>
                        </td>
                        <td className="px-2 py-2 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">₱{p?.unit_price?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">₱{subtotal(item).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-ink-primary">Total:</td>
                    <td className="px-3 py-2 text-right font-bold text-getmeds-blue text-sm">₱{total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Workflow Routing Banner */}
          {customerType === 'direct' ? (
            <div className="bg-state-warning-light border border-state-warning/30 rounded-lg p-3 flex items-start gap-2 text-amber-950 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-state-warning" />
              <div>
                <strong className="font-semibold text-amber-950">Workflow Route: Finance Queue</strong>
                <p className="mt-0.5 text-amber-900">
                  Because this is a Direct Patient order, it will move to <span className="font-semibold">Waiting for Payment</span> status and be routed to Finance for advance payment verification.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-pharmacy-green/10 border border-pharmacy-green/30 rounded-lg p-3 flex items-start gap-2 text-pharmacy-green-dark text-xs">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-pharmacy-green" />
              <div>
                <strong className="font-semibold text-pharmacy-green-dark">Workflow Route: Dispatch Queue</strong>
                <p className="mt-0.5 text-pharmacy-green-dark/90">
                  Because this is a verified Credit Customer, payment verification is bypassed. The order will be immediately marked <span className="font-semibold">Ready for Dispatch</span>.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setIsReviewOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-md text-xs font-medium text-ink-secondary hover:bg-surface hover:text-ink-primary disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleConfirmSubmit}
              className="flex items-center gap-1.5 px-5 py-2 bg-getmeds-blue text-white rounded-md text-xs font-semibold hover:bg-getmeds-blue-hover disabled:opacity-50 shadow-sm"
            >
              {mutation.isPending ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Confirm & Submit Order
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewOrderPage;

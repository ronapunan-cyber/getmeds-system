import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';

const NewOrderPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [customerType, setCustomerType] = useState('credit');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

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

  // Auto-set customer type when customer changes
  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const c = customers.find(c => String(c.id) === String(id));
    if (c) setCustomerType(c.type);
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
      const orderId = createRes.data.data.order.id;
      // Submit
      const submitRes = await client.post(`/api/orders/${orderId}/submit`);
      return submitRes.data.data.order;
    },
    onSuccess: (order) => {
      toast.success(`Order ${order.getmeds_order_id} submitted successfully!`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit order');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerId) { toast.error('Please select a customer'); return; }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (!validItems.length) { toast.error('Add at least one product'); return; }
    if (!deliveryAddress.trim()) { toast.error('Delivery address is required'); return; }
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a new order. A GetMeds Order ID will be auto-generated.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={customerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type *</label>
              <div className="flex gap-3 mt-2">
                {['credit', 'direct'].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={t} checked={customerType === t} onChange={() => setCustomerType(t)} />
                    <span className="capitalize text-sm font-medium">{t === 'credit' ? '🏦 Credit' : '💳 Direct Patient'}</span>
                  </label>
                ))}
              </div>
              {customerType === 'direct' && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Direct patients require payment verification before dispatch.</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Full delivery address..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
            <textarea
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="Optional delivery instructions..."
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Order Items</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => {
              const p = getProduct(item.product_id);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <select
                      value={item.product_id}
                      onChange={e => updateItem(i, 'product_id', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-28 text-right text-sm font-medium text-gray-700">
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
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₱{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/orders')} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4" />
            {mutation.isPending ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewOrderPage;

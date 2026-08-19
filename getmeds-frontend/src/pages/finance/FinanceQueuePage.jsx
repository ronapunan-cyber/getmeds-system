import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import client from '../../api/client';

const FinanceQueuePage = () => {
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState({ status: 'verified', payment_reference: '', payment_date: '', amount: '', payment_method: 'bank_transfer', notes: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['finance-queue'],
    queryFn: () => client.get('/api/finance/queue').then(r => r.data),
    refetchInterval: 30000
  });
  const orders = data?.data?.orders || [];

  const mutation = useMutation({
    mutationFn: ({ id, payload }) => client.post(`/api/finance/orders/${id}/verify-payment`, payload).then(r => r.data),
    onSuccess: (_, { payload }) => {
      toast.success(`Payment ${payload.status === 'verified' ? 'verified ✅' : 'rejected ❌'} successfully`);
      qc.invalidateQueries({ queryKey: ['finance-queue'] });
      setSelectedOrder(null);
      setForm({ status: 'verified', payment_reference: '', payment_date: '', amount: '', payment_method: 'bank_transfer', notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Action failed')
  });

  const handleSelect = (order) => {
    setSelectedOrder(order);
    setForm(f => ({ ...f, amount: order.total_amount || '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (form.status === 'verified' && !form.payment_reference) {
      toast.error('Payment reference is required for verification');
      return;
    }
    mutation.mutate({ id: selectedOrder.id, payload: { ...form, amount: parseFloat(form.amount) || selectedOrder.total_amount } });
  };

  const waitingHours = (order) => {
    if (!order.submitted_at) return '—';
    const h = (Date.now() - new Date(order.submitted_at).getTime()) / 3600000;
    return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Verify payment for direct patient orders before dispatch.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Queue */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700">Pending Payment Verification ({orders.length})</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="text-sm">No orders pending payment verification</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {orders.map(order => (
                <li
                  key={order.id}
                  onClick={() => handleSelect(order)}
                  className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-800' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-mono font-semibold text-blue-800">{order.getmeds_order_id}</p>
                      <p className="text-sm text-gray-700 mt-0.5">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">{order.medrep_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-orange-600 font-medium">Waiting {waitingHours(order)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Verification form */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {!selectedOrder ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
              <CheckCircle className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm">Select an order to verify payment</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Verify Payment — {selectedOrder.getmeds_order_id}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.customer_name} · ₱{(selectedOrder.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Decision */}
                <div className="flex gap-3">
                  {['verified', 'rejected'].map(s => (
                    <label key={s} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border-2 cursor-pointer transition-colors ${form.status === s ? (s === 'verified' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value={s} checked={form.status === s} onChange={() => setForm(f => ({ ...f, status: s }))} className="sr-only" />
                      {s === 'verified' ? <CheckCircle className={`w-5 h-5 ${form.status === s ? 'text-green-600' : 'text-gray-400'}`} /> : <XCircle className={`w-5 h-5 ${form.status === s ? 'text-red-600' : 'text-gray-400'}`} />}
                      <span className={`text-sm font-medium capitalize ${form.status === s ? (s === 'verified' ? 'text-green-700' : 'text-red-700') : 'text-gray-500'}`}>{s}</span>
                    </label>
                  ))}
                </div>

                {form.status === 'verified' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payment Reference *</label>
                      <input value={form.payment_reference} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
                        placeholder="e.g. TXN-2026081901234" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                        <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                        <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                      <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="gcash">GCash</option>
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    placeholder="Optional notes..." className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={mutation.isPending}
                  className={`w-full py-2.5 text-sm font-medium rounded-md text-white disabled:opacity-50 ${form.status === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {mutation.isPending ? 'Processing...' : form.status === 'verified' ? '✅ Verify Payment & Release to Dispatch' : '❌ Reject Payment (Put on Hold)'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceQueuePage;

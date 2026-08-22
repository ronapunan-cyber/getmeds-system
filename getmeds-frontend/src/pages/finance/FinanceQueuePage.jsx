import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, RefreshCw, Sparkles } from 'lucide-react';
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

  const handleAutoFillPayment = () => {
    if (!selectedOrder) return;
    const randomRef = `BDO-REF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];

    setForm({
      status: 'verified',
      payment_reference: randomRef,
      payment_date: today,
      amount: selectedOrder.total_amount || '',
      payment_method: 'bank_transfer',
      notes: 'Payment verified and cleared via BDO Online corporate banking match.'
    });

    toast.success(`⚡ Auto-filled payment approval data (${randomRef})`, {
      icon: '💳',
      duration: 3000
    });
  };

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
          <h1 className="text-2xl font-bold text-ink-primary">Finance Payment Verification Queue</h1>
          <p className="text-sm text-ink-secondary mt-1">Direct patient orders awaiting advance payment clearance.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-md text-sm text-ink-secondary hover:bg-surface hover:text-ink-primary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Queue */}
        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 bg-surface flex items-center gap-2">
            <Clock className="w-4 h-4 text-state-warning" />
            <h2 className="text-sm font-semibold text-ink-primary">Pending Payment Verification ({orders.length})</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-getmeds-blue" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-ink-secondary">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-pharmacy-green" />
              <p className="text-sm">No orders pending payment verification</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {orders.map(order => (
                <li
                  key={order.id}
                  onClick={() => handleSelect(order)}
                  className={`p-4 cursor-pointer hover:bg-surface transition-colors ${selectedOrder?.id === order.id ? 'bg-getmeds-blue/10 border-l-4 border-getmeds-blue' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-mono font-semibold text-getmeds-blue">{order.getmeds_order_id}</p>
                      <p className="text-sm text-ink-primary mt-0.5 font-medium">{order.customer_name}</p>
                      <p className="text-xs text-ink-secondary">{order.medrep_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-primary">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-amber-700 font-semibold mt-0.5">Waiting {waitingHours(order)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Verification form */}
        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
          {!selectedOrder ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-ink-secondary">
              <CheckCircle className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-sm">Select an order to verify payment</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200 bg-surface flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink-primary">Verify Payment — {selectedOrder.getmeds_order_id}</h2>
                  <p className="text-xs text-ink-secondary mt-0.5">{selectedOrder.customer_name} · ₱{(selectedOrder.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                </div>
                {import.meta.env.VITE_TEST_MODE === 'true' && (
                  <button
                    type="button"
                    onClick={handleAutoFillPayment}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-2xs cursor-pointer"
                    title="Populate mock approval reference and bank transfer data"
                  >
                    <Sparkles size={13} className="text-amber-700" />
                    <span>[Auto-Fill Payment]</span>
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Decision */}
                <div className="flex gap-3">
                  {['verified', 'rejected'].map(s => (
                    <label key={s} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border-2 cursor-pointer transition-colors ${form.status === s ? (s === 'verified' ? 'border-pharmacy-green bg-pharmacy-green/10' : 'border-state-error bg-state-error-light') : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" value={s} checked={form.status === s} onChange={() => setForm(f => ({ ...f, status: s }))} className="sr-only" />
                      {s === 'verified' ? <CheckCircle className={`w-5 h-5 ${form.status === s ? 'text-pharmacy-green' : 'text-slate-400'}`} /> : <XCircle className={`w-5 h-5 ${form.status === s ? 'text-red-600' : 'text-slate-400'}`} />}
                      <span className={`text-sm font-semibold capitalize ${form.status === s ? (s === 'verified' ? 'text-pharmacy-green-dark' : 'text-red-700') : 'text-ink-secondary'}`}>{s}</span>
                    </label>
                  ))}
                </div>

                {form.status === 'verified' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-ink-primary mb-1">Payment Reference *</label>
                      <input value={form.payment_reference} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
                        placeholder="e.g. TXN-2026081901234" className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1">Payment Date</label>
                        <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                          className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1">Amount</label>
                        <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-primary mb-1">Payment Method</label>
                      <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                        className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue">
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="gcash">GCash</option>
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    placeholder="Optional notes..." className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
                </div>
                <button type="submit" disabled={mutation.isPending}
                  className={`w-full py-2.5 text-sm font-semibold rounded-md text-white disabled:opacity-50 shadow-sm transition-colors ${form.status === 'verified' ? 'bg-pharmacy-green hover:bg-pharmacy-green-hover' : 'bg-red-600 hover:bg-red-700'}`}>
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

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Package, Truck, MapPin, RefreshCw, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const STATUS_LABELS = {
  ready_for_dispatch: { label: 'Ready for Dispatch', color: 'bg-getmeds-blue/10 text-getmeds-blue-dark border border-getmeds-blue/30' },
  picking_packing: { label: 'Picking / Packing', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  dispatched: { label: 'Dispatched', color: 'bg-getmeds-blue/15 text-getmeds-blue-dark border border-getmeds-blue/40' },
};

const DispatchQueuePage = () => {
  const qc = useQueryClient();
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ courier: '', tracking_number: '', dispatch_notes: '' });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    order: null,
    status: '',
    title: '',
    message: '',
    confirmText: 'Confirm'
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dispatch-queue'],
    queryFn: () => client.get('/api/dispatch/queue').then(r => r.data),
    refetchInterval: 30000
  });
  const orders = data?.data?.orders || [];

  const handleAutoGenerateTracking = () => {
    const couriers = ['Lalamove Express', 'LBC Express', 'J&T Express', 'Grab Express', 'Ninja Van'];
    const randomCourier = couriers[Math.floor(Math.random() * couriers.length)];
    const randomTrk = `TRK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    setTrackingForm({
      courier: randomCourier,
      tracking_number: randomTrk,
      dispatch_notes: 'Temperature-controlled parcel dispatched for immediate same-day delivery.'
    });

    toast.success(`⚡ Auto-generated tracking: ${randomTrk} (${randomCourier})`, {
      icon: '🚚',
      duration: 3000
    });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => client.post(`/api/dispatch/orders/${id}/update-status`, { status }).then(r => r.data),
    onSuccess: (data, { status }) => {
      const formattedStatus = status === 'picking' ? 'Picking/Packing' : status === 'packing' ? 'Packing' : status;
      toast.success(`Order ${confirmDialog.order?.getmeds_order_id || ''} status updated to "${formattedStatus}" ✅`);
      qc.invalidateQueries({ queryKey: ['dispatch-queue'] });
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed')
  });

  const requestStatusChange = (order, status) => {
    let title = 'Update Order Status?';
    let message = `Are you sure you want to update ${order.getmeds_order_id} (${order.customer_name})?`;
    let confirmText = 'Confirm Update';

    if (status === 'picking') {
      title = 'Start Picking & Packing?';
      message = `Are you ready to begin picking and packing items for Order ${order.getmeds_order_id} (${order.customer_name})?`;
      confirmText = 'Yes, Start Picking';
    } else if (status === 'packing') {
      title = 'Mark as Packing?';
      message = `Mark Order ${order.getmeds_order_id} as currently being packed into parcel?`;
      confirmText = 'Yes, Mark Packing';
    } else if (status === 'dispatched') {
      title = 'Ready for Courier Dispatch?';
      message = `Mark Order ${order.getmeds_order_id} as ready to hand over to the courier?`;
      confirmText = 'Yes, Ready for Courier';
    }

    setConfirmDialog({
      isOpen: true,
      order,
      status,
      title,
      message,
      confirmText
    });
  };

  const handleConfirmStatusChange = () => {
    if (!confirmDialog.order || !confirmDialog.status) return;
    statusMutation.mutate({ id: confirmDialog.order.id, status: confirmDialog.status });
  };

  const trackingMutation = useMutation({
    mutationFn: ({ id, payload }) => client.post(`/api/dispatch/orders/${id}/tracking`, payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Tracking entered! Order completed 🎉');
      qc.invalidateQueries({ queryKey: ['dispatch-queue'] });
      setTrackingOrder(null);
      setTrackingForm({ courier: '', tracking_number: '', dispatch_notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to enter tracking')
  });

  const handleTrackingSubmit = (e) => {
    e.preventDefault();
    if (!trackingForm.courier || !trackingForm.tracking_number) {
      toast.error('Courier and tracking number are required');
      return;
    }
    trackingMutation.mutate({ id: trackingOrder.id, payload: trackingForm });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Dispatch & Logistics Queue</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage picking, packing, and dispatching of approved orders.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-md text-sm text-ink-secondary hover:bg-surface hover:text-ink-primary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-getmeds-blue" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200 shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-pharmacy-green" />
          <p className="text-ink-secondary">No orders in dispatch queue</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">MedRep</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Dispatch Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-ink-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.map(order => {
                const s = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={order.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-getmeds-blue">{order.getmeds_order_id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink-primary">{order.customer_name}</p>
                      <p className="text-xs text-ink-secondary">{order.contact_number}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-secondary">{order.medrep_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink-primary">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-secondary">
                      {order.dispatch_status || 'queued'}
                      {order.tracking_number && <span className="ml-1 text-teal-700 font-medium">· {order.tracking_number}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'ready_for_dispatch' && (
                          <button
                            onClick={() => requestStatusChange(order, 'picking')}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <Package className="w-3.5 h-3.5" /> Start Picking
                          </button>
                        )}
                        {order.status === 'picking_packing' && (
                          <>
                            <button
                              onClick={() => requestStatusChange(order, 'packing')}
                              disabled={statusMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <Package className="w-3.5 h-3.5" /> Mark Packing
                            </button>
                            <button
                              onClick={() => requestStatusChange(order, 'dispatched')}
                              disabled={statusMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-getmeds-blue rounded hover:bg-getmeds-blue-hover disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <Truck className="w-3.5 h-3.5" /> Dispatch
                            </button>
                          </>
                        )}
                        {order.status === 'dispatched' && (
                          <button
                            onClick={() => { setTrackingOrder(order); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Enter Tracking
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog for Picking / Packing / Dispatch */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmStatusChange}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant="primary"
      />

      {/* Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-primary">Enter Tracking Details</h3>
                <p className="text-sm text-ink-secondary">{trackingOrder.getmeds_order_id} · {trackingOrder.customer_name}</p>
              </div>
              {import.meta.env.VITE_TEST_MODE === 'true' && (
                <button
                  type="button"
                  onClick={handleAutoGenerateTracking}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-2xs cursor-pointer"
                  title="Generate randomized unique tracking number"
                >
                  <Sparkles size={13} className="text-amber-700" />
                  <span>[Auto-Generate Tracking]</span>
                </button>
              )}
            </div>
            <form onSubmit={handleTrackingSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">Courier *</label>
                <input value={trackingForm.courier} onChange={e => setTrackingForm(f => ({ ...f, courier: e.target.value }))}
                  placeholder="e.g. LBC, J&T, Grab Express" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">Tracking Number *</label>
                <input value={trackingForm.tracking_number} onChange={e => setTrackingForm(f => ({ ...f, tracking_number: e.target.value }))}
                  placeholder="e.g. LBC1234567890" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-1">Notes</label>
                <textarea value={trackingForm.dispatch_notes} onChange={e => setTrackingForm(f => ({ ...f, dispatch_notes: e.target.value }))}
                  rows={2} placeholder="Optional dispatch notes..." className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTrackingOrder(null)} className="flex-1 py-2 border border-slate-200 rounded-md text-sm text-ink-secondary hover:bg-surface">Cancel</button>
                <button type="submit" disabled={trackingMutation.isPending}
                  className="flex-1 py-2 bg-pharmacy-green text-white rounded-md text-sm font-semibold hover:bg-pharmacy-green-hover disabled:opacity-50 shadow-sm transition-colors">
                  {trackingMutation.isPending ? 'Saving...' : '✅ Complete Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchQueuePage;

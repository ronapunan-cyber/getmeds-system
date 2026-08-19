import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowLeft, Package, CreditCard, Truck, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-yellow-100 text-yellow-700',
  validating: 'bg-yellow-100 text-yellow-700',
  so_pending: 'bg-yellow-100 text-yellow-700',
  so_created: 'bg-blue-100 text-blue-700',
  waiting_for_payment: 'bg-orange-100 text-orange-700',
  payment_verified: 'bg-blue-100 text-blue-700',
  ready_for_dispatch: 'bg-blue-100 text-blue-700',
  picking_packing: 'bg-indigo-100 text-indigo-700',
  dispatched: 'bg-cyan-100 text-cyan-700',
  tracking_shared: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-amber-100 text-amber-700',
  exception: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EVENT_ICONS = {
  ORDER_CREATED: '📝', STATUS_CHANGE: '🔄', PAYMENT_VERIFIED: '✅',
  PAYMENT_REJECTED: '❌', ORDER_DISPATCHED: '🚚', TRACKING_ENTERED: '📍',
  ORDER_COMPLETED: '🎉', EXCEPTION_SET: '⚠️', DISPATCH_STATUS_UPDATE: '📦',
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('items');

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => client.get(`/api/orders/${id}`).then(r => r.data),
    refetchInterval: 15000
  });

  const exceptionMutation = useMutation({
    mutationFn: ({ status, reason }) => client.patch(`/api/orders/${id}/exception`, { status, reason }).then(r => r.data),
    onSuccess: () => { toast.success('Order status updated'); qc.invalidateQueries({ queryKey: ['order', id] }); },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed')
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800" /></div>;
  if (error) return <div className="text-center py-20 text-red-600">Failed to load order. <button onClick={() => navigate(-1)} className="underline">Go back</button></div>;

  const { order, items = [], payment, dispatch, events = [] } = data?.data || {};
  if (!order) return null;

  const tabs = [
    { id: 'items', label: 'Order Items', icon: Package },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'timeline', label: 'Audit Timeline', icon: Clock },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-gray-400 mb-1">GetMeds Order ID</p>
            <h1 className="text-2xl font-bold font-mono text-blue-800">{order.getmeds_order_id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {order.customer_name} · <span className={`capitalize px-1.5 py-0.5 rounded text-xs font-medium ${order.customer_type === 'credit' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{order.customer_type}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">MedRep: {order.medrep_name} · Created: {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy h:mm a') : '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {order.status?.replace(/_/g, ' ')}
            </span>
            <p className="text-xl font-bold text-gray-900">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Delivery Address</p>
            <p className="text-gray-700">{order.delivery_address}</p>
            {order.delivery_notes && <p className="text-gray-400 text-xs mt-0.5">{order.delivery_notes}</p>}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Zoho Integration</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {order.zoho_so_number ? (
                <>
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">SO: {order.zoho_so_number}</span>
                  <span className={`px-2 py-0.5 rounded ${order.zoho_sync_status === 'synced' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {order.zoho_sync_status}
                  </span>
                </>
              ) : <span className="text-gray-400">Not yet synced</span>}
            </div>
          </div>
        </div>

        {/* Management actions */}
        {['management', 'admin'].includes(user?.role) && !['completed', 'cancelled'].includes(order.status) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => { const r = prompt('Reason for hold?'); if (r) exceptionMutation.mutate({ status: 'on_hold', reason: r }); }}
              className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
            >⏸ Put on Hold</button>
            <button
              onClick={() => { const r = prompt('Exception reason?'); if (r) exceptionMutation.mutate({ status: 'exception', reason: r }); }}
              className="px-3 py-1.5 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
            >⚠️ Mark Exception</button>
          </div>
        )}
        {order.exception_reason && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
            <span className="font-semibold">Exception/Hold Reason:</span> {order.exception_reason}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-800 text-blue-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Items Tab */}
          {activeTab === 'items' && (
            <div>
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-400">SKU: {item.sku} · Unit: {item.unit}</p>
                      </td>
                      <td className="py-3 text-center text-sm text-gray-700">{item.quantity}</td>
                      <td className="py-3 text-right text-sm text-gray-700">₱{(item.unit_price || 0).toFixed(2)}</td>
                      <td className="py-3 text-right text-sm font-medium text-gray-900">₱{(item.subtotal || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  <tr>
                    <td colSpan="3" className="pt-3 text-sm font-semibold text-gray-700 text-right">Total Amount</td>
                    <td className="pt-3 text-right text-lg font-bold text-gray-900">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <div>
              {!payment ? (
                <div className="text-center py-8 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{order.customer_type === 'credit' ? 'Credit customer — no payment verification required.' : 'No payment record yet.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['Status', <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${payment.status === 'verified' ? 'bg-green-100 text-green-700' : payment.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{payment.status}</span>],
                    ['Reference', payment.payment_reference || '—'],
                    ['Amount', payment.amount ? `₱${payment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'],
                    ['Method', payment.payment_method || '—'],
                    ['Payment Date', payment.payment_date || '—'],
                    ['Verified By', payment.verified_by_name || '—'],
                    ['Verified At', payment.verified_at ? format(new Date(payment.verified_at), 'MMM d, yyyy h:mm a') : '—'],
                    ['Notes', payment.notes || '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded p-3">
                      <p className="text-xs font-medium text-gray-400 uppercase mb-1">{label}</p>
                      <div className="text-sm text-gray-800">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dispatch Tab */}
          {activeTab === 'dispatch' && (
            <div>
              {!dispatch ? (
                <div className="text-center py-8 text-gray-400">
                  <Truck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No dispatch record yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['Dispatch Status', <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${dispatch.status === 'dispatched' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>{dispatch.status}</span>],
                    ['Courier', dispatch.courier || '—'],
                    ['Tracking Number', dispatch.tracking_number ? <span className="font-mono font-bold">{dispatch.tracking_number}</span> : '—'],
                    ['Dispatched By', dispatch.dispatched_by_name || '—'],
                    ['Dispatched At', dispatch.dispatched_at ? format(new Date(dispatch.dispatched_at), 'MMM d, yyyy h:mm a') : '—'],
                    ['Notes', dispatch.dispatch_notes || '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded p-3">
                      <p className="text-xs font-medium text-gray-400 uppercase mb-1">{label}</p>
                      <div className="text-sm text-gray-800">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No events recorded yet.</p>
              ) : (
                events.map((event, i) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">
                        {EVENT_ICONS[event.event_type] || '📋'}
                      </div>
                      {i < events.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 my-1" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {event.event_type.replace(/_/g, ' ')}
                            {event.old_status && event.new_status && (
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                {event.old_status} → <span className={`font-semibold ${STATUS_COLORS[event.new_status] ? 'text-gray-800' : ''}`}>{event.new_status}</span>
                              </span>
                            )}
                          </p>
                          {event.notes && <p className="text-xs text-gray-500 mt-0.5">{event.notes}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">By: {event.actor_name || 'System'}</p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0 ml-4">
                          {event.created_at ? format(new Date(event.created_at), 'MMM d, h:mm a') : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, RefreshCw, Eye } from 'lucide-react';
import client from '../../api/client';

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

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-orders', statusFilter],
    queryFn: () => client.get(`/api/orders${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
    refetchInterval: 30000
  });

  const orders = data?.data?.orders || [];

  const statuses = [
    'draft', 'submitted', 'waiting_for_payment', 'payment_verified',
    'ready_for_dispatch', 'picking_packing', 'dispatched', 'tracking_shared',
    'completed', 'on_hold', 'exception', 'cancelled'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track status of orders you have submitted.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => navigate('/orders/new')} className="flex items-center gap-1.5 px-3 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900">
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${!statusFilter ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >All</button>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusFilter === s ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >{s.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 text-sm">Failed to load orders.</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No orders found.</p>
          <button onClick={() => navigate('/orders/new')} className="px-4 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900">
            Create Your First Order
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-blue-800">{order.getmeds_order_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    {order.payment_status ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.payment_status === 'verified' ? 'bg-green-100 text-green-700' : order.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {order.payment_status}
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;

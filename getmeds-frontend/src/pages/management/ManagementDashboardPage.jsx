import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ShoppingBag, Clock, Truck, CheckCircle, AlertTriangle, RefreshCw, Eye
} from 'lucide-react';
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

const ManagementDashboardPage = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: summaryRes, isLoading: loadingStats, refetch } = useQuery({
    queryKey: ['management-summary'],
    queryFn: () => client.get('/api/management/summary').then(r => r.data),
    refetchInterval: 60000
  });
  const stats = summaryRes?.data || {};

  const { data: ordersRes, isLoading: loadingOrders } = useQuery({
    queryKey: ['management-orders', statusFilter],
    queryFn: () => client.get(`/api/management/orders${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data)
  });
  const orders = ordersRes?.data?.orders || [];

  const statCards = [
    { title: 'Total Orders', value: stats.total_orders || 0, icon: ShoppingBag, color: 'blue', sub: `${stats.orders_today || 0} today` },
    { title: 'Pending Payment', value: stats.pending_payment_count || 0, icon: Clock, color: 'orange', sub: 'Awaiting Finance' },
    { title: 'Ready for Dispatch', value: stats.ready_dispatch_count || 0, icon: Truck, color: 'indigo', sub: 'In queue' },
    { title: 'Completed', value: stats.completed_count || 0, icon: CheckCircle, color: 'green', sub: 'All time' },
    { title: 'Exceptions / On Hold', value: stats.exception_count || 0, icon: AlertTriangle, color: 'red', sub: 'Need attention' },
    {
      title: 'Avg Processing Time',
      value: stats.avg_processing_time_hours != null ? `${stats.avg_processing_time_hours}h` : 'N/A',
      icon: Clock, color: 'purple', sub: 'Submit → Complete'
    },
  ];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  const iconColorMap = {
    blue: 'text-blue-600', orange: 'text-orange-600', indigo: 'text-indigo-600',
    green: 'text-green-600', red: 'text-red-600', purple: 'text-purple-600',
  };

  const downloadCSV = () => {
    const headers = ['Order ID', 'Customer', 'MedRep', 'Status', 'Total', 'Payment', 'Created'];
    const rows = orders.map(o => [
      o.getmeds_order_id, o.customer_name, o.medrep_name, o.status,
      o.total_amount, o.payment_status || '', o.created_at
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'getmeds_orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusByStatus = stats.orders_by_status || {};
  const statusChartData = Object.entries(statusByStatus).map(([s, c]) => ({ status: s, count: c }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of all orders and KPIs.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      {loadingStats ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className={`inline-flex p-2 rounded-full ${colorMap[card.color]} mb-3`}>
                  <Icon className={`w-5 h-5 ${iconColorMap[card.color]}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">{card.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Orders by status breakdown */}
      {statusChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Orders by Status</h2>
          <div className="flex flex-wrap gap-2">
            {statusChartData.map(({ status, count }) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === status ? 'ring-2 ring-blue-500' : ''} ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}
              >
                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="font-bold">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            All Orders {statusFilter && <span className="ml-1 text-blue-600 capitalize">· {statusFilter.replace(/_/g, ' ')}</span>}
          </h2>
          <div className="flex gap-2">
            {statusFilter && (
              <button onClick={() => setStatusFilter('')} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear filter</button>
            )}
            <button onClick={downloadCSV} className="px-2.5 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50">⬇ Export CSV</button>
          </div>
        </div>
        {loadingOrders ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No orders found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MedRep</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-800">{order.getmeds_order_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.medrep_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManagementDashboardPage;

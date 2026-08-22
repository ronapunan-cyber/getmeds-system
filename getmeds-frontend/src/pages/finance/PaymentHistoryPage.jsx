import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Eye, 
  Search, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  DollarSign, 
  ChevronRight,
  Filter,
  Zap
} from 'lucide-react';
import client from '../../api/client';
import { formatPHT } from '../../utils/dateUtils';
import OrderStatusBadge from '../../components/ui/OrderStatusBadge';

const PaymentHistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | verified | rejected
  const queryClient = useQueryClient();

  const syncPaymentMutation = useMutation({
    mutationFn: (orderId) => client.post(`/api/finance/orders/${orderId}/sync-payment`),
    onSuccess: (res) => {
      toast.success(res?.data?.data?.message || 'Zoho payment registered as Paid!');
      queryClient.invalidateQueries({ queryKey: ['finance-orders-all'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to sync payment to Zoho');
    }
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['finance-orders-all'],
    queryFn: () => client.get('/api/orders?customer_type=direct&limit=100').then(r => r.data),
    refetchInterval: 30000
  });

  const orders = data?.data?.orders || [];

  // Filter orders that have undergone payment verification or are direct patient orders
  const paymentOrders = orders.filter(order => {
    const matchesSearch = 
      order.getmeds_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'verified') {
      return order.payment_status === 'verified' || ['payment_verified', 'ready_for_dispatch', 'picking_packing', 'dispatched', 'tracking_shared', 'completed'].includes(order.status);
    }
    if (filterStatus === 'rejected') {
      return order.payment_status === 'rejected' || order.status === 'on_hold';
    }
    return true;
  });

  const totalVerified = orders.filter(o => o.payment_status === 'verified' || ['payment_verified', 'completed'].includes(o.status)).length;
  const totalVerifiedSum = orders
    .filter(o => o.payment_status === 'verified' || ['payment_verified', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Payment History & Clearance Log</h1>
          <p className="text-sm text-ink-secondary mt-1">
            Historical audit log of verified and rejected advance patient payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-md text-sm text-ink-secondary bg-white hover:bg-surface hover:text-ink-primary transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/finance"
            className="flex items-center gap-1.5 px-4 py-2 bg-getmeds-blue text-white rounded-md text-sm font-semibold hover:bg-getmeds-blue-hover transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4" /> Go to Payment Queue
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase text-ink-secondary tracking-wider">Total Direct Orders</p>
          <p className="text-2xl font-bold text-ink-primary mt-1">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase text-pharmacy-green tracking-wider">Verified Payments</p>
          <p className="text-2xl font-bold text-pharmacy-green mt-1">{totalVerified}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs font-semibold uppercase text-getmeds-blue tracking-wider">Cleared Volume</p>
          <p className="text-2xl font-bold text-ink-primary mt-1">₱{totalVerifiedSum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by order ID, customer, reference..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-getmeds-blue"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Direct Orders' },
            { id: 'verified', label: 'Verified Payments' },
            { id: 'rejected', label: 'Rejected / On Hold' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === tab.id
                  ? 'bg-getmeds-blue text-white'
                  : 'bg-surface text-ink-secondary hover:text-ink-primary hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-getmeds-blue" />
          </div>
        ) : paymentOrders.length === 0 ? (
          <div className="text-center py-16 text-ink-secondary text-sm">
            No payment records found matching your filters.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Total Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Workflow Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Payment Clearance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-ink-secondary uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paymentOrders.map(order => {
                const isVerified = order.payment_status === 'verified' || ['payment_verified', 'ready_for_dispatch', 'picking_packing', 'dispatched', 'tracking_shared', 'completed'].includes(order.status);
                const isRejected = order.payment_status === 'rejected';

                return (
                  <tr key={order.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-getmeds-blue">
                      {order.getmeds_order_id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink-primary">{order.customer_name}</p>
                      <p className="text-xs text-ink-secondary">Direct Patient</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-ink-primary">
                      ₱{(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pharmacy-green/15 text-pharmacy-green-dark border border-pharmacy-green/30">
                          <CheckCircle className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-state-error-light text-red-700 border border-state-error/30">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-state-warning-light text-amber-950 border border-state-warning/30">
                          Pending Clearance
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-secondary">
                      {formatPHT(order.created_at, 'date')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {import.meta.env.VITE_TEST_MODE === 'true' && (
                          <button
                            type="button"
                            disabled={syncPaymentMutation.isPending}
                            onClick={() => syncPaymentMutation.mutate(order.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                            title="Test Mode: Force Zoho Payment Sync"
                          >
                            <Zap className="w-3 h-3 text-amber-600" />
                            {syncPaymentMutation.isPending ? 'Syncing...' : 'Force Zoho Sync'}
                          </button>
                        )}
                        <Link
                          to={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs text-getmeds-blue hover:text-getmeds-blue-dark font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;

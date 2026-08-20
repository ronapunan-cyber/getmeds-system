import React from 'react';
import OrderStatusBadge from '../ui/OrderStatusBadge';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrderCard = ({ order }) => {
  return (
    <Link to={`/orders/${order.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-ink-primary">Order #{order.orderNumber || order.id}</h3>
            <p className="text-sm text-ink-secondary">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-ink-secondary">Client: <span className="font-medium text-ink-primary">{order.clientName || order.client?.name}</span></p>
          <p className="text-sm text-ink-secondary">Total: <span className="font-medium text-ink-primary">${(order.totalAmount || 0).toFixed(2)}</span></p>
        </div>
        
        <div className="flex items-center text-sm font-semibold text-getmeds-blue">
          View Details
          <ChevronRight className="ml-1 w-4 h-4" />
        </div>
      </div>
    </Link>
  );
};

export default OrderCard;

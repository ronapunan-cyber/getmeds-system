import React from 'react';
import { CheckCircle, Clock, XCircle, Package, Truck, Home } from 'lucide-react';

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  PACKED: Package,
  SHIPPED: Truck,
  DELIVERED: Home,
};

const statusOrder = ['PENDING', 'APPROVED', 'PACKED', 'SHIPPED', 'DELIVERED'];

const OrderTimeline = ({ currentStatus, history }) => {
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200" aria-hidden="true" />
        {statusOrder.map((status, index) => {
          const Icon = statusIcons[status] || Clock;
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={status} className="relative flex flex-col items-center group">
              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition-all
                ${isCompleted ? (status === 'DELIVERED' || index === statusOrder.length - 1 ? 'bg-pharmacy-green text-white' : 'bg-getmeds-blue text-white') : 'bg-slate-200 text-slate-500'}
                ${isCurrent ? 'ring-getmeds-blue/30' : ''}`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className={`mt-2 text-xs font-semibold ${isCompleted ? 'text-ink-primary' : 'text-ink-secondary'}`}>
                {status}
              </span>
            </div>
          );
        })}
      </div>
      
      {history && history.length > 0 && (
        <div className="mt-8 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">History</h4>
          <ul className="space-y-3">
            {history.map((event, index) => (
              <li key={index} className="text-sm text-gray-500 flex justify-between">
                <span>Changed to <span className="font-medium text-gray-900">{event.status}</span></span>
                <span>{new Date(event.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;

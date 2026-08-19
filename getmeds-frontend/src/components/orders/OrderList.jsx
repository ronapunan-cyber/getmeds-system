import React from 'react';
import OrderCard from './OrderCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';

const OrderList = ({ orders, isLoading, error }) => {
  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return <ErrorMessage message={error.message || 'Failed to load orders'} />;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No orders found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

export default OrderList;

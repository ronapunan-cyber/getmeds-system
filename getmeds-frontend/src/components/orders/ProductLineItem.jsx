import React from 'react';

const ProductLineItem = ({ item }) => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">{item.productName || item.product?.name || 'Unknown Product'}</span>
        <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
      </div>
      <div className="text-sm font-medium text-gray-900">
        ${(item.unitPrice * item.quantity).toFixed(2)}
      </div>
    </div>
  );
};

export default ProductLineItem;

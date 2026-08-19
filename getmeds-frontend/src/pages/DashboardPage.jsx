import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'MEDREP':
      return <Navigate to="/medrep/my-orders" replace />;
    case 'FINANCE':
      return <Navigate to="/finance/queue" replace />;
    case 'DISPATCH':
      return <Navigate to="/dispatch/queue" replace />;
    case 'MANAGEMENT':
      return <Navigate to="/management/dashboard" replace />;
    case 'ADMIN':
      return <Navigate to="/admin/users" replace />;
    default:
      return <div>Invalid user role</div>;
  }
};

export default DashboardPage;

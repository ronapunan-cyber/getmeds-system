import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewOrderPage from './pages/medrep/NewOrderPage';
import MyOrdersPage from './pages/medrep/MyOrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import FinanceQueuePage from './pages/finance/FinanceQueuePage';
import DispatchQueuePage from './pages/dispatch/DispatchQueuePage';
import ManagementDashboardPage from './pages/management/ManagementDashboardPage';
import UsersPage from './pages/admin/UsersPage';
import TestModePage from './pages/TestModePage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/test-mode" element={<TestModePage />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          
          <Route path="/orders" element={<MyOrdersPage />} />
          <Route 
            path="/orders/new" 
            element={
              <ProtectedRoute allowedRoles={['medrep']}>
                <NewOrderPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          
          <Route 
            path="/finance" 
            element={
              <ProtectedRoute allowedRoles={['finance']}>
                <FinanceQueuePage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dispatch" 
            element={
              <ProtectedRoute allowedRoles={['dispatch']}>
                <DispatchQueuePage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/management" 
            element={
              <ProtectedRoute allowedRoles={['management', 'admin']}>
                <ManagementDashboardPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

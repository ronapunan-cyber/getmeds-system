import client from './client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Fetch all active pharmaceutical products from database
 */
export const fetchProducts = async () => {
  const token = sessionStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    // Fallback to axios client if fetch encounters cross-origin/interceptor issues
    const res = await client.get('/api/products');
    return res.data;
  }
  return response.json();
};

/**
 * Fetch all active customer accounts from database
 */
export const fetchCustomers = async () => {
  const token = sessionStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/customers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const res = await client.get('/api/customers');
    return res.data;
  }
  return response.json();
};

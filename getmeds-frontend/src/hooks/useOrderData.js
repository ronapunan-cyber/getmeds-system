import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchCustomers } from '../api/queries';

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetchProducts();
      return res?.data?.products || res?.products || res || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetchCustomers();
      return res?.data?.customers || res?.customers || res || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await client.get('/api/notifications');
      return data.data.notifications;
    },
    refetchInterval: 30000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await client.get('/api/notifications/unread-count');
      return data.data.count;
    },
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await client.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    unreadCount: unreadCountQuery.data || 0,
    isLoading: notificationsQuery.isLoading,
    markAsRead: markAsReadMutation.mutate,
  };
};

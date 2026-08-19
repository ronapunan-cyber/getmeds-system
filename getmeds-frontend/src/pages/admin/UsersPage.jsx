import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/client';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { Shield, User, Mail, MoreVertical } from 'lucide-react';

const roleColors = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGEMENT: 'bg-purple-100 text-purple-800',
  FINANCE: 'bg-green-100 text-green-800',
  DISPATCH: 'bg-blue-100 text-blue-800',
  MEDREP: 'bg-gray-100 text-gray-800',
};

const UsersPage = () => {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axiosClient.get('/api/users');
      return res.data;
    }
  });

  if (isLoading) return <div className="p-8"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8"><ErrorMessage message={error.message || 'Failed to load users'} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users and their roles.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm">
          Add User
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {users?.map((user) => (
            <li key={user.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <User className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role}
                  </span>
                  <button className="text-gray-400 hover:text-gray-500">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {(!users || users.length === 0) && (
            <li className="p-8 text-center text-gray-500">No users found.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default UsersPage;

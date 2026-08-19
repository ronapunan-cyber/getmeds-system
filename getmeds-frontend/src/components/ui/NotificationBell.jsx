import React from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = ({ count = 0, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
    >
      <span className="sr-only">View notifications</span>
      <Bell className="h-6 w-6" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-400 ring-2 ring-white" />
      )}
    </button>
  );
};

export default NotificationBell;

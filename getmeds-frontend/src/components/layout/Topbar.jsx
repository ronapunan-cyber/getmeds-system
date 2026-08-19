import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../ui/NotificationBell';
import { LogOut, User, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

const Topbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex items-center space-x-3">
        <Link
          to="/test-mode"
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors"
          title="Open Developer Test Mode"
        >
          <FlaskConical size={14} className="mr-1.5 text-amber-600" />
          <span>Test Mode</span>
        </Link>
      </div>
      <div className="flex items-center space-x-6">
        <NotificationBell />
        
        <div className="flex items-center space-x-2 border-l pl-6 border-gray-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary">
            <User size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700 leading-tight">{user?.name}</span>
            <span className="text-xs text-gray-500 capitalize leading-tight">{user?.role}</span>
          </div>
          <button 
            onClick={logout}
            className="ml-4 p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

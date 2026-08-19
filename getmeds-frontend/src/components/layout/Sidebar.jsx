import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  ClipboardList,
  CheckSquare,
  Truck,
  Package,
  FlaskConical,
  ShieldAlert
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const role = (user.role || '').toLowerCase();
  const mainLinks = [];
  const adminLinks = [];

  if (role === 'medrep') {
    mainLinks.push(
      { to: '/orders/new', icon: <ShoppingCart size={20} />, label: 'New Order' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'My Orders' }
    );
  } else if (role === 'finance') {
    mainLinks.push(
      { to: '/finance', icon: <CheckSquare size={20} />, label: 'Finance Queue' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'All Orders' }
    );
  } else if (role === 'dispatch') {
    mainLinks.push(
      { to: '/dispatch', icon: <Truck size={20} />, label: 'Dispatch Queue' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'All Orders' }
    );
  } else if (role === 'management' || role === 'admin') {
    mainLinks.push(
      { to: '/management', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'All Orders' }
    );
  }

  // Admin exclusive navigation
  if (role === 'admin') {
    adminLinks.push(
      { to: '/admin/users', icon: <Users size={20} />, label: 'Users' }
    );
  }

  return (
    <aside className="w-60 bg-gray-100 border-r border-gray-200 h-full flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
          <Package className="text-blue-700 mr-2" size={24} />
          <span className="text-xl font-bold text-gray-800 tracking-tight">GetMeds</span>
        </div>

        {/* Navigation Section */}
        <nav className="overflow-y-auto py-4 space-y-6">
          {/* Main Workspace Links */}
          <div>
            <div className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </div>
            <ul className="space-y-1">
              {mainLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="mr-3">{link.icon}</span>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Dedicated Administration Header & Links */}
          {adminLinks.length > 0 && (
            <div className="pt-2 border-t border-gray-200/80">
              <div className="px-6 pb-2 text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-purple-600" />
                Administration
              </div>
              <ul className="space-y-1">
                {adminLinks.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-purple-50 text-purple-800 border-r-4 border-purple-700 font-semibold'
                            : 'text-gray-700 hover:bg-purple-50/60 hover:text-purple-900'
                        }`
                      }
                    >
                      <span className="mr-3 text-purple-600">{link.icon}</span>
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </div>

      {/* Test Mode Footer Button */}
      <div className="p-4 border-t border-gray-200 bg-amber-50/60">
        <NavLink
          to="/test-mode"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              isActive
                ? 'bg-amber-200 text-amber-900 shadow-sm'
                : 'text-amber-800 hover:bg-amber-100'
            }`
          }
        >
          <FlaskConical size={16} className="mr-2 text-amber-600" />
          <span>Test Mode Hub</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;

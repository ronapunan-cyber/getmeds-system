import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, ShoppingCart, Users, ClipboardList, CheckSquare, Truck, Package, FlaskConical } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const links = [];
  
  if (user.role === 'medrep') {
    links.push(
      { to: '/orders/new', icon: <ShoppingCart size={20} />, label: 'New Order' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'My Orders' }
    );
  } else if (user.role === 'finance') {
    links.push(
      { to: '/finance', icon: <CheckSquare size={20} />, label: 'Finance Queue' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'All Orders' }
    );
  } else if (user.role === 'dispatch') {
    links.push(
      { to: '/dispatch', icon: <Truck size={20} />, label: 'Dispatch Queue' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'All Orders' }
    );
  } else if (user.role === 'management' || user.role === 'admin') {
    links.push(
      { to: '/management', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
      { to: '/orders', icon: <ClipboardList size={20} />, label: 'All Orders' }
    );
    if (user.role === 'admin') {
      links.push({ to: '/admin/users', icon: <Users size={20} />, label: 'Users' });
    }
  }

  return (
    <aside className="w-60 bg-gray-100 border-r border-gray-200 h-full flex flex-col justify-between">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Package className="text-primary mr-2" size={24} />
          <span className="text-xl font-bold text-gray-800">GetMeds</span>
        </div>
        <nav className="overflow-y-auto py-4">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-primary border-r-4 border-primary'
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
        </nav>
      </div>

      {/* Test Mode Footer Button */}
      <div className="p-4 border-t border-gray-200 bg-amber-50/60">
        <NavLink
          to="/test-mode"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              isActive
                ? 'bg-amber-200 text-amber-900'
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

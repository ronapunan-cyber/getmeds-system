import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  CreditCard,
  History,
  Truck,
  MapPin,
  AlertTriangle,
  Users,
  Package,
  ShieldCheck,
  Building2,
  FolderClock
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const role = (user.role || '').toLowerCase();
  const mainLinks = [];
  const secondaryLinks = [];

  if (role === 'medrep') {
    mainLinks.push(
      { to: '/medrep/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
      { to: '/orders/new', icon: <PlusCircle size={19} />, label: 'Create New Order', primaryAction: true },
      { to: '/orders', icon: <ClipboardList size={19} />, label: 'My Orders' }
    );
  } else if (role === 'finance') {
    mainLinks.push(
      { to: '/finance', icon: <CreditCard size={19} />, label: 'Payment Queue' },
      { to: '/finance/history', icon: <History size={19} />, label: 'Payment History' }
    );
    secondaryLinks.push(
      { to: '/orders', icon: <ClipboardList size={19} />, label: 'All Orders Log' }
    );
  } else if (role === 'dispatch') {
    mainLinks.push(
      { to: '/dispatch', icon: <Truck size={19} />, label: 'Fulfillment Queue' },
      { to: '/dispatch/history', icon: <MapPin size={19} />, label: 'Dispatched / Tracking Log' }
    );
    secondaryLinks.push(
      { to: '/orders', icon: <ClipboardList size={19} />, label: 'All Orders Log' }
    );
  } else if (role === 'management') {
    mainLinks.push(
      { to: '/management', icon: <LayoutDashboard size={19} />, label: 'Global Dashboard' },
      { to: '/management/exceptions', icon: <AlertTriangle size={19} />, label: 'Exception Hub' }
    );
    secondaryLinks.push(
      { to: '/orders', icon: <ClipboardList size={19} />, label: 'All Orders Log' }
    );
  } else if (role === 'admin') {
    mainLinks.push(
      { to: '/management', icon: <LayoutDashboard size={19} />, label: 'Global Dashboard' },
      { to: '/management/exceptions', icon: <AlertTriangle size={19} />, label: 'Exception Hub' },
      { to: '/admin/users', icon: <Users size={19} />, label: 'User Management' }
    );
    secondaryLinks.push(
      { to: '/orders', icon: <ClipboardList size={19} />, label: 'All Orders Log' }
    );
  }

  const roleLabelMap = {
    medrep: 'Medical Representative',
    finance: 'Finance & Payments',
    dispatch: 'Logistics & Dispatch',
    management: 'Operations Management',
    admin: 'System Administrator',
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-full flex flex-col justify-between flex-shrink-0 select-none z-30">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-getmeds-blue/15 flex items-center justify-center text-getmeds-blue mr-3 shadow-sm">
            <Package size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="text-lg font-bold text-ink-primary tracking-tight leading-none block">GetMeds</span>
            <span className="text-[10px] uppercase font-semibold text-getmeds-blue tracking-wider block mt-0.5">Enterprise Portal</span>
          </div>
        </div>

        {/* Role Identity Tag */}
        <div className="px-6 py-3 bg-surface/70 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
            Active Workspace
          </span>
          <span className="text-[11px] font-bold text-ink-primary capitalize bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
            {role}
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Main Primary Links */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
              Navigation Menu
            </div>
            <ul className="space-y-1">
              {mainLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/orders' || link.to === '/finance' || link.to === '/dispatch' || link.to === '/management'}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-getmeds-blue/10 text-getmeds-blue font-semibold border-r-4 border-getmeds-blue'
                          : link.primaryAction
                          ? 'text-getmeds-blue bg-getmeds-blue/5 hover:bg-getmeds-blue/10 font-semibold'
                          : 'text-ink-secondary hover:bg-surface hover:text-ink-primary'
                      }`
                    }
                  >
                    <span className={`mr-3 ${link.primaryAction ? 'text-getmeds-blue' : ''}`}>{link.icon}</span>
                    <span className="truncate">{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Secondary Links if applicable */}
          {secondaryLinks.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                System Records
              </div>
              <ul className="space-y-1">
                {secondaryLinks.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-getmeds-blue/10 text-getmeds-blue font-semibold'
                            : 'text-ink-secondary hover:bg-surface hover:text-ink-primary'
                        }`
                      }
                    >
                      <span className="mr-3">{link.icon}</span>
                      <span className="truncate">{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* User Role Footer Card */}
        <div className="p-3 border-t border-slate-100 bg-surface/50 flex-shrink-0">
          <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs">
            <p className="font-semibold text-ink-primary truncate">{user.name}</p>
            <p className="text-[11px] text-ink-secondary truncate">{roleLabelMap[role] || role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

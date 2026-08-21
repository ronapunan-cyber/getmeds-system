import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDebug } from '../../context/DebugContext';
import toast from 'react-hot-toast';
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
  X,
  FlaskConical,
  BarChart3,
  Shield,
  Sparkles,
  Layers
} from 'lucide-react';

const QUICK_ROLES = [
  { role: 'medrep', label: 'MedRep', email: 'medrep@getmeds.ph', badge: 'bg-getmeds-blue/15 text-getmeds-blue-dark' },
  { role: 'finance', label: 'Finance', email: 'finance@getmeds.ph', badge: 'bg-pharmacy-green/15 text-pharmacy-green-dark' },
  { role: 'dispatch', label: 'Dispatch', email: 'dispatch@getmeds.ph', badge: 'bg-indigo-100 text-indigo-800' },
  { role: 'management', label: 'Manager', email: 'manager@getmeds.ph', badge: 'bg-purple-100 text-purple-800' },
  { role: 'admin', label: 'Admin', email: 'admin@getmeds.ph', badge: 'bg-slate-900 text-white' },
];

const Sidebar = ({ isOpen = false, onClose }) => {
  const { user, quickLogin } = useAuth();
  const { isDebug } = useDebug();

  if (!user) return null;

  const role = (user.role || '').toLowerCase();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleQuickSwitch = async (email, roleName) => {
    if (user?.email === email) return;
    try {
      if (quickLogin) {
        await quickLogin(email);
        toast.success(`Switched active workspace to ${roleName}`, {
          icon: '⚡',
          duration: 2500,
        });
      }
    } catch (err) {
      toast.error(`Quick switch failed: ${err.message}`);
    }
  };

  const roleLabelMap = {
    medrep: 'Medical Representative',
    finance: 'Finance & Payments',
    dispatch: 'Logistics & Dispatch',
    management: 'Operations Management',
    admin: 'System Administrator',
  };

  // Test Mode: Categorized transactions across ALL roles
  const testModeSections = [
    {
      title: 'MedRep Pipeline',
      badge: 'MedRep',
      badgeClass: 'bg-getmeds-blue/15 text-getmeds-blue-dark',
      links: [
        { to: '/medrep/dashboard', icon: <LayoutDashboard size={18} />, label: 'MedRep Overview' },
        { to: '/orders/new', icon: <PlusCircle size={18} />, label: 'Create New Order', primaryAction: true },
        { to: '/orders', icon: <ClipboardList size={18} />, label: 'My Submissions', exact: true }
      ]
    },
    {
      title: 'Finance & Payments',
      badge: 'Finance',
      badgeClass: 'bg-pharmacy-green/15 text-pharmacy-green-dark',
      links: [
        { to: '/finance', icon: <CreditCard size={18} />, label: 'Payment Queue', exact: true },
        { to: '/finance/history', icon: <History size={18} />, label: 'Payment History' }
      ]
    },
    {
      title: 'Logistics & Dispatch',
      badge: 'Dispatch',
      badgeClass: 'bg-indigo-100 text-indigo-800',
      links: [
        { to: '/dispatch', icon: <Truck size={18} />, label: 'Fulfillment Queue', exact: true },
        { to: '/dispatch/history', icon: <MapPin size={18} />, label: 'Tracking Log' }
      ]
    },
    {
      title: 'Management Operations',
      badge: 'Management',
      badgeClass: 'bg-purple-100 text-purple-800',
      links: [
        { to: '/management', icon: <BarChart3 size={18} />, label: 'Global Dashboard', exact: true },
        { to: '/management/exceptions', icon: <AlertTriangle size={18} />, label: 'Exception Hub' }
      ]
    },
    {
      title: 'System Administration',
      badge: 'Admin',
      badgeClass: 'bg-slate-900 text-white',
      links: [
        { to: '/admin/users', icon: <Users size={18} />, label: 'User Management' },
        { to: '/test-mode', icon: <FlaskConical size={18} />, label: 'Test Mode Hub' }
      ]
    }
  ];

  // Standard Mode: Single-role restricted links
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

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Fixed on Desktop, Slide-Over Drawer on Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 h-full flex flex-col justify-between flex-shrink-0 select-none transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Logo Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-lg bg-getmeds-blue/15 flex items-center justify-center text-getmeds-blue mr-3 shadow-sm">
                <Package size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="text-lg font-bold text-ink-primary tracking-tight leading-none block">GetMeds</span>
                <span className="text-[10px] uppercase font-semibold text-getmeds-blue tracking-wider block mt-0.5">Enterprise Portal</span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors"
              title="Close Navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* Role Identity Tag & Quick Role Switcher */}
          <div className="px-4 py-2.5 bg-surface/70 border-b border-slate-100 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider flex items-center gap-1">
                {isDebug ? <Layers size={13} className="text-amber-600" /> : null}
                Active Workspace
              </span>
              <div className="flex items-center gap-1.5">
                {isDebug && (
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    TEST MODE
                  </span>
                )}
                <span className="text-[11px] font-bold text-ink-primary capitalize bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  {role}
                </span>
              </div>
            </div>

            {/* 1-Click Quick Role Switcher in Test Mode */}
            {isDebug && (
              <div className="pt-1 border-t border-slate-200/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">
                    Quick Switch Identity
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {QUICK_ROLES.map((r) => {
                    const isCurrent = (user.role || '').toLowerCase() === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => handleQuickSwitch(r.email, r.label)}
                        className={`text-[10px] font-bold py-1 px-0.5 rounded text-center transition-all border ${
                          isCurrent
                            ? `${r.badge} border-slate-400 font-extrabold shadow-2xs scale-105`
                            : 'bg-white text-ink-secondary border-slate-200 hover:bg-slate-100 hover:text-ink-primary'
                        }`}
                        title={`Switch active user to ${r.label} (${r.email})`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
            {isDebug ? (
              /* TEST MODE: Categorized navigation for ALL users' transactions */
              testModeSections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="px-2 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                      {section.title}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${section.badgeClass}`}>
                      {section.badge}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {section.links.map((link) => (
                      <li key={link.to + link.label}>
                        <NavLink
                          to={link.to}
                          onClick={handleLinkClick}
                          end={link.exact}
                          className={({ isActive }) =>
                            `flex items-center px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-getmeds-blue/10 text-getmeds-blue font-bold border-r-3 border-getmeds-blue'
                                : link.primaryAction
                                ? 'text-getmeds-blue bg-getmeds-blue/5 hover:bg-getmeds-blue/10 font-bold'
                                : 'text-ink-secondary hover:bg-surface hover:text-ink-primary'
                            }`
                          }
                        >
                          <span className={`mr-2.5 ${link.primaryAction ? 'text-getmeds-blue' : ''}`}>
                            {link.icon}
                          </span>
                          <span className="truncate">{link.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              /* STANDARD MODE: Role-restricted links */
              <>
                <div>
                  <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                    Navigation Menu
                  </div>
                  <ul className="space-y-1">
                    {mainLinks.map((link) => (
                      <li key={link.to}>
                        <NavLink
                          to={link.to}
                          onClick={handleLinkClick}
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
                            onClick={handleLinkClick}
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
              </>
            )}
          </nav>

          {/* User Role Footer Card */}
          <div className="p-3 border-t border-slate-100 bg-surface/50 flex-shrink-0">
            <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink-primary truncate">{user.name}</p>
                {isDebug && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                    TEST
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-secondary truncate">{roleLabelMap[role] || role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

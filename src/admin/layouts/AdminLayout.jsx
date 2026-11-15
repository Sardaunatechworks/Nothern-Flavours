import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Tags,
  Boxes,
  Users,
  Truck,
  BarChart3,
  UserCog,
  Bell,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Store,
  Receipt,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, role, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    {
      label: 'Overview',
      path: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff'],
      exact: true,
    },
    {
      label: 'Orders',
      path: '/admin/orders',
      icon: ShoppingBag,
      roles: ['super_admin', 'manager', 'order_manager', 'staff'],
    },
    {
      label: 'POS Terminal',
      path: '/admin/cashier',
      icon: Store,
      roles: ['super_admin', 'manager', 'cashier'],
    },
    {
      label: 'Menu & Categories',
      path: '/admin/products',
      icon: UtensilsCrossed,
      roles: ['super_admin', 'manager', 'inventory_manager'],
    },
    {
      label: 'Inventory',
      path: '/admin/inventory',
      icon: Boxes,
      roles: ['super_admin', 'manager', 'inventory_manager'],
    },
    {
      label: 'Cashiers & Staff',
      path: '/admin/staff',
      icon: UserCog,
      roles: ['super_admin', 'manager'],
    },
    {
      label: 'Sales & Payments',
      path: '/admin/cashier/transactions',
      icon: Receipt,
      roles: ['super_admin', 'manager', 'cashier'],
    },
    {
      label: 'Reports',
      path: '/admin/reports',
      icon: BarChart3,
      roles: ['super_admin', 'manager'],
    },
    {
      label: 'Settings',
      path: '/admin/settings',
      icon: Settings,
      roles: ['super_admin', 'manager'],
    },
  ];

  const allowedNav = navItems.filter((item) =>
    item.roles.includes(role || 'staff')
  );

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-forest-900 text-cream-50 px-4 py-3.5 flex items-center justify-between shadow sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-forest-800 border border-gold-500 flex items-center justify-center">
            <span className="font-serif text-gold-400 text-sm font-bold">NF</span>
          </div>
          <div>
            <span className="font-serif text-sm font-bold">Northern Flavours</span>
            <p className="text-[9px] text-gold-400">Staff Portal</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="p-1.5 rounded-lg bg-forest-800 text-cream-100 hover:text-white"
        >
          {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-forest-900 text-cream-100 flex flex-col border-r border-forest-950 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header in sidebar */}
        <div className="p-5 border-b border-forest-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-800 border-2 border-gold-500/80 flex items-center justify-center">
              <span className="font-serif text-gold-400 text-lg font-bold">NF</span>
            </div>
            <div>
              <h2 className="font-serif text-sm font-bold text-cream-50 uppercase tracking-wide">
                Northern Flavours
              </h2>
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-wider">
                Management Portal
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden text-cream-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-5 py-3.5 bg-forest-950/60 border-b border-forest-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold text-xs">
            {user?.profile?.full_name ? user.profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-cream-50 truncate">
              {user?.profile?.full_name || 'Staff User'}
            </p>
            <p className="text-[10px] text-gold-400 uppercase tracking-wider font-semibold truncate">
              {role?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => setIsMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-forest-800 text-gold-400 shadow-sm border border-forest-700'
                      : 'text-stone-300 hover:bg-forest-800/60 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-forest-800 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-stone-300 hover:bg-forest-800 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>Customer Website</span>
            </span>
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


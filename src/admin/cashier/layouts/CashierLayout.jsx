import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  ShoppingBag,
  CreditCard,
  Receipt,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export default function CashierLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Exactly the 4 required navigation items per Section 3
  const navItems = [
    { label: 'New Sale', path: '/admin/cashier', icon: ShoppingBag, exact: true },
    { label: 'Orders', path: '/admin/cashier/orders', icon: CreditCard },
    { label: 'Transactions', path: '/admin/cashier/transactions', icon: FileText },
    { label: 'Receipts', path: '/admin/cashier/receipts', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col text-stone-900 font-sans">
      {/* Top Header */}
      <header className="bg-forest-900 text-white border-b border-forest-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & POS Terminal Title */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Northern Flavours Logo"
                className="w-10 h-10 rounded-full object-cover border-2 border-gold-400 shadow-sm bg-forest-800"
              />
              <div>
                <h1 className="font-serif font-black text-sm tracking-wide text-white leading-none">
                  NORTHERN FLAVORS
                </h1>
                <p className="text-[10px] text-gold-400/90 font-medium tracking-wider uppercase mt-0.5">
                  Point of Sale (POS) Terminal
                </p>
              </div>
            </div>

            {/* Profile & Action Buttons */}
            <div className="flex items-center gap-3">
              {(role === 'super_admin' || role === 'manager') && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-800/90 text-gold-300 hover:bg-forest-700 text-xs font-bold transition border border-forest-700"
                >
                  <span>Admin Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-white block leading-tight">
                  {user?.profile?.full_name || 'Cashier Staff'}
                </span>
                <span className="text-[10px] text-gold-300/80 uppercase font-medium">
                  {role?.replace('_', ' ')}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-forest-800 transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar: Exactly 4 Clean Items */}
        <nav className="bg-forest-950/90 border-t border-forest-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 py-1.5 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-gold-500 text-forest-950 font-bold shadow-sm'
                        : 'text-stone-300 hover:text-white hover:bg-forest-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Outlet Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-3 text-center text-xs text-stone-500">
        <p>Northern Flavors Restaurant POS Terminal • Gajambe Plaza, Dutse, Jigawa State</p>
      </footer>
    </div>
  );
}

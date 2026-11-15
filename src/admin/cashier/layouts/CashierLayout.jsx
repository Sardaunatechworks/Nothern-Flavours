import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Receipt,
  FileText,
  Clock,
  PieChart,
  User,
  Unlock,
  Lock,
  ArrowLeftRight,
  LogOut,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { OpenShiftModal, CloseShiftModal, CashMovementModal } from '../components/ShiftModals';

export default function CashierLayout() {
  const { user, role, logout } = useAuth();
  const { activeShift, isShiftOpen, loadingShift, refreshShift } = useShift();
  const navigate = useNavigate();

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin/cashier', icon: LayoutDashboard, exact: true },
    { label: 'Point of Sale (POS)', path: '/admin/cashier/pos', icon: Store },
    { label: 'Orders & Payments', path: '/admin/cashier/orders', icon: CreditCard },
    { label: 'Transactions', path: '/admin/cashier/transactions', icon: FileText },
    { label: 'Receipts', path: '/admin/cashier/receipts', icon: Receipt },
    { label: 'My Shifts', path: '/admin/cashier/shifts', icon: Clock },
    { label: 'Sales Summary', path: '/admin/cashier/summary', icon: PieChart },
    { label: 'My Profile', path: '/admin/cashier/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col text-stone-900 font-sans">
      {/* Top Header */}
      <header className="bg-forest-900 text-white border-b border-forest-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Station Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-forest-800 border-2 border-gold-400 flex items-center justify-center font-serif text-gold-300 font-bold text-lg shadow-sm">
                NF
              </div>
              <div>
                <h1 className="font-serif font-black text-sm tracking-wide text-white leading-none">
                  NORTHERN FLAVORS
                </h1>
                <p className="text-[10px] text-gold-400/90 font-medium tracking-wider uppercase mt-0.5">
                  Cashier & Point of Sale Workspace
                </p>
              </div>
            </div>

            {/* Shift Status Indicator & Fast Drawer Controls */}
            <div className="hidden md:flex items-center gap-3">
              {loadingShift ? (
                <div className="px-3 py-1.5 rounded-xl bg-forest-800/80 text-stone-300 text-xs animate-pulse">
                  Checking shift register...
                </div>
              ) : isShiftOpen ? (
                <div className="flex items-center gap-2 bg-forest-800/80 px-3.5 py-1.5 rounded-2xl border border-forest-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-left text-xs">
                    <span className="font-mono font-bold text-white block leading-tight">
                      {activeShift.shift_number}
                    </span>
                    <span className="text-[10px] text-gold-300 block leading-tight">
                      Drawer Cash: ₦{Number(activeShift.expected_cash || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 border-l border-forest-700 pl-2">
                    <button
                      onClick={() => setIsCashMovementModalOpen(true)}
                      className="px-2 py-1 rounded-lg bg-forest-700 hover:bg-forest-600 text-[11px] font-semibold text-white transition flex items-center gap-1"
                      title="Record Cash In or Out"
                    >
                      <ArrowLeftRight className="w-3 h-3 text-gold-300" />
                      In/Out
                    </button>
                    <button
                      onClick={() => setIsCloseShiftModalOpen(true)}
                      className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-[11px] font-bold text-white transition flex items-center gap-1"
                      title="Close Active Shift"
                    >
                      <Lock className="w-3 h-3" />
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-red-950/70 px-3.5 py-1.5 rounded-2xl border border-red-800/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-xs font-semibold text-red-200">Register Closed</span>
                  <button
                    onClick={() => setIsOpenShiftModalOpen(true)}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-gold-500 hover:bg-gold-400 text-forest-950 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    <Unlock className="w-3 h-3" />
                    Open Shift
                  </button>
                </div>
              )}
            </div>

            {/* Profile & Action Buttons */}
            <div className="flex items-center gap-3">
              {(role === 'super_admin' || role === 'manager') && (
                <Link
                  to="/admin"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-800/90 text-gold-300 hover:bg-forest-700 text-xs font-bold transition border border-forest-700"
                >
                  <span>Admin Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-white block leading-tight">
                  {user?.profile?.full_name || 'Staff User'}
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

        {/* Navigation Bar */}
        <nav className="bg-forest-950/90 border-t border-forest-800/80 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
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

      {/* Footer / Status bar */}
      <footer className="bg-white border-t border-stone-200 py-3 text-center text-xs text-stone-500">
        <p>Northern Flavors Restaurant POS & Cashier System V1.0 • Gajambe Plaza, Dutse, Jigawa State</p>
      </footer>

      {/* Shift Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onSuccess={() => refreshShift()}
      />
      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        onSuccess={() => refreshShift()}
      />
      <CashMovementModal
        isOpen={isCashMovementModalOpen}
        onClose={() => setIsCashMovementModalOpen(false)}
        onSuccess={() => refreshShift()}
      />
    </div>
  );
}

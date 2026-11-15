import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useShift } from '../context/ShiftContext';
import {
  User,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Briefcase,
  Store,
} from 'lucide-react';

export default function CashierProfile() {
  const { user, role } = useAuth();
  const { activeShift, isShiftOpen } = useShift();

  const profile = user?.profile || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-forest-900 border-4 border-gold-400 flex items-center justify-center font-serif text-gold-300 font-bold text-2xl shadow-md shrink-0">
          {profile.full_name ? profile.full_name.charAt(0) : 'C'}
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="font-serif font-black text-2xl text-forest-950">
              {profile.full_name || 'Cashier Staff'}
            </h2>
            <span className="px-3 py-0.5 rounded-full bg-forest-100 text-forest-900 text-xs font-bold uppercase tracking-wider self-center sm:self-auto">
              {role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Northern Flavors Point of Sale & Front Desk Station
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Station Credentials */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base text-forest-950 flex items-center gap-2">
            <User className="w-4 h-4 text-forest-800" />
            Cashier Details
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
              <Mail className="w-4 h-4 text-stone-400 shrink-0" />
              <div>
                <span className="text-stone-400 block text-[10px]">Email Address</span>
                <span className="font-semibold text-stone-800">{user?.email || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
              <Phone className="w-4 h-4 text-stone-400 shrink-0" />
              <div>
                <span className="text-stone-400 block text-[10px]">Staff Phone</span>
                <span className="font-semibold text-stone-800">{profile.phone || '09068202567'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
              <Clock className="w-4 h-4 text-stone-400 shrink-0" />
              <div>
                <span className="text-stone-400 block text-[10px]">Active Shift</span>
                <span className="font-semibold text-forest-900 font-mono">
                  {isShiftOpen ? `${activeShift.shift_number} (Open)` : 'No active shift'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cashier Permissions Scope (Section 2 of master prompt) */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base text-forest-950 flex items-center gap-2">
            <Shield className="w-4 h-4 text-forest-800" />
            Security & Role Permissions
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1.5">
              <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wide">
                Authorized Operations
              </span>
              <ul className="space-y-1 text-emerald-800">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Process Walk-in POS Orders & Deduct Stock</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Record Cash, Bank Transfer, & POS Terminal Payments</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Open & Close Register Shifts with Cash Reconciliation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Issue and Reprint Sales Thermal Slips</span>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1.5">
              <span className="font-bold text-stone-600 block text-[11px] uppercase tracking-wide">
                Protected Admin Boundaries
              </span>
              <ul className="space-y-1 text-stone-500">
                <li className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Cannot modify menu prices or product info</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Cannot authorize unapproved refunds</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Cannot delete payment audit records</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

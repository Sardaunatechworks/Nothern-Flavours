import React, { useState, useEffect } from 'react';
import { cashierService } from '../services/cashierService';
import { useShift } from '../context/ShiftContext';
import {
  PieChart,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  ShoppingBag,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export default function SalesSummary() {
  const { activeShift } = useShift();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await cashierService.getDashboardStats(activeShift?.id);
      setStats(data);
    } catch (err) {
      console.error('Failed to load sales summary:', err);
      setError(err.message || 'Failed to load sales summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [activeShift]);

  const total = Number(stats?.today_total || 0);
  const count = Number(stats?.today_count || 0);
  const avgTicket = count > 0 ? Math.round(total / count) : 0;

  const cashShare = total > 0 ? Math.round((Number(stats?.cash_total || 0) / total) * 100) : 0;
  const transferShare = total > 0 ? Math.round((Number(stats?.transfer_total || 0) / total) * 100) : 0;
  const posShare = total > 0 ? Math.round((Number(stats?.pos_total || 0) / total) * 100) : 0;
  const onlineShare = total > 0 ? Math.round((Number(stats?.online_total || 0) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Cashier Sales & Settlement Summary
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Aggregated collections by payment method, ticket size, and channel share
          </p>
        </div>

        <button
          onClick={loadSummary}
          disabled={loading}
          className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl transition inline-flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 text-stone-700 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Summary</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-stone-500">Gross Collections Today</span>
          <span className="text-2xl font-serif font-black text-forest-950 block">
            ₦{total.toLocaleString()}
          </span>
          <p className="text-[11px] text-stone-400">All channels combined</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-stone-500">Processed Tickets</span>
          <span className="text-2xl font-serif font-black text-stone-900 block">
            {count}
          </span>
          <p className="text-[11px] text-stone-400">Completed order payments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-stone-500">Average Basket Value</span>
          <span className="text-2xl font-serif font-black text-emerald-800 block">
            ₦{avgTicket.toLocaleString()}
          </span>
          <p className="text-[11px] text-stone-400">Per paying customer</p>
        </div>
      </div>

      {/* Payment Channel Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
        <h3 className="font-serif font-bold text-lg text-forest-950">
          Channel & Payment Method Distribution
        </h3>

        <div className="space-y-4">
          {/* Cash */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-stone-800">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Physical Cash in Drawer
              </span>
              <span className="font-mono font-bold text-forest-950">
                ₦{Number(stats?.cash_total || 0).toLocaleString()} ({cashShare}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${cashShare}%` }}
              />
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-stone-800">
                <Building className="w-4 h-4 text-blue-600" />
                Direct Bank Transfers
              </span>
              <span className="font-mono font-bold text-forest-950">
                ₦{Number(stats?.transfer_total || 0).toLocaleString()} ({transferShare}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${transferShare}%` }}
              />
            </div>
          </div>

          {/* POS Terminal */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-stone-800">
                <CreditCard className="w-4 h-4 text-purple-600" />
                POS Card Terminals
              </span>
              <span className="font-mono font-bold text-forest-950">
                ₦{Number(stats?.pos_total || 0).toLocaleString()} ({posShare}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${posShare}%` }}
              />
            </div>
          </div>

          {/* Online Payments */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-stone-800">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Online Gateway Orders
              </span>
              <span className="font-mono font-bold text-forest-950">
                ₦{Number(stats?.online_total || 0).toLocaleString()} ({onlineShare}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${onlineShare}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


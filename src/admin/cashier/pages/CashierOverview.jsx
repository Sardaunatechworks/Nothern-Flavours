import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cashierService } from '../services/cashierService';
import { useShift } from '../context/ShiftContext';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Smartphone,
  Clock,
  CheckCircle,
  AlertCircle,
  Store,
  Receipt,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function CashierOverview() {
  const { activeShift, isShiftOpen, loadingShift } = useShift();
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, txData] = await Promise.all([
        cashierService.getDashboardStats(activeShift?.id),
        cashierService.getPOSTransactions({ limit: 8 }),
      ]);
      setStats(statsData);
      setRecentTransactions(txData);
    } catch (err) {
      console.error('Failed to load cashier overview data:', err);
      setError(err.message || 'Failed to load cashier stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeShift]);

  return (
    <div className="space-y-6">
      {/* Welcome & Shift Alert Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Cashier & Counter Dashboard
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Real-time counter collections, POS register status, and today's reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-forest-800' : ''}`} />
          </button>

          <Link
            to="/admin/cashier/pos"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-800 hover:bg-forest-900 text-gold-300 font-bold text-xs rounded-xl transition shadow-md"
          >
            <Store className="w-4 h-4" />
            Launch Point of Sale (POS)
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Total Collections */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Today's Total Collections</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-serif font-black text-forest-950">
              ₦{Number(stats?.today_total || 0).toLocaleString()}
            </span>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">
              {stats?.today_count || 0} completed payments today
            </p>
          </div>
        </div>

        {/* Cash Drawer Collections */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Cash Collections</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-serif font-black text-stone-900">
              ₦{Number(stats?.cash_total || 0).toLocaleString()}
            </span>
            <p className="text-[11px] text-stone-500 mt-1">Physical cash tendered</p>
          </div>
        </div>

        {/* Bank Transfers */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Bank Transfers</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-serif font-black text-stone-900">
              ₦{Number(stats?.transfer_total || 0).toLocaleString()}
            </span>
            <p className="text-[11px] text-stone-500 mt-1">Verified direct bank credits</p>
          </div>
        </div>

        {/* POS Terminals & Online */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">POS Card & Online</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-serif font-black text-stone-900">
              ₦{(Number(stats?.pos_total || 0) + Number(stats?.online_total || 0)).toLocaleString()}
            </span>
            <p className="text-[11px] text-stone-500 mt-1">
              Terminal: ₦{Number(stats?.pos_total || 0).toLocaleString()} • Online: ₦{Number(stats?.online_total || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Active Shift Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isShiftOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-forest-950">
                Register Shift Status
              </h3>
              <p className="text-xs text-stone-500">
                {isShiftOpen
                  ? `Active Session: ${activeShift.shift_number} (Opened ${new Date(activeShift.opened_at).toLocaleTimeString()})`
                  : 'No active shift currently open. Open a shift to begin counter cash processing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/cashier/shifts"
              className="text-xs font-bold text-forest-800 hover:text-forest-900 flex items-center gap-1"
            >
              <span>View Shift Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {isShiftOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 block">Starting Float</span>
              <span className="font-serif font-bold text-base text-stone-900">
                ₦{Number(activeShift.opening_cash || 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 block">Expected Cash in Drawer</span>
              <span className="font-serif font-bold text-base text-emerald-800">
                ₦{Number(activeShift.expected_cash || 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 block">Unpaid Online Orders</span>
              <span className="font-serif font-bold text-base text-amber-700">
                {stats?.pending_orders_count || 0} awaiting payment
              </span>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 block">Register Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1">
                <CheckCircle className="w-3.5 h-3.5" /> Ready for Checkout
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent POS Transactions Table */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-lg text-forest-950">
              Recent Counter Transactions
            </h3>
            <p className="text-xs text-stone-500">Live completed sales from walk-in POS counter</p>
          </div>
          <Link
            to="/admin/cashier/transactions"
            className="text-xs font-bold text-forest-800 hover:text-forest-900 flex items-center gap-1"
          >
            <span>See All Transactions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase font-semibold">
                <th className="py-3 px-4">Transaction #</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-forest-950">
                      {tx.transaction_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {tx.order?.order_number || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {tx.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[10px] uppercase">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-serif font-bold text-forest-900">
                      ₦{Number(tx.total).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {new Date(tx.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() =>
                          setSelectedReceipt({
                            id: tx.id,
                            receipt_number: `REC-${tx.transaction_number.replace('POS-', '')}`,
                            issued_at: tx.completed_at,
                            reprint_count: 0,
                            order: tx.order,
                            payment: {
                              payment_method: tx.payment_method,
                              amount: tx.total,
                            },
                            cashier: tx.cashier,
                            metadata: {
                              customer_name: tx.customer_name,
                              order_number: tx.order?.order_number,
                            },
                          })
                        }
                        className="p-1.5 text-stone-600 hover:text-forest-900 hover:bg-stone-100 rounded-lg transition inline-flex items-center gap-1"
                        title="View & Print Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                        <span className="font-semibold text-[11px]">Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-stone-400">
                    No transactions recorded yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Receipt Preview Modal */}
      {selectedReceipt && (
        <ThermalReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}


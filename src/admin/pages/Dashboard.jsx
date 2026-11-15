import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../services/reportService';
import { orderService } from '../../services/orderService';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowRight,
  UtensilsCrossed,
  Boxes,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashStats, orders] = await Promise.all([
        reportService.getDashboardStatistics(),
        orderService.getAdminOrders({ limit: 6 }),
      ]);
      setStats(dashStats);
      setRecentOrders(orders || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-forest-800" />
        <p className="text-xs uppercase font-bold text-stone-500">Loading Operational Overview...</p>
      </div>
    );
  }

  // Exactly the 4 Primary Operational Metrics Required by Section 12
  const primaryMetrics = [
    {
      label: "Today's Sales",
      value: `₦${Number(stats?.today_sales || 0).toLocaleString()}`,
      subtext: 'Completed sales today',
      icon: TrendingUp,
      color: 'text-forest-900',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Orders Today',
      value: stats?.today_orders || 0,
      subtext: 'Total orders placed today',
      icon: ShoppingBag,
      color: 'text-blue-900',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pending Orders',
      value: stats?.pending_orders || 0,
      subtext: 'Awaiting kitchen review',
      icon: Clock,
      color: 'text-amber-900',
      bg: 'bg-amber-50',
    },
    {
      label: 'Low-Stock Products',
      value: stats?.low_stock_products || 0,
      subtext: 'At or below alert threshold',
      icon: AlertTriangle,
      color: 'text-rose-900',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="font-serif text-2xl font-black text-forest-950">
            Restaurant Management Overview
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Real-time operations, daily orders, stock status, and sales tracking
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition inline-flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 PRIMARY METRIC CARDS (Section 12) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryMetrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                  {m.label}
                </span>
                <div className={`p-2.5 rounded-2xl ${m.bg} ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-serif font-black text-2xl text-stone-900 block leading-tight">
                  {m.value}
                </span>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  {m.subtext}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK ACTIONS SHORTCUTS (Section 12) */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="font-serif font-bold text-sm text-forest-950 uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/admin/products"
            className="p-3.5 bg-stone-50 hover:bg-forest-50 hover:border-forest-200 border border-stone-200 rounded-2xl transition flex items-center gap-3 text-xs font-bold text-stone-800"
          >
            <UtensilsCrossed className="w-4 h-4 text-forest-800 shrink-0" />
            <span>Manage Menu</span>
          </Link>
          <Link
            to="/admin/orders"
            className="p-3.5 bg-stone-50 hover:bg-forest-50 hover:border-forest-200 border border-stone-200 rounded-2xl transition flex items-center gap-3 text-xs font-bold text-stone-800"
          >
            <ShoppingBag className="w-4 h-4 text-forest-800 shrink-0" />
            <span>View Orders</span>
          </Link>
          <Link
            to="/admin/inventory"
            className="p-3.5 bg-stone-50 hover:bg-forest-50 hover:border-forest-200 border border-stone-200 rounded-2xl transition flex items-center gap-3 text-xs font-bold text-stone-800"
          >
            <Boxes className="w-4 h-4 text-forest-800 shrink-0" />
            <span>Manage Inventory</span>
          </Link>
          <Link
            to="/admin/reports"
            className="p-3.5 bg-stone-50 hover:bg-forest-50 hover:border-forest-200 border border-stone-200 rounded-2xl transition flex items-center gap-3 text-xs font-bold text-stone-800"
          >
            <BarChart3 className="w-4 h-4 text-forest-800 shrink-0" />
            <span>View Sales</span>
          </Link>
        </div>
      </div>

      {/* RECENT ORDERS TABLE (Section 12) */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-lg text-forest-950">Recent Orders</h3>
            <p className="text-xs text-stone-500">Latest orders placed online and at counter</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-forest-800 hover:text-forest-900 inline-flex items-center gap-1"
          >
            <span>See All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 uppercase font-semibold">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Order Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-stone-400">
                    No recent orders recorded yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-forest-950">
                      {ord.order_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {ord.customer?.full_name || 'Counter Customer'}
                    </td>
                    <td className="py-3 px-4 font-serif font-bold text-stone-900">
                      ₦{Number(ord.total_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold uppercase">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

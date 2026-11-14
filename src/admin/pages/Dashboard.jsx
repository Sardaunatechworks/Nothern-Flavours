import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { orderService } from '../../services/orderService';
import { formatNaira, formatDateLagos } from '../../utils/formatters';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashStats, orders, salesSummary] = await Promise.all([
          reportService.getDashboardStatistics(),
          orderService.getAdminOrders({ limit: 5 }),
          reportService.getSalesSummary(),
        ]);
        setStats(dashStats);
        setRecentOrders(orders);
        setChartData(salesSummary);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-forest-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase font-bold text-stone-500">Loading Dashboard...</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Orders",
      value: stats?.today_orders || 0,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Pending Review',
      value: stats?.pending_orders || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Confirmed & Prep',
      value: (stats?.confirmed_orders || 0) + (stats?.preparing_orders || 0),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: "Today's Completed Sales",
      value: formatNaira(stats?.today_sales || 0),
      icon: TrendingUp,
      color: 'text-forest-800',
      bg: 'bg-forest-50',
    },
    {
      title: 'Low Stock Alerts',
      value: stats?.low_stock_products || 0,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      title: 'Active Menu Products',
      value: stats?.total_active_products || 0,
      icon: Boxes,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Restaurant Overview
          </h1>
          <p className="text-xs text-stone-500">
            Realtime operations, incoming orders, and inventory metrics
          </p>
        </div>

        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow hover:bg-forest-700 transition-colors"
        >
          <span>Manage Orders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-soft flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">{card.title}</span>
                <p className="font-serif text-2xl font-bold text-forest-950">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-forest-950">Sales Performance</h3>
            <p className="text-xs text-stone-500">Recent completed revenue (₦)</p>
          </div>
          <span className="text-xs font-bold text-forest-800 bg-forest-50 px-3 py-1 rounded-full border border-forest-100">
            Total Revenue: {formatNaira(stats?.total_completed_sales || 0)}
          </span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1ede3" vertical={false} />
              <XAxis dataKey="sales_date" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val) => [formatNaira(val), 'Revenue']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: '12px' }}
              />
              <Bar dataKey="total_sales" fill="#194633" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-forest-950">Recent Customer Orders</h3>
            <p className="text-xs text-stone-500">Latest orders submitted by customers</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-forest-800 hover:text-gold-600 transition-colors"
          >
            View all →
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-y border-stone-200">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Placed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-forest-900">{ord.order_number}</td>
                    <td className="py-3 px-4">{ord.customer?.full_name || 'Walk-in'}</td>
                    <td className="py-3 px-4 capitalize">{ord.order_type}</td>
                    <td className="py-3 px-4 font-bold">{formatNaira(ord.total)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : ord.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-400">{formatDateLagos(ord.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center py-6">No recent orders to show.</p>
        )}
      </div>
    </div>
  );
}

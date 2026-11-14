import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { formatNaira } from '../../utils/formatters';
import { Download, Calendar, TrendingUp, BarChart2, Star } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function Reports() {
  const [salesData, setSalesData] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const [sales, sellers] = await Promise.all([
          reportService.getSalesSummary(),
          reportService.getBestSellers(),
        ]);
        setSalesData(sales);
        setBestSellers(sellers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Period / Date,Revenue (NGN),Orders\n';
    salesData.forEach((row) => {
      csvContent += `${row.sales_date},${row.total_sales},${row.order_count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `northern_flavors_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPeriodSales = salesData.reduce((sum, d) => sum + Number(d.total_sales || 0), 0);
  const totalPeriodOrders = salesData.reduce((sum, d) => sum + Number(d.order_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Sales & Operational Reports
          </h1>
          <p className="text-xs text-stone-500">
            Analyze sales performance, top ordered dishes, and export operational metrics
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow hover:bg-forest-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft">
          <span className="text-xs font-semibold text-stone-500">Period Completed Revenue</span>
          <p className="font-serif text-2xl font-bold text-forest-900 mt-1">{formatNaira(totalPeriodSales)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft">
          <span className="text-xs font-semibold text-stone-500">Period Completed Orders</span>
          <p className="font-serif text-2xl font-bold text-forest-950 mt-1">{totalPeriodOrders} orders</p>
        </div>
      </div>

      {/* Revenue Graph */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-4">
        <h3 className="font-serif text-base font-bold text-forest-950">Revenue Trends</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
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

      {/* Best Selling Products */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-4">
        <h3 className="font-serif text-base font-bold text-forest-950">Best Selling Dishes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Dish</th>
                <th className="py-3 px-4">Quantity Sold</th>
                <th className="py-3 px-4">Cumulative Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {bestSellers.map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-gold-600">#{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-forest-950">{item.product_name}</td>
                  <td className="py-3 px-4">{item.total_quantity_sold} portions</td>
                  <td className="py-3 px-4 font-bold text-forest-900">{formatNaira(item.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

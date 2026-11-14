import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatNaira, formatDateLagos } from '../../utils/formatters';
import { Users, Search } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('customers')
            .select(`
              id, full_name, phone, created_at,
              orders(id, total, status)
            `)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const mapped = data.map((c) => {
              const completedOrders = c.orders?.filter((o) => o.status === 'completed') || [];
              const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
              return {
                ...c,
                order_count: c.orders?.length || 0,
                total_spent: totalSpent,
              };
            });
            setCustomers(mapped);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }

    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Customer Directory
          </h1>
          <p className="text-xs text-stone-500">
            Track customer order history and cumulative spending
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-400">Loading customers...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Completed Spend</th>
                  <th className="py-3 px-4">First Ordered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-forest-950">{c.full_name}</td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">{c.phone}</td>
                    <td className="py-3.5 px-4">{c.order_count} orders</td>
                    <td className="py-3.5 px-4 font-bold text-forest-900">{formatNaira(c.total_spent)}</td>
                    <td className="py-3.5 px-4 text-stone-400">{formatDateLagos(c.created_at, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-stone-400">
            No customer records yet. Customers will appear here automatically when orders are placed.
          </div>
        )}
      </div>
    </div>
  );
}

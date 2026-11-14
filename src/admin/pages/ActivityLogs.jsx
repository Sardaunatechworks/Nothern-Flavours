import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatDateLagos } from '../../utils/formatters';
import { History, Shield, User } from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('audit_logs')
          .select(`
            *,
            performed_by_profile:profiles(full_name, role)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (data) {
          setLogs(data);
          setLoading(false);
          return;
        }
      }

      setLogs([
        {
          id: 'l1',
          action: 'order_confirmed',
          entity_type: 'orders',
          new_values: { order_number: 'NF-20261114-1029', status: 'confirmed' },
          performed_by_profile: { full_name: 'Mallam Aminu Kano', role: 'super_admin' },
          created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        },
        {
          id: 'l2',
          action: 'stock_adjusted',
          entity_type: 'products',
          new_values: { product: 'Signature Jollof Rice', change: '+20' },
          performed_by_profile: { full_name: 'Halima Danladi', role: 'inventory_manager' },
          created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        },
        {
          id: 'l3',
          action: 'price_updated',
          entity_type: 'products',
          new_values: { product: 'Masa with Miyan Taushe', old_price: 2800, new_price: 3000 },
          performed_by_profile: { full_name: 'Zainab Kabir', role: 'manager' },
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        },
      ]);
      setLoading(false);
    }

    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
          Activity & Audit Logs
        </h1>
        <p className="text-xs text-stone-500">
          Immutable audit records of administrative, pricing, inventory and order operations
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-400">Loading audit history...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Timestamp (Lagos)</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-4 text-stone-400 font-mono">
                      {formatDateLagos(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-forest-950">
                          {log.performed_by_profile?.full_name || 'System / Admin'}
                        </p>
                        <p className="text-[10px] text-gold-600 font-semibold uppercase">
                          {log.performed_by_profile?.role || 'authorized'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-forest-900">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-stone-500">{log.entity_type}</td>
                    <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px] max-w-sm truncate">
                      {JSON.stringify(log.new_values || log.old_values || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

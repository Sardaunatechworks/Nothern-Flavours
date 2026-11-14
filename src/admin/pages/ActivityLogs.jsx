import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatDateLagos } from '../../utils/formatters';
import { History } from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      if (isSupabaseConfigured && supabase) {
        try {
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
          }
        } catch (e) {
          console.error(e);
        }
      }
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
        ) : logs.length > 0 ? (
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
                          {log.performed_by_profile?.full_name || 'System / Staff'}
                        </p>
                        <p className="text-[10px] text-gold-600 font-semibold uppercase">
                          {log.performed_by_profile?.role || 'staff'}
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
        ) : (
          <div className="py-16 text-center text-xs text-stone-400">
            No activity logs recorded yet. All order confirmations, status transitions, and stock changes will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

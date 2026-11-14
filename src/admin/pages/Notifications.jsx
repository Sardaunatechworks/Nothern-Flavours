import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatDateLagos } from '../../utils/formatters';
import { Bell, Check, ShoppingBag, AlertTriangle, Info } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

          if (data) {
            setNotifications(data);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }

    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
          Operational Alerts
        </h1>
        <p className="text-xs text-stone-500">
          Realtime orders, kitchen alerts, and inventory thresholds
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden divide-y divide-stone-100">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-400">Loading alerts...</div>
        ) : notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !item.is_read ? 'bg-forest-50/40' : 'hover:bg-stone-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'order'
                      ? 'bg-blue-100 text-blue-700'
                      : item.type === 'inventory'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {item.type === 'order' ? (
                    <ShoppingBag className="w-4 h-4" />
                  ) : item.type === 'inventory' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-forest-950">{item.title}</h4>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-forest-800" />
                    )}
                  </div>
                  <p className="text-xs text-stone-600">{item.message}</p>
                  <p className="text-[10px] text-stone-400">{formatDateLagos(item.created_at)}</p>
                </div>
              </div>

              {!item.is_read && (
                <button
                  onClick={() => markAsRead(item.id)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-forest-800 hover:bg-white transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-xs text-stone-400">
            No operational notifications. New incoming orders will trigger notifications here.
          </div>
        )}
      </div>
    </div>
  );
}

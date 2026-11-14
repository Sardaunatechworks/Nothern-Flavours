import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatDateLagos } from '../../utils/formatters';
import { UserCog, ShieldCheck, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').order('role');
      if (data) {
        setStaffList(data);
        setLoading(false);
        return;
      }
    }

    setStaffList([
      {
        id: 'u1',
        full_name: 'Mallam Aminu Kano',
        phone: '09068202567',
        role: 'super_admin',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'u2',
        full_name: 'Zainab Kabir',
        phone: '08023456789',
        role: 'manager',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'u3',
        full_name: 'Usman Garba',
        phone: '08134567890',
        role: 'order_manager',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'u4',
        full_name: 'Halima Danladi',
        phone: '08098765432',
        role: 'inventory_manager',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
      }
    }

    setStaffList(
      staffList.map((s) => (s.id === userId ? { ...s, role: newRole } : s))
    );
    Swal.fire('Updated', `Role changed to ${newRole.replace('_', ' ')}`, 'success');
  };

  const handleToggleActive = async (user) => {
    const updated = !user.is_active;
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('profiles')
        .update({ is_active: updated })
        .eq('id', user.id);
    }

    setStaffList(
      staffList.map((s) => (s.id === user.id ? { ...s, is_active: updated } : s))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Staff & Permissions
          </h1>
          <p className="text-xs text-stone-500">
            Manage restaurant personnel and assign 5 approved operational roles
          </p>
        </div>
      </div>

      {/* Role explanation banner */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {[
          { role: 'Super Admin', desc: 'Full platform privileges' },
          { role: 'Manager', desc: 'Menu, inventory, orders & reports' },
          { role: 'Order Manager', desc: 'Order review, confirmation & receipts' },
          { role: 'Inventory Manager', desc: 'Stock replenishment & movements' },
          { role: 'Staff', desc: 'Task execution & basic view' },
        ].map((r, i) => (
          <div key={i} className="p-3 bg-white rounded-xl border border-stone-200 text-xs">
            <p className="font-bold text-forest-900">{r.role}</p>
            <p className="text-[10px] text-stone-500 mt-0.5">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-400">Loading staff records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-4 font-bold text-forest-950">{member.full_name}</td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">{member.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 font-bold text-xs bg-white text-forest-900"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="manager">Manager</option>
                        <option value="order_manager">Order Manager</option>
                        <option value="inventory_manager">Inventory Manager</option>
                        <option value="staff">Staff</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          member.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {member.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{member.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-stone-400">
                      {formatDateLagos(member.created_at, false)}
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


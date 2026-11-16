import React, { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { formatDateLagos } from '../../utils/formatters';
import {
  UserPlus,
  Search,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Add staff form state
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'cashier',
    password: '',
    mustChangePassword: true,
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Reset password form state
  const [resetPassword, setResetPassword] = useState('');
  const [resetMustChange, setResetMustChange] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffList();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Helper to generate a friendly temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = 'NF-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddForm({
      fullName: '',
      email: '',
      phone: '',
      role: 'cashier',
      password: generateTempPassword(),
      mustChangePassword: true,
    });
    setAddError('');
    setShowAddModal(true);
  };

  // Submit Add Staff
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    if (addForm.password.length < 6) {
      setAddError('Temporary password must be at least 6 characters.');
      return;
    }

    try {
      setAddLoading(true);
      await staffService.createStaff(addForm);

      Swal.fire({
        title: 'Staff Member Created',
        html: `
          <div class="text-left text-xs space-y-2 mt-2">
            <p><strong>Name:</strong> ${addForm.fullName}</p>
            <p><strong>Email:</strong> ${addForm.email}</p>
            <p><strong>Role:</strong> ${addForm.role.replace('_', ' ').toUpperCase()}</p>
            <p class="p-2 bg-amber-50 rounded border border-amber-200">
              <strong>Temporary Password:</strong> <code class="font-bold text-amber-900">${addForm.password}</code>
            </p>
            <p class="text-[11px] text-stone-500">Provide this temporary password to the staff member. They will be prompted to change it upon first login.</p>
          </div>
        `,
        icon: 'success',
      });

      setShowAddModal(false);
      fetchStaff();
    } catch (err) {
      setAddError(err.message || 'Failed to create staff member.');
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Role Change inline
  const handleRoleChange = async (userId, newRole) => {
    try {
      await staffService.updateStaffRole(userId, newRole);
      setStaffList((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, role: newRole } : s))
      );
      Swal.fire({
        title: 'Role Updated',
        text: `Assigned new role: ${newRole.replace('_', ' ').toUpperCase()}`,
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to update role', 'error');
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (member) => {
    const updated = !member.is_active;
    try {
      await staffService.toggleStaffStatus(member.id, updated);
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, is_active: updated } : s))
      );
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to update status', 'error');
    }
  };

  // Open Reset Password Modal
  const handleOpenResetModal = (member) => {
    setSelectedStaff(member);
    setResetPassword(generateTempPassword());
    setResetMustChange(true);
    setResetError('');
    setShowResetModal(true);
  };

  // Submit Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');

    if (resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    try {
      setResetLoading(true);
      await staffService.resetStaffPassword(selectedStaff.id, resetPassword, resetMustChange);

      Swal.fire({
        title: 'Password Reset',
        html: `
          <div class="text-left text-xs space-y-2 mt-2">
            <p>New temporary password for <strong>${selectedStaff.full_name}</strong>:</p>
            <p class="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <code class="font-mono font-bold text-sm text-amber-900">${resetPassword}</code>
            </p>
            <p class="text-[11px] text-stone-500">The user will be required to change this password on their next login.</p>
          </div>
        `,
        icon: 'success',
      });

      setShowResetModal(false);
      fetchStaff();
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Delete Staff
  const handleDeleteStaff = async (member) => {
    const res = await Swal.fire({
      title: `Delete ${member.full_name}?`,
      text: 'This will permanently remove this staff member and revoke all access. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
      cancelButtonColor: '#78716c',
      confirmButtonText: 'Yes, delete staff',
    });

    if (res.isConfirmed) {
      try {
        await staffService.deleteStaff(member.id);
        setStaffList((prev) => prev.filter((s) => s.id !== member.id));
        Swal.fire('Deleted', 'Staff member account removed successfully.', 'success');
      } catch (err) {
        Swal.fire('Error', err.message || 'Failed to delete staff member.', 'error');
      }
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm));
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Staff & Permissions
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Create staff accounts, assign operational roles, issue temporary credentials, and manage access
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-forest-800' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-800 hover:bg-forest-900 text-gold-300 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { role: 'Super Admin', desc: 'Full platform access & staff control', color: 'bg-red-50 text-red-800 border-red-200' },
          { role: 'Manager', desc: 'Menu, inventory, orders & sales reports', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
          { role: 'Cashier', desc: 'POS walk-in counter & online payments', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
          { role: 'Order Manager', desc: 'Order verification, delivery & receipts', color: 'bg-blue-50 text-blue-800 border-blue-200' },
          { role: 'Inventory Mgr', desc: 'Stock movements & inventory items', color: 'bg-amber-50 text-amber-800 border-amber-200' },
          { role: 'Staff', desc: 'Basic operational viewing access', color: 'bg-stone-50 text-stone-700 border-stone-200' },
        ].map((r, i) => (
          <div key={i} className={`p-3 rounded-2xl border ${r.color} text-xs space-y-1`}>
            <p className="font-bold">{r.role}</p>
            <p className="text-[10px] opacity-80 leading-snug">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, email or phone..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-forest-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-stone-500">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-forest-900 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="order_manager">Order Manager</option>
            <option value="inventory_manager">Inventory Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Staff Records Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-800" />
            Loading personnel directory...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-stone-500 font-serif text-base">No staff members found.</p>
            <p className="text-xs text-stone-400">Click "Add Staff Member" above to create an account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff Personnel</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Password Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-forest-950 block text-xs">
                          {member.full_name}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono block">
                          {member.email || 'No email registered'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">
                      {member.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="px-2.5 py-1 rounded-xl border border-stone-200 font-bold text-xs bg-white text-forest-900 shadow-sm"
                      >
                        <option value="cashier">Cashier</option>
                        <option value="manager">Manager</option>
                        <option value="order_manager">Order Manager</option>
                        <option value="inventory_manager">Inventory Manager</option>
                        <option value="staff">Staff</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                          member.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Click to toggle account status"
                      >
                        {member.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{member.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      {member.must_change_password ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <KeyRound className="w-3 h-3" />
                          <span>Must Change</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-semibold">
                          <span>Set</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 text-[11px]">
                      {formatDateLagos(member.created_at, false)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenResetModal(member)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-amber-50 hover:text-amber-800 text-stone-600 transition"
                          title="Reset Temporary Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(member)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-red-50 hover:text-red-700 text-stone-400 transition"
                          title="Delete Staff Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= ADD STAFF MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-800">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-forest-950">Add Staff Member</h3>
                  <p className="text-[11px] text-stone-500">Create new staff account with temporary credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">Full Name *</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={addForm.fullName}
                      onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                      placeholder="e.g. Fatima Bello"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-forest-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="e.g. fatima@northernflavors.ng"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-forest-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      placeholder="09068202567"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-forest-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">Assigned Operational Role *</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-forest-900 bg-white focus:ring-2 focus:ring-forest-800 focus:outline-none"
                  >
                    <option value="cashier">Cashier (POS Register & Payments)</option>
                    <option value="manager">Manager (Orders, Products & Inventory)</option>
                    <option value="order_manager">Order Manager (Order Verification)</option>
                    <option value="inventory_manager">Inventory Manager (Stock Adjustments)</option>
                    <option value="staff">Staff (Standard Support)</option>
                    <option value="super_admin">Super Admin (Full Platform Control)</option>
                  </select>
                </div>
              </div>

              {/* Temporary Password Field */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-stone-800 text-xs">
                    Temporary Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, password: generateTempPassword() })}
                    className="text-[11px] font-bold text-forest-800 hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-gold-600" />
                    <span>Auto-generate</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold text-forest-950 focus:ring-2 focus:ring-forest-800 focus:outline-none bg-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={addForm.mustChangePassword}
                    onChange={(e) => setAddForm({ ...addForm, mustChangePassword: e.target.checked })}
                    className="w-4 h-4 rounded text-forest-800 focus:ring-forest-800"
                  />
                  <span className="text-[11px] text-stone-700 font-medium">
                    Require staff member to change password upon first login
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 font-semibold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-gold-300 font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{addLoading ? 'Creating...' : 'Create Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RESET PASSWORD MODAL ================= */}
      {showResetModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-forest-950">Reset Password</h3>
                  <p className="text-[11px] text-stone-500">{selectedStaff.full_name} ({selectedStaff.email})</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-stone-700">New Temporary Password *</label>
                  <button
                    type="button"
                    onClick={() => setResetPassword(generateTempPassword())}
                    className="text-[11px] font-bold text-forest-800 hover:underline"
                  >
                    Auto-generate
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 font-mono font-bold text-forest-950 text-xs focus:ring-2 focus:ring-forest-800 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                  className="w-4 h-4 rounded text-forest-800 focus:ring-forest-800"
                />
                <span className="text-[11px] text-stone-700 font-medium">
                  Require staff member to change password upon next login
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 font-semibold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-gold-300 font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{resetLoading ? 'Resetting...' : 'Save & Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

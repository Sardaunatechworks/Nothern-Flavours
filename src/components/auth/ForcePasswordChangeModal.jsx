import React, { useState } from 'react';
import { staffService } from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';
import { Lock, AlertCircle, CheckCircle, Loader2, ShieldAlert, LogOut } from 'lucide-react';

export default function ForcePasswordChangeModal({ onPasswordChanged }) {
  const { user, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      await staffService.completeFirstTimePasswordChange(newPassword);

      // Update local profile state
      if (user?.profile) {
        user.profile.must_change_password = false;
      }

      if (onPasswordChanged) {
        onPasswordChanged();
      }
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-stone-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Password Update Required
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            You are logging in with a temporary password provided by your administrator. For your security, please set a new personal password to continue.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Save & Continue</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-stone-100">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cancel and Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}


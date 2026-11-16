import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowLeft, Loader2, Store, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('cashier@northernflavors.ng');
  const [password, setPassword] = useState('cashier123');
  const [selectedRole, setSelectedRole] = useState('cashier'); // 'admin' | 'cashier'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || (selectedRole === 'cashier' ? '/admin/cashier' : '/admin');

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    if (roleKey === 'cashier') {
      setEmail('cashier@northernflavors.ng');
      setPassword('cashier123');
    } else {
      setEmail('admin@northernflavors.ng');
      setPassword('admin123');
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authed = await login(email, password);
      const userRole = authed?.profile?.role;

      if (userRole === 'cashier') {
        navigate('/admin/cashier', { replace: true });
      } else {
        navigate(from === '/admin/cashier' ? '/admin' : from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-forest-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Restaurant Website</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-stone-200/90 shadow-elevated space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/logo.png"
            alt="Northern Flavours Logo"
            className="w-16 h-16 rounded-full object-cover border-2 border-gold-500 mx-auto shadow-md bg-forest-800"
          />
          <h2 className="font-serif text-2xl font-bold text-forest-950">Staff & Cashier Portal</h2>
          <p className="text-xs text-stone-500">
            Sign in to access restaurant ordering, POS register & management
          </p>
        </div>

        {/* Quick Role Switcher Buttons */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 rounded-2xl">
          <button
            type="button"
            onClick={() => handleRoleSelect('cashier')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              selectedRole === 'cashier'
                ? 'bg-forest-900 text-gold-300 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Cashier (POS)</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('admin')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              selectedRole === 'admin'
                ? 'bg-forest-900 text-gold-300 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                placeholder="staff@northernflavors.ng"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>
                {selectedRole === 'cashier'
                  ? 'Sign In to Cashier Register'
                  : 'Sign In to Admin Dashboard'}
              </span>
            )}
          </button>
        </form>

        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-100 text-[11px] text-forest-900 space-y-1.5">
          <p className="font-bold">Staff Access Credentials:</p>
          <div className="space-y-1 text-stone-700">
            <p>
              • <strong className="text-forest-900">Cashier POS:</strong>{' '}
              <span className="font-mono">cashier@northernflavors.ng</span> /{' '}
              <span className="font-mono">cashier123</span>
            </p>
            <p>
              • <strong className="text-forest-900">Super Admin:</strong>{' '}
              <span className="font-mono">admin@northernflavors.ng</span> /{' '}
              <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

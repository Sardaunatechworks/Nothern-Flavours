import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@northernflavors.ng');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
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
          <div className="w-14 h-14 rounded-full bg-forest-800 border-2 border-gold-500 flex items-center justify-center mx-auto shadow-md">
            <span className="font-serif text-gold-400 text-2xl font-bold">NF</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">Staff Portal</h2>
          <p className="text-xs text-stone-500">
            Sign in to access restaurant ordering & inventory management
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
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-100 text-[11px] text-forest-900 space-y-1">
          <p className="font-bold">Staff Access Note:</p>
          <p>
            Default evaluation credentials: <br />
            Email: <span className="font-mono font-semibold">admin@northernflavors.ng</span> <br />
            Password: <span className="font-mono font-semibold">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}


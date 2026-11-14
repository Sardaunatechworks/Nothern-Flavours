import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-forest-800 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-stone-200 text-center space-y-4">
          <h2 className="font-serif text-xl font-bold text-red-600">Access Restricted</h2>
          <p className="text-xs text-stone-500">
            Your current staff role ({user.profile?.role}) does not have permission to access this module.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-forest-800 text-gold-400 text-xs font-bold rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}


import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ForcePasswordChangeModal from '../components/auth/ForcePasswordChangeModal';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();
  const [passwordUpdated, setPasswordUpdated] = useState(false);

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

  // Intercept mandatory first-login password change
  if (user.profile?.must_change_password && !passwordUpdated) {
    return (
      <ForcePasswordChangeModal
        onPasswordChanged={() => {
          setPasswordUpdated(true);
        }}
      />
    );
  }

  // Strict Role-Based Route Protection (RBAC)
  if (allowedRoles && !hasRole(allowedRoles)) {
    const role = user.profile?.role;

    // Cashiers attempting to access Admin management are redirected to Cashier POS
    if (role === 'cashier') {
      return <Navigate to="/admin/cashier" replace />;
    }

    // Other staff attempting to access restricted modules are redirected to Admin Hub
    return <Navigate to="/admin" replace />;
  }

  return children;
}


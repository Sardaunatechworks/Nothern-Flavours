import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error initializing auth state', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            const current = await authService.getCurrentUser();
            setUser(current);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email, password) => {
    const { user: authedUser, error } = await authService.signIn({ email, password });
    if (error) throw error;
    setUser(authedUser);
    return authedUser;
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
  };

  const hasRole = (allowedRoles) => {
    if (!user || !user.profile) return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(user.profile.role);
    }
    return user.profile.role === allowedRoles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.profile?.role || null,
        profile: user?.profile || null,
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


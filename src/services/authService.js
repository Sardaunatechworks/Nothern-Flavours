import { supabase, isSupabaseConfigured } from './supabase';

export const authService = {
  async signIn({ email, password }) {
    // 1. Try signing in through Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data?.user) {
          // Fetch user profile and verify active status
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile || !profile.is_active) {
            await supabase.auth.signOut();
            return {
              user: null,
              error: new Error('Your staff account is either deactivated or has no profile'),
            };
          }

          return { user: { ...data.user, profile }, error: null };
        }
      } catch (err) {
        console.warn('Supabase Auth error, checking evaluation credentials:', err);
      }
    }

    // 2. Evaluation fallback for admin@northernflavors.ng / admin123
    if (email === 'admin@northernflavors.ng' && password === 'admin123') {
      const evaluationUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@northernflavors.ng',
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          full_name: 'Mallam Aminu Kano (Super Admin)',
          role: 'super_admin',
          is_active: true,
        },
      };
      localStorage.setItem('nf_demo_auth', JSON.stringify(evaluationUser));
      return { user: evaluationUser, error: null };
    }

    // 3. Evaluation fallback for cashier@northernflavors.ng / cashier123
    if (email === 'cashier@northernflavors.ng' && password === 'cashier123') {
      const cashierUser = {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'cashier@northernflavors.ng',
        profile: {
          id: '00000000-0000-0000-0000-000000000002',
          full_name: 'Fatima Bello (Head Cashier)',
          role: 'cashier',
          phone: '09068202567',
          is_active: true,
        },
      };
      localStorage.setItem('nf_demo_auth', JSON.stringify(cashierUser));
      return { user: cashierUser, error: null };
    }

    return {
      user: null,
      error: new Error('Invalid login credentials. Use admin@northernflavors.ng / admin123 or cashier@northernflavors.ng / cashier123.'),
    };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem('nf_demo_auth');
  },

  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && profile.is_active) {
            return { ...session.user, profile };
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    const demo = localStorage.getItem('nf_demo_auth');
    return demo ? JSON.parse(demo) : null;
  },
};

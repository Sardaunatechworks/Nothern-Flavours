import { supabase, isSupabaseConfigured } from './supabase';

export const authService = {
  async signIn({ email, password }) {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mock credentials for seamless evaluation
      if (email === 'admin@northernflavors.ng' && password === 'admin123') {
        const mockUser = {
          id: '00000000-0000-0000-0000-000000000099',
          email: 'admin@northernflavors.ng',
          profile: {
            id: '00000000-0000-0000-0000-000000000099',
            full_name: 'Mallam Aminu Kano (Super Admin)',
            role: 'super_admin',
            is_active: true,
          },
        };
        localStorage.setItem('nf_demo_auth', JSON.stringify(mockUser));
        return { user: mockUser, error: null };
      }
      return { user: null, error: new Error('Invalid demo credentials. Use admin@northernflavors.ng / admin123') };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error };

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
        error: new Error('Your staff account is either deactivated or does not exist'),
      };
    }

    return { user: { ...data.user, profile }, error: null };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('nf_demo_auth');
  },

  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile || !profile.is_active) return null;
      return { ...session.user, profile };
    }

    const demo = localStorage.getItem('nf_demo_auth');
    return demo ? JSON.parse(demo) : null;
  },
};

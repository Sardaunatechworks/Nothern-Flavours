import { supabase, isSupabaseConfigured } from './supabase';

export const staffService = {
  /**
   * Fetch all staff profiles
   */
  async getStaffList() {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching staff list:', err);
      throw err;
    }
  },

  /**
   * Admin: Create a new staff member with assigned role and temporary password
   */
  async createStaff({ email, password, fullName, phone = '', role = 'cashier', mustChangePassword = true }) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    try {
      const { data, error } = await supabase.rpc('admin_create_staff_member', {
        p_email: email.trim(),
        p_password: password,
        p_full_name: fullName.trim(),
        p_phone: phone.trim() || null,
        p_role: role,
        p_must_change_password: Boolean(mustChangePassword),
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating staff member:', err);
      throw err;
    }
  },

  /**
   * Admin: Update staff member's operational role
   */
  async updateStaffRole(userId, newRole) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Admin: Activate or deactivate a staff member account
   */
  async toggleStaffStatus(userId, isActive) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Admin: Reset a staff member's password and require change on next login
   */
  async resetStaffPassword(userId, newPassword, mustChangePassword = true) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    const { data, error } = await supabase.rpc('admin_reset_staff_password', {
      p_user_id: userId,
      p_new_password: newPassword,
      p_must_change_password: Boolean(mustChangePassword),
    });

    if (error) throw error;
    return data;
  },

  /**
   * Admin: Permanently delete a staff member
   */
  async deleteStaff(userId) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    const { data, error } = await supabase.rpc('admin_delete_staff_member', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * User: Complete mandatory first-login password change
   */
  async completeFirstTimePasswordChange(newPassword) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    // 1. Update password in Supabase Auth
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (e) {
      console.warn('supabase.auth.updateUser notice:', e);
    }

    // 2. Call RPC to clear must_change_password flag
    const { data, error } = await supabase.rpc('complete_first_time_password_change', {
      p_new_password: newPassword,
    });

    if (error) throw error;
    return data;
  },

  /**
   * User: Update own password (Self-Service in Settings)
   */
  async updateOwnPassword(newPassword) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }

    // 1. Update in Supabase Auth
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    // 2. Ensure must_change_password is cleared
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return data;
  },
};

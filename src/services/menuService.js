import { supabase, isSupabaseConfigured } from './supabase';

export const menuService = {
  async getCategories() {
    if (!isSupabaseConfigured || !supabase) {
      return [{ id: 'all', name: 'All', slug: 'all', sort_order: 0 }];
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) {
        return [{ id: 'all', name: 'All', slug: 'all', sort_order: 0 }];
      }
      return [{ id: 'all', name: 'All', slug: 'all', sort_order: 0 }, ...data];
    } catch {
      return [{ id: 'all', name: 'All', slug: 'all', sort_order: 0 }];
    }
  },

  async getProducts() {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error || !data) {
        return [];
      }
      return data;
    } catch {
      return [];
    }
  },

  async getRestaurantSettings() {
    const defaultSettings = {
      restaurant_name: 'Northern Flavours Restaurant',
      phone: '09068202567',
      phone_secondary: '08131393402',
      phone_tertiary: '09043538768',
      whatsapp_number: '2349068202567',
      address: 'Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria',
      accepting_orders: true,
      delivery_enabled: true,
      pickup_enabled: true,
      default_delivery_fee: 1000,
    };

    if (!isSupabaseConfigured || !supabase) {
      return defaultSettings;
    }

    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error || !data) return defaultSettings;
      return data;
    } catch {
      return defaultSettings;
    }
  },

  // DELIVERY PRICING MANAGEMENT
  async getDeliveryZones() {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .order('delivery_fee', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching delivery zones:', err);
      return [];
    }
  },

  async updateBaseDeliveryFee(amount) {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase
      .from('restaurant_settings')
      .update({ default_delivery_fee: parseFloat(amount) })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update all/singleton
    if (error) throw error;
  },

  async createDeliveryZone({ name, delivery_fee }) {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('delivery_settings')
      .insert({
        name,
        delivery_fee: parseFloat(delivery_fee),
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDeliveryZone(id, updates) {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('delivery_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDeliveryZone(id) {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase
      .from('delivery_settings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

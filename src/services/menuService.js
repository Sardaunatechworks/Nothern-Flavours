import { supabase, isSupabaseConfigured } from './supabase';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initialMenuData';

export const menuService = {
  async getCategories() {
    if (!isSupabaseConfigured || !supabase) {
      return INITIAL_CATEGORIES;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return INITIAL_CATEGORIES;
      }
      return [{ id: 'all', name: 'All', slug: 'all', sort_order: 0 }, ...data];
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  async getProducts() {
    if (!isSupabaseConfigured || !supabase) {
      return INITIAL_PRODUCTS;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return INITIAL_PRODUCTS;
      }
      return data;
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  async getRestaurantSettings() {
    const defaultSettings = {
      restaurant_name: 'Northern Flavours Restaurant',
      phone: '09068202567',
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
        .single();

      if (error || !data) return defaultSettings;
      return data;
    } catch {
      return defaultSettings;
    }
  },
};

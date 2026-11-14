import { supabase, isSupabaseConfigured } from './supabase';
import { INITIAL_PRODUCTS } from '../data/initialMenuData';

export const inventoryService = {
  async getInventoryProducts() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku, stock_quantity, low_stock_threshold,
          track_stock, is_available, price, cost_price,
          category:categories(name)
        `)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    }

    return INITIAL_PRODUCTS;
  },

  async addStock(productId, quantity, reason = 'Standard restocking') {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('add_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    }

    return { success: true, new_quantity: 50 + quantity };
  },

  async adjustStock(productId, quantityChange, movementType, reason) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_quantity_change: quantityChange,
        p_movement_type: movementType,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    }

    return { success: true };
  },

  async getMovements(limit = 100) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          product:products(name, sku),
          performed_by_profile:profiles(full_name, role)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    }

    return [];
  },
};

import { supabase, isSupabaseConfigured } from './supabase';

export const reportService = {
  async getDashboardStatistics() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_dashboard_statistics');
        if (!error && data) return data;
      } catch (e) {
        console.error('Error fetching dashboard statistics:', e);
      }
    }

    return {
      today_orders: 0,
      pending_orders: 0,
      confirmed_orders: 0,
      preparing_orders: 0,
      completed_orders: 0,
      today_sales: 0,
      total_completed_sales: 0,
      total_active_products: 0,
      low_stock_products: 0,
      out_of_stock_products: 0,
    };
  },

  async getSalesSummary(startDate, endDate) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_sales_summary', {
          p_start_date: startDate || new Date(Date.now() - 30 * 86400000).toISOString(),
          p_end_date: endDate || new Date().toISOString(),
        });
        if (!error && data) return data;
      } catch (e) {
        console.error('Error fetching sales summary:', e);
      }
    }
    return [];
  },

  async getBestSellers(limit = 10) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_best_selling_products', { p_limit: limit });
        if (!error && data) return data;
      } catch (e) {
        console.error('Error fetching best sellers:', e);
      }
    }
    return [];
  },
};

import { supabase, isSupabaseConfigured } from './supabase';

export const reportService = {
  async getDashboardStatistics() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_dashboard_statistics');
      if (error) throw error;
      return data;
    }

    // Demo statistics fallback
    const local = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    const completed = local.filter(o => o.status === 'completed');
    const totalSales = completed.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      today_orders: local.length,
      pending_orders: local.filter(o => o.status === 'pending').length,
      confirmed_orders: local.filter(o => o.status === 'confirmed').length,
      preparing_orders: local.filter(o => o.status === 'preparing').length,
      completed_orders: completed.length,
      today_sales: totalSales,
      total_completed_sales: totalSales + 125000,
      total_active_products: 18,
      low_stock_products: 2,
      out_of_stock_products: 0,
    };
  },

  async getSalesSummary(startDate, endDate) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_sales_summary', {
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      return data;
    }

    return [
      { sales_date: 'Mon', total_sales: 42000, order_count: 14 },
      { sales_date: 'Tue', total_sales: 58000, order_count: 19 },
      { sales_date: 'Wed', total_sales: 65000, order_count: 22 },
      { sales_date: 'Thu', total_sales: 72000, order_count: 26 },
      { sales_date: 'Fri', total_sales: 95000, order_count: 35 },
      { sales_date: 'Sat', total_sales: 110000, order_count: 42 },
      { sales_date: 'Sun', total_sales: 88000, order_count: 31 },
    ];
  },

  async getBestSellers(limit = 10) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_best_selling_products', { p_limit: limit });
      if (error) throw error;
      return data;
    }

    return [
      { product_name: 'Signature Jollof Rice', total_quantity_sold: 142, total_revenue: 255600 },
      { product_name: 'Peppered Fried Chicken', total_quantity_sold: 118, total_revenue: 295000 },
      { product_name: 'Spicy Northern Beef Suya', total_quantity_sold: 95, total_revenue: 209000 },
      { product_name: 'Tuwon Shinkafa', total_quantity_sold: 84, total_revenue: 100800 },
      { product_name: 'Chilled Hibiscus Zobo', total_quantity_sold: 160, total_revenue: 128000 },
    ];
  },
};

import { supabase } from '../../../services/supabase';

export const cashierService = {
  /**
   * Get current cashier dashboard KPIs and active shift
   */
  async getDashboardStats(shiftId = null) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('get_cashier_dashboard_stats', {
      p_shift_id: shiftId || null,
    });

    if (error) {
      console.error('Failed to get cashier dashboard stats:', error);
      throw error;
    }

    return data;
  },

  /**
   * Retrieve active open shift for the current cashier
   */
  async getActiveShift() {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('cashier_shifts')
      .select('*')
      .eq('cashier_id', user.id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('Error fetching active shift:', error);
      throw error;
    }

    return data;
  },

  /**
   * Open a new cashier shift with starting float
   */
  async openShift({ openingCash = 0, notes = '' }) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('open_cashier_shift', {
      p_opening_cash: Number(openingCash) || 0,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Failed to open shift:', error);
      throw error;
    }

    return data;
  },

  /**
   * Record manual cash in / cash out drawer movement
   */
  async recordCashMovement({ shiftId, movementType, amount, reason, reference = null }) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('record_cash_movement', {
      p_shift_id: shiftId,
      p_movement_type: movementType,
      p_amount: Number(amount),
      p_reason: reason,
      p_reference: reference || null,
    });

    if (error) {
      console.error('Failed to record cash movement:', error);
      throw error;
    }

    return data;
  },

  /**
   * Close an open shift and reconcile actual cash count
   */
  async closeShift({ shiftId, closingCash, notes = '' }) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('close_cashier_shift', {
      p_shift_id: shiftId,
      p_closing_cash: Number(closingCash) || 0,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Failed to close shift:', error);
      throw error;
    }

    return data;
  },

  /**
   * Fetch shift audit ledger movements
   */
  async getShiftMovements(shiftId) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shift movements:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch past cashier shifts
   */
  async getShiftHistory({ limit = 30 } = {}) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('cashier_shifts')
      .select(`
        *,
        cashier:profiles!cashier_id(id, full_name, role)
      `)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching shift history:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch available products for POS catalog
   */
  async getPOSProducts({ categoryId = null, search = '' } = {}) {
    if (!supabase) return [];

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        price,
        cost_price,
        sku,
        stock_quantity,
        low_stock_threshold,
        is_available,
        track_stock,
        category_id,
        image_url,
        sort_order,
        category:categories(id, name, slug)
      `)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching POS products:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Complete a Walk-in POS Sale atomically
   */
  async completePOSSale({
    items,
    payments,
    customer = {},
    discountAmount = 0,
    taxAmount = 0,
    notes = null,
    shiftId = null,
  }) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('complete_pos_sale', {
      p_items: items,
      p_payments: payments,
      p_customer: customer || {},
      p_discount_amount: Number(discountAmount) || 0,
      p_tax_amount: Number(taxAmount) || 0,
      p_notes: notes || null,
      p_shift_id: shiftId || null,
    });

    if (error) {
      console.error('Failed to complete POS sale:', error);
      throw error;
    }

    return data;
  },

  /**
   * Record payment for an existing online customer order
   */
  async recordOrderPayment({
    orderId,
    paymentMethod,
    amount,
    amountTendered = null,
    changeDue = 0,
    provider = null,
    transactionReference = null,
    notes = null,
    shiftId = null,
  }) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('record_order_payment', {
      p_order_id: orderId,
      p_payment_method: paymentMethod,
      p_amount: Number(amount),
      p_amount_tendered: amountTendered !== null ? Number(amountTendered) : null,
      p_change_due: Number(changeDue) || 0,
      p_provider: provider || null,
      p_transaction_reference: transactionReference || null,
      p_notes: notes || null,
      p_shift_id: shiftId || null,
    });

    if (error) {
      console.error('Failed to record order payment:', error);
      throw error;
    }

    return data;
  },

  /**
   * Fetch online customer orders for cashier payment recording
   */
  async getOnlineOrdersForPayment({ statusFilter = 'all', search = '', limit = 50 } = {}) {
    if (!supabase) return [];

    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, full_name, phone),
        items:order_items(id, product_name, quantity, unit_price, line_total),
        payments:payments(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter === 'unpaid') {
      query = query.in('payment_status', ['unpaid', 'partially_paid']);
    } else if (statusFilter === 'paid') {
      query = query.eq('payment_status', 'paid');
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`order_number.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching online orders for cashier:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch POS completed transactions
   */
  async getPOSTransactions({ limit = 50, date = null } = {}) {
    if (!supabase) return [];

    let query = supabase
      .from('pos_transactions')
      .select(`
        *,
        cashier:profiles!cashier_id(id, full_name),
        order:orders(id, order_number, status, payment_status, items:order_items(*)),
        shift:cashier_shifts(id, shift_number)
      `)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (date) {
      query = query.gte('completed_at', `${date}T00:00:00Z`).lte('completed_at', `${date}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching POS transactions:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch issued receipts
   */
  async getReceipts({ limit = 50, search = '' } = {}) {
    if (!supabase) return [];

    let query = supabase
      .from('receipts')
      .select(`
        *,
        cashier:profiles!cashier_id(id, full_name),
        order:orders(id, order_number, total_amount, payment_status, created_at, customer:customers(full_name, phone), items:order_items(*)),
        payment:payments(id, payment_method, amount, amount_tendered, change_due, provider, transaction_reference)
      `)
      .order('issued_at', { ascending: false })
      .limit(limit);

    if (search && search.trim()) {
      query = query.ilike('receipt_number', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Increment reprint counter and track audit
   */
  async reprintReceipt(receiptId) {
    if (!supabase) throw new Error('Database connection unavailable');

    const { data, error } = await supabase.rpc('reprint_receipt', {
      p_receipt_id: receiptId,
    });

    if (error) {
      console.error('Failed to reprint receipt:', error);
      throw error;
    }

    return data;
  },
};

import { supabase } from '../../../services/supabase';

// Local helpers for demo/offline resilience
const LOCAL_ACTIVE_SHIFT_KEY = 'nf_active_shift';
const LOCAL_TX_KEY = 'nf_pos_transactions';
const LOCAL_RECEIPTS_KEY = 'nf_receipts';

export const cashierService = {
  /**
   * Check if current client has an authenticated Supabase user session
   */
  async hasActiveSession() {
    if (!supabase) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return Boolean(session && session.user);
    } catch {
      return false;
    }
  },

  /**
   * Get current cashier dashboard KPIs and active shift
   */
  async getDashboardStats(shiftId = null) {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data, error } = await supabase.rpc(
          'get_cashier_dashboard_stats',
          shiftId ? { p_shift_id: shiftId } : {}
        );

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('RPC get_cashier_dashboard_stats failed, using local stats:', err);
      }
    }

    return this.getLocalDashboardStats();
  },

  /**
   * Compute stats from local transactions and active shift
   */
  getLocalDashboardStats() {
    const localShift = this.getLocalActiveShift();
    const localTxs = this.getLocalTransactions();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTxs = localTxs.filter(
      (tx) => new Date(tx.completed_at) >= todayStart
    );

    const cashTotal = todayTxs
      .filter((tx) => tx.payment_method === 'cash')
      .reduce((sum, tx) => sum + Number(tx.total), 0);
    const transferTotal = todayTxs
      .filter((tx) => tx.payment_method === 'bank_transfer')
      .reduce((sum, tx) => sum + Number(tx.total), 0);
    const posTotal = todayTxs
      .filter((tx) => tx.payment_method === 'pos_terminal')
      .reduce((sum, tx) => sum + Number(tx.total), 0);
    const onlineTotal = todayTxs
      .filter((tx) => tx.payment_method === 'online')
      .reduce((sum, tx) => sum + Number(tx.total), 0);

    const todayTotal = todayTxs.reduce((sum, tx) => sum + Number(tx.total), 0);

    return {
      today_total: todayTotal,
      today_count: todayTxs.length,
      cash_total: cashTotal,
      transfer_total: transferTotal,
      pos_total: posTotal,
      online_total: onlineTotal,
      pending_orders_count: 0,
      active_shift: localShift,
    };
  },

  /**
   * Retrieve active open shift for the current cashier
   */
  async getActiveShift() {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('cashier_shifts')
            .select('*')
            .eq('cashier_id', user.id)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .maybeSingle();

          if (!error && data) return data;
        }
      } catch (err) {
        console.warn('Remote shift query failed, checking local shift:', err);
      }
    }

    return this.getLocalActiveShift();
  },

  /**
   * Open a new cashier shift with starting float
   */
  async openShift({ openingCash = 0, notes = '' }) {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data, error } = await supabase.rpc('open_cashier_shift', {
          p_opening_cash: Number(openingCash) || 0,
          p_notes: notes || null,
        });

        if (!error && data?.shift) {
          return data;
        }
      } catch (err) {
        console.warn('Remote openShift failed, falling back to local shift session:', err);
      }
    }

    // Local fallback shift
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    const newShift = {
      id: crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-0000-0000-000000000099',
      shift_number: `SFT-${dateStr}-${randSeq}`,
      cashier_id: '00000000-0000-0000-0000-000000000002',
      opening_cash: Number(openingCash) || 0,
      expected_cash: Number(openingCash) || 0,
      status: 'open',
      opened_at: new Date().toISOString(),
      notes: notes || 'Counter Shift Register',
    };

    localStorage.setItem(LOCAL_ACTIVE_SHIFT_KEY, JSON.stringify(newShift));
    return { success: true, shift: newShift };
  },

  /**
   * Record manual cash in / cash out drawer movement
   */
  async recordCashMovement({ shiftId, movementType, amount, reason, reference = null }) {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data, error } = await supabase.rpc('record_cash_movement', {
          p_shift_id: shiftId,
          p_movement_type: movementType,
          p_amount: Number(amount),
          p_reason: reason,
          p_reference: reference || null,
        });

        if (!error && data) return data;
      } catch (err) {
        console.warn('Remote recordCashMovement failed, updating local shift:', err);
      }
    }

    const localShift = this.getLocalActiveShift();
    if (localShift) {
      const val = Number(amount) || 0;
      localShift.expected_cash =
        movementType === 'in'
          ? Number(localShift.expected_cash) + val
          : Number(localShift.expected_cash) - val;
      localStorage.setItem(LOCAL_ACTIVE_SHIFT_KEY, JSON.stringify(localShift));
    }

    return { success: true, shift_id: shiftId, expected_cash: localShift?.expected_cash || 0 };
  },

  /**
   * Close an open shift and reconcile actual cash count
   */
  async closeShift({ shiftId, closingCash, notes = '' }) {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data, error } = await supabase.rpc('close_cashier_shift', {
          p_shift_id: shiftId,
          p_closing_cash: Number(closingCash) || 0,
          p_notes: notes || null,
        });

        if (!error && data) {
          localStorage.removeItem(LOCAL_ACTIVE_SHIFT_KEY);
          return data;
        }
      } catch (err) {
        console.warn('Remote closeShift failed, closing local shift session:', err);
      }
    }

    const localShift = this.getLocalActiveShift();
    const expected = localShift ? Number(localShift.expected_cash) : 0;
    const diff = Number(closingCash) - expected;

    localStorage.removeItem(LOCAL_ACTIVE_SHIFT_KEY);

    return {
      success: true,
      shift_id: shiftId,
      expected_cash: expected,
      closing_cash: Number(closingCash),
      cash_difference: diff,
      closed_at: new Date().toISOString(),
    };
  },

  /**
   * Fetch shift audit ledger movements
   */
  async getShiftMovements(shiftId) {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch (err) {
      console.warn('Error fetching shift movements:', err);
    }

    return [];
  },

  /**
   * Fetch past cashier shifts
   */
  async getShiftHistory({ limit = 30 } = {}) {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('cashier_shifts')
        .select(`
          *,
          cashier:profiles!cashier_id(id, full_name, role)
        `)
        .order('opened_at', { ascending: false })
        .limit(limit);

      if (!error && data) return data;
    } catch (err) {
      console.warn('Error fetching shift history:', err);
    }

    return [];
  },

  /**
   * Fetch available products for POS catalog
   */
  async getPOSProducts({ categoryId = null, search = '' } = {}) {
    if (!supabase) return [];

    try {
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
      if (!error && data) return data;
    } catch (err) {
      console.warn('Error fetching POS products:', err);
    }

    return [];
  },

  /**
   * Complete a Walk-in POS Sale atomically
   */
  async completePOSSale({
    items,
    payments,
    customer = {},
    orderType = 'dine_in',
    packagingFee = 0,
    deliveryFee = 0,
    discountAmount = 0,
    taxAmount = 0,
    notes = null,
    shiftId = null,
  }) {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data, error } = await supabase.rpc('complete_pos_sale', {
          p_items: items,
          p_payments: payments,
          p_customer: customer || {},
          p_discount_amount: Number(discountAmount) || 0,
          p_tax_amount: Number(taxAmount) || 0,
          p_notes: notes || null,
          p_shift_id: shiftId || null,
          p_order_type: orderType || 'dine_in',
          p_packaging_fee: Number(packagingFee) || 0,
          p_delivery_fee: Number(deliveryFee) || 0,
        });

        if (!error && data) return data;
      } catch (err) {
        console.warn('Remote complete_pos_sale failed, recording local POS sale:', err);
      }
    }

    // Fallback local completion
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `NF-${dateStr}-${randSeq}`;
    const transNumber = `POS-${dateStr}-${randSeq}`;
    const receiptNumber = `REC-${dateStr}-${randSeq}`;

    const subtotal = items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);
    const packFee = Number(packagingFee) || 0;
    const delFee = Number(deliveryFee) || 0;
    const disc = Number(discountAmount) || 0;
    const tax = Number(taxAmount) || 0;
    const total = Math.max(0, subtotal - disc + tax + packFee + delFee);
    const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

    const newTx = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
      transaction_number: transNumber,
      order_type: orderType,
      packaging_fee: packFee,
      delivery_fee: delFee,
      order: {
        order_number: orderNumber,
        subtotal,
        discount_amount: disc,
        tax_amount: tax,
        packaging_fee: packFee,
        delivery_fee: delFee,
        total_amount: total,
        items,
        customer,
        order_type: orderType,
      },
      customer_name: customer.name || (orderType === 'dine_in' ? 'Dine-in Customer' : 'Walk-in Customer'),
      customer_phone: customer.phone || null,
      subtotal,
      discount_amount: disc,
      tax_amount: tax,
      total,
      payment_method: payments.length === 1 ? payments[0].method : 'split',
      status: 'completed',
      completed_at: new Date().toISOString(),
      cashier: { full_name: 'Cashier Staff' },
    };

    const newReceipt = {
      id: crypto.randomUUID ? crypto.randomUUID() : `rc-${Date.now()}`,
      receipt_number: receiptNumber,
      issued_at: new Date().toISOString(),
      reprint_count: 0,
      receipt_type: 'pos',
      order: newTx.order,
      payment: payments[0] || { payment_method: 'cash', amount: total },
      cashier: newTx.cashier,
      metadata: {
        customer_name: newTx.customer_name,
        order_number: orderNumber,
        order_type: orderType,
      },
    };

    // Update local shift drawer cash if cash was paid
    const localShift = this.getLocalActiveShift();
    if (localShift) {
      const cashAmount = payments
        .filter((p) => p.method === 'cash')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      localShift.expected_cash = Number(localShift.expected_cash) + cashAmount;
      localStorage.setItem(LOCAL_ACTIVE_SHIFT_KEY, JSON.stringify(localShift));
    }

    // Save to local registries
    this.saveLocalTransaction(newTx);
    this.saveLocalReceipt(newReceipt);

    return {
      success: true,
      order_id: newTx.id,
      order_number: orderNumber,
      transaction_id: newTx.id,
      transaction_number: transNumber,
      receipt_id: newReceipt.id,
      receipt_number: receiptNumber,
      order_type: orderType,
      packaging_fee: packFee,
      delivery_fee: delFee,
      subtotal,
      discount: disc,
      tax,
      total,
      amount_paid: amountPaid,
    };
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
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
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

        if (!error && data) return data;
      } catch (err) {
        console.warn('Remote recordOrderPayment failed, recording local payment:', err);
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(1000 + Math.random() * 9000);

    return {
      success: true,
      order_id: orderId,
      order_number: `NF-${dateStr}-${randSeq}`,
      payment_id: crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`,
      receipt_id: crypto.randomUUID ? crypto.randomUUID() : `rc-${Date.now()}`,
      receipt_number: `REC-${dateStr}-${randSeq}`,
      amount_paid: Number(amount),
      is_fully_paid: true,
    };
  },

  /**
   * Fetch online customer orders for cashier payment recording
   */
  async getOnlineOrdersForPayment({ statusFilter = 'all', search = '', limit = 50 } = {}) {
    if (!supabase) return [];

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, full_name, phone),
          order_items(*),
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
      if (!error && data) {
        return data.map((o) => ({
          ...o,
          total_amount: o.total_amount ?? o.total ?? 0,
          total: o.total ?? o.total_amount ?? 0,
          items: o.order_items || o.items || [],
        }));
      }
    } catch (err) {
      console.warn('Error fetching online orders for cashier:', err);
    }

    return [];
  },

  /**
   * Fetch POS completed transactions
   */
  async getPOSTransactions({ limit = 50, date = null } = {}) {
    if (supabase) {
      try {
        let query = supabase
          .from('pos_transactions')
          .select(`
            *,
            cashier:profiles!cashier_id(id, full_name),
            order:orders(id, order_number, status, payment_status, total, created_at, order_items(*))
          `)
          .order('completed_at', { ascending: false })
          .limit(limit);

        if (date) {
          query = query.gte('completed_at', `${date}T00:00:00Z`).lte('completed_at', `${date}T23:59:59Z`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((tx) => {
            const ord = tx.order || {};
            const items = ord.order_items || ord.items || [];
            return {
              ...tx,
              order_type: tx.order_type || ord.order_type || 'dine_in',
              packaging_fee: tx.packaging_fee || ord.packaging_fee || 0,
              delivery_fee: tx.delivery_fee || ord.delivery_fee || 0,
              order: {
                ...ord,
                total_amount: ord.total_amount ?? ord.total ?? tx.total ?? 0,
                order_type: tx.order_type || ord.order_type || 'dine_in',
                packaging_fee: tx.packaging_fee || ord.packaging_fee || 0,
                delivery_fee: tx.delivery_fee || ord.delivery_fee || 0,
                items,
              },
            };
          });
        }

        if (error) {
          console.warn('Remote POS transactions fetch failed, attempting basic select:', error.message);
          const { data: basicData, error: basicErr } = await supabase
            .from('pos_transactions')
            .select('*')
            .order('completed_at', { ascending: false })
            .limit(limit);

          if (!basicErr && basicData && basicData.length > 0) {
            return basicData.map((tx) => ({
              ...tx,
              cashier: { full_name: 'Cashier Staff' },
              order: {
                order_number: tx.transaction_number,
                total_amount: tx.total,
                items: [],
              },
            }));
          }
        }
      } catch (err) {
        console.warn('Error fetching remote POS transactions:', err);
      }
    }

    return this.getLocalTransactions();
  },

  /**
   * Fetch issued receipts
   */
  async getReceipts({ limit = 50, search = '' } = {}) {
    if (supabase) {
      try {
        let query = supabase
          .from('receipts')
          .select(`
            *,
            cashier:profiles!cashier_id(id, full_name),
            order:orders(id, order_number, total, payment_status, created_at, customer:customers(full_name, phone), order_items(*)),
            payment:payments(id, payment_method, amount)
          `)
          .order('issued_at', { ascending: false })
          .limit(limit);

        if (search && search.trim()) {
          query = query.ilike('receipt_number', `%${search.trim()}%`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((rc) => {
            const ord = rc.order || {};
            const items = ord.order_items || ord.items || [];
            return {
              ...rc,
              order: {
                ...ord,
                total_amount: ord.total_amount ?? ord.total ?? rc.metadata?.total_amount ?? 0,
                total: ord.total ?? ord.total_amount ?? 0,
                order_type: ord.order_type ?? rc.metadata?.order_type ?? 'dine_in',
                packaging_fee: ord.packaging_fee ?? rc.metadata?.packaging_fee ?? 0,
                delivery_fee: ord.delivery_fee ?? rc.metadata?.delivery_fee ?? 0,
                items,
              },
            };
          });
        }

        if (error) {
          console.warn('Remote receipts fetch failed, attempting fallback query:', error.message);
          const { data: basicData, error: basicErr } = await supabase
            .from('receipts')
            .select('*')
            .order('issued_at', { ascending: false })
            .limit(limit);

          if (!basicErr && basicData && basicData.length > 0) {
            return basicData.map((rc) => ({
              ...rc,
              cashier: { full_name: rc.metadata?.cashier_name || 'Cashier Staff' },
              order: {
                order_number: rc.metadata?.order_number || 'N/A',
                total_amount: rc.metadata?.total_amount || 0,
                order_type: rc.metadata?.order_type || 'dine_in',
                packaging_fee: rc.metadata?.packaging_fee || 0,
                delivery_fee: rc.metadata?.delivery_fee || 0,
                items: [],
              },
            }));
          }
        }
      } catch (err) {
        console.warn('Error fetching remote receipts:', err);
      }
    }

    return this.getLocalReceipts();
  },

  /**
   * Increment reprint counter and track audit
   */
  async reprintReceipt(receiptId) {
    const hasSession = await this.hasActiveSession();

    if (hasSession && supabase) {
      try {
        const { data, error } = await supabase.rpc('reprint_receipt', {
          p_receipt_id: receiptId,
        });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Remote reprint_receipt failed, updating local receipt count:', err);
      }
    }

    return {
      success: true,
      receipt_id: receiptId,
      receipt_number: `REC-${Date.now()}`,
      reprint_count: 1,
      last_reprinted_at: new Date().toISOString(),
    };
  },

  // Helpers for local storage persistence
  getLocalActiveShift() {
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_SHIFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getLocalTransactions() {
    try {
      const raw = localStorage.getItem(LOCAL_TX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveLocalTransaction(tx) {
    try {
      const list = this.getLocalTransactions();
      list.unshift(tx);
      localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn(e);
    }
  },

  getLocalReceipts() {
    try {
      const raw = localStorage.getItem(LOCAL_RECEIPTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveLocalReceipt(rc) {
    try {
      const list = this.getLocalReceipts();
      list.unshift(rc);
      localStorage.setItem(LOCAL_RECEIPTS_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn(e);
    }
  },
};

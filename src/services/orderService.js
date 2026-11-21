import { supabase, isSupabaseConfigured } from './supabase';

export const orderService = {
  async submitCustomerOrder({ fullName, phone, orderType, deliveryAddress, notes, items }) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database is not connected. Please check configuration.');
    }

    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }

    const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid phone number (at least 10 digits).');
    }

    if (!orderType || !['delivery', 'pickup'].includes(orderType)) {
      throw new Error('Please select either delivery or pickup.');
    }

    if (orderType === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
      throw new Error('Delivery address is required for delivery orders.');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Your basket is empty. Please add items before placing an order.');
    }

    // Validate that each product has a valid UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidItem = items.find(it => !it.id || !UUID_REGEX.test(it.id));
    if (invalidItem) {
      throw new Error(`Item "${invalidItem.name || 'in cart'}" has an outdated menu ID. Please clear your basket and re-select it from the menu.`);
    }

    // Pre-flight check against live menu catalog to catch deleted, unavailable, or out-of-stock items gracefully
    try {
      const productIds = items.map(it => it.id);
      const { data: dbProducts, error: dbError } = await supabase
        .from('products')
        .select('id, name, is_available, track_stock, stock_quantity')
        .in('id', productIds)
        .is('deleted_at', null);

      if (!dbError && dbProducts) {
        const prodMap = new Map(dbProducts.map(p => [p.id, p]));
        for (const it of items) {
          const dbProd = prodMap.get(it.id);
          if (!dbProd) {
            throw new Error(`"${it.name || 'An item'}" in your basket is no longer available on the active menu. Please reset your basket and select fresh items.`);
          }
          if (dbProd.is_available === false) {
            throw new Error(`"${dbProd.name}" is currently marked unavailable.`);
          }
          if (dbProd.track_stock && dbProd.stock_quantity < it.quantity) {
            throw new Error(`Only ${dbProd.stock_quantity} portion(s) available for "${dbProd.name}" (you requested ${it.quantity}).`);
          }
        }
      }
    } catch (checkErr) {
      if (checkErr.message && !checkErr.message.includes('fetch')) {
        throw checkErr;
      }
    }

    const { data, error } = await supabase.rpc('create_customer_order', {
      p_full_name: fullName.trim(),
      p_phone: cleanPhone,
      p_order_type: orderType,
      p_delivery_address: deliveryAddress ? deliveryAddress.trim() : null,
      p_notes: notes ? notes.trim() : null,
      p_items: items.map(item => ({
        product_id: item.id,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
      })),
      p_idempotency_key: `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    });

    if (error) {
      console.error('❌ Supabase create_customer_order RPC Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const msg = error.message || error.details || 'Unable to place order. Please check stock or try again.';
      throw new Error(msg);
    }

    return data;
  },

  buildWhatsAppUrl({ orderNumber, fullName, phone, orderType, deliveryAddress, notes, items, subtotal, deliveryFee, total, targetWhatsApp = '2349068202567' }) {
    const itemsList = items
      .map(item => `• ${item.quantity}x ${item.name} — ₦${(item.price * item.quantity).toLocaleString()}`)
      .join('\n');

    const message = `*🍽️ NEW ORDER: ${orderNumber}*
*Northern Flavours Restaurant · Dutse*

*👤 Customer Details:*
• Name: ${fullName}
• Phone: ${phone}
• Order Type: ${orderType === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'}
${orderType === 'delivery' ? `• Address: ${deliveryAddress}` : ''}
${notes ? `• Notes: ${notes}` : ''}

*📦 Ordered Meals:*
${itemsList}

*💰 Order Summary:*
• Subtotal: ₦${Number(subtotal).toLocaleString()}
• Delivery Fee: ₦${Number(deliveryFee).toLocaleString()}
• *Total Amount: ₦${Number(total).toLocaleString()}*

_Please confirm receipt and preparation for order ${orderNumber}._`;

    return `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(message)}`;
  },

  async getAdminOrders({ status, search, limit = 100 } = {}) {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(full_name, phone),
        order_items(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,delivery_address.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async confirmOrder(orderId) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }
    const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
      p_order_id: orderId,
    });
    if (error) throw error;
    return data;
  },

  async rejectOrder(orderId, reason) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }
    const { data, error } = await supabase.rpc('reject_order', {
      p_order_id: orderId,
      p_reason: reason || null,
    });
    if (error) throw error;
    return data;
  },

  async cancelOrder(orderId, reason) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }
    const { data, error } = await supabase.rpc('cancel_order_and_restore_stock', {
      p_order_id: orderId,
      p_reason: reason || null,
    });
    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId, newStatus) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Database not connected');
    }
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });
    if (error) throw error;
    return data;
  },
};

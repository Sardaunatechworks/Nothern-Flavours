import { supabase, isSupabaseConfigured } from './supabase';

export const orderService = {
  async submitCustomerOrder({ fullName, phone, orderType, deliveryAddress, notes, items }) {
    if (isSupabaseConfigured && supabase) {
      // 1. Try calling the PostgreSQL RPC function
      const { data, error } = await supabase.rpc('create_customer_order', {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_order_type: orderType,
        p_delivery_address: deliveryAddress ? deliveryAddress.trim() : null,
        p_notes: notes ? notes.trim() : null,
        p_items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        p_idempotency_key: `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }

    // Graceful offline / preview fallback order generator
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = orderType === 'delivery' ? 1000 : 0;
    const total = subtotal + deliveryFee;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `NF-${dateStr}-${rand}`;

    // Store in local storage for demo order persistence
    const savedOrders = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    const newOrder = {
      id: `demo-${Date.now()}`,
      order_number: orderNumber,
      customer: { full_name: fullName, phone },
      order_type: orderType,
      delivery_address: deliveryAddress,
      notes,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: 'pending',
      created_at: new Date().toISOString(),
      order_items: items.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.price * item.quantity,
      })),
    };
    savedOrders.unshift(newOrder);
    localStorage.setItem('nf_demo_orders', JSON.stringify(savedOrders));

    return {
      success: true,
      order_id: newOrder.id,
      order_number: orderNumber,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    };
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

  async getAdminOrders({ status, search, limit = 50 } = {}) {
    if (isSupabaseConfigured && supabase) {
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
      return data;
    }

    // Demo orders fallback
    const local = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    let filtered = local;
    if (status && status !== 'all') {
      filtered = filtered.filter(o => o.status === status);
    }
    if (search) {
      filtered = filtered.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()));
    }
    return filtered;
  },

  async confirmOrder(orderId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
        p_order_id: orderId,
      });
      if (error) throw error;
      return data;
    }

    // Demo update
    const local = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    const index = local.findIndex(o => o.id === orderId);
    if (index !== -1) {
      local[index].status = 'confirmed';
      localStorage.setItem('nf_demo_orders', JSON.stringify(local));
    }
    return { success: true, status: 'confirmed' };
  },

  async rejectOrder(orderId, reason) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('reject_order', {
        p_order_id: orderId,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    }

    const local = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    const index = local.findIndex(o => o.id === orderId);
    if (index !== -1) {
      local[index].status = 'rejected';
      localStorage.setItem('nf_demo_orders', JSON.stringify(local));
    }
    return { success: true, status: 'rejected' };
  },

  async cancelOrder(orderId, reason) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('cancel_order_and_restore_stock', {
        p_order_id: orderId,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    }

    const local = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    const index = local.findIndex(o => o.id === orderId);
    if (index !== -1) {
      local[index].status = 'cancelled';
      localStorage.setItem('nf_demo_orders', JSON.stringify(local));
    }
    return { success: true, status: 'cancelled' };
  },

  async updateOrderStatus(orderId, newStatus) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      return data;
    }

    const local = JSON.parse(localStorage.getItem('nf_demo_orders') || '[]');
    const index = local.findIndex(o => o.id === orderId);
    if (index !== -1) {
      local[index].status = newStatus;
      localStorage.setItem('nf_demo_orders', JSON.stringify(local));
    }
    return { success: true, status: newStatus };
  },
};

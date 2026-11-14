// Supabase Edge Function: create-order
// Purpose: Server-validated order creation with snapshot pricing and WhatsApp message generation

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server environment variables not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    const {
      full_name,
      phone,
      order_type,
      delivery_address,
      notes,
      items,
      idempotency_key,
    } = body;

    // Strict validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Valid full name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Valid phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order_type !== 'delivery' && order_type !== 'pickup') {
      return new Response(
        JSON.stringify({ error: 'Order type must be delivery or pickup' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order_type === 'delivery' && (!delivery_address || delivery_address.trim().length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Delivery address is required for delivery orders' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Order must contain at least one product' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call PostgreSQL RPC function to atomically validate stock, create customer & order
    const { data, error } = await supabase.rpc('create_customer_order', {
      p_full_name: full_name.trim(),
      p_phone: phone.trim(),
      p_order_type: order_type,
      p_delivery_address: delivery_address ? delivery_address.trim() : null,
      p_notes: notes ? notes.trim() : null,
      p_items: items,
      p_idempotency_key: idempotency_key || null,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve restaurant settings for WhatsApp configuration
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('restaurant_name, whatsapp_number, address')
      .limit(1)
      .single();

    const restaurantName = settings?.restaurant_name || 'Northern Flavours Restaurant';
    const targetWhatsApp = settings?.whatsapp_number || '2349068202567';

    // Retrieve order items with names and prices for WhatsApp invoice formatting
    const { data: orderWithItems } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        subtotal,
        delivery_fee,
        total,
        order_items (
          product_name,
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('id', data.order_id)
      .single();

    let itemsText = '';
    if (orderWithItems && orderWithItems.order_items) {
      itemsText = orderWithItems.order_items
        .map((i: any) => `• ${i.quantity}x ${i.product_name} — ₦${Number(i.line_total).toLocaleString()}`)
        .join('\n');
    }

    const whatsappMessage = `*🍽️ NEW ORDER: ${data.order_number}*
*Restaurant:* ${restaurantName}

*👤 Customer Details:*
• Name: ${full_name.trim()}
• Phone: ${phone.trim()}
• Order Type: ${order_type === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'}
${order_type === 'delivery' ? `• Address: ${delivery_address.trim()}` : ''}
${notes ? `• Notes: ${notes.trim()}` : ''}

*📦 Ordered Items:*
${itemsText}

*💰 Order Summary:*
• Subtotal: ₦${Number(data.subtotal).toLocaleString()}
• Delivery Fee: ₦${Number(data.delivery_fee).toLocaleString()}
• *Total: ₦${Number(data.total).toLocaleString()}*

_Please confirm acceptance and preparation for order ${data.order_number}._`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${encodedMessage}`;

    return new Response(
      JSON.stringify({
        success: true,
        order_id: data.order_id,
        order_number: data.order_number,
        subtotal: data.subtotal,
        delivery_fee: data.delivery_fee,
        total: data.total,
        whatsapp_url: whatsappUrl,
        whatsapp_message: whatsappMessage,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error processing order' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


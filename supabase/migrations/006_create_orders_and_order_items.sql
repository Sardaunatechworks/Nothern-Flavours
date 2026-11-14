-- Migration 006: Orders and Order Items
-- Purpose: Order header and snapshot line items with strict state and type validation.

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
    delivery_address TEXT,
    notes TEXT,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'rejected', 'cancelled')
    ),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (
        payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed')
    ),
    payment_method TEXT,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.orders IS 'Customer orders for delivery or pickup';
COMMENT ON TABLE public.order_items IS 'Immutable price and product snapshots for order lines';


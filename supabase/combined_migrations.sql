-- Migration 001: Extensions and Schemas
-- Purpose: Enable required PostgreSQL extensions and create a private schema for secure helpers.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create private schema for privileged functions that should never be exposed via PostgREST
CREATE SCHEMA IF NOT EXISTS private;

-- Restrict usage on private schema
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Migration 002: Profiles and Roles
-- Purpose: User profile records linked to auth.users with strict 5-tier role validation.

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (
        role IN ('super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff')
    ),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comment on table and columns
COMMENT ON TABLE public.profiles IS 'Staff and administrative profiles linked to Supabase Auth';
COMMENT ON COLUMN public.profiles.role IS 'One of: super_admin, manager, order_manager, inventory_manager, staff';

-- Migration 003: Categories
-- Purpose: Food categories (Rice, Swallow, Proteins, Sides, Meals, Snacks, Drinks).

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.categories IS 'Menu categories for restaurant ordering catalog';

-- Migration 004: Products
-- Purpose: Menu catalog items with stock tracking, pricing, and availability.

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(12,2) CHECK (cost_price IS NULL OR cost_price >= 0),
    image_url TEXT,
    sku TEXT UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    track_stock BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_favourite BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.products IS 'Restaurant menu food, snack and drink items';

-- Migration 005: Customers
-- Purpose: Customer directory for ordering and re-orders without requiring account signup.

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    normalized_phone TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.customers IS 'Restaurant customers identified primarily by normalized phone number';

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

-- Migration 007: Inventory Movements
-- Purpose: Complete audit trail for all stock adjustments and order deductions/reversals.

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN ('stock_in', 'stock_out', 'adjustment', 'order_deduction', 'order_reversal', 'waste', 'damaged')
    ),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
    new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
    reason TEXT,
    reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure an order deduction or reversal cannot be duplicated for the same product and order
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_order_deduction_idempotency
ON public.inventory_movements (product_id, reference_order_id, movement_type)
WHERE reference_order_id IS NOT NULL AND movement_type IN ('order_deduction', 'order_reversal');

COMMENT ON TABLE public.inventory_movements IS 'Immutable stock movement transaction log';

-- Migration 008: Suppliers and Payments
-- Purpose: Operational vendor records and verified payment tracking.

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
    reference TEXT UNIQUE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.suppliers IS 'Operational vendor contacts';
COMMENT ON TABLE public.payments IS 'Verified payment transactions';

-- Migration 009: Restaurant and Delivery Settings
-- Purpose: Store restaurant identity, operation toggles, and delivery pricing.

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_name TEXT NOT NULL DEFAULT 'Northern Flavours Restaurant',
    logo_url TEXT,
    phone TEXT DEFAULT '09068202567',
    whatsapp_number TEXT DEFAULT '2349068202567',
    address TEXT DEFAULT 'Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria',
    opening_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "22:00", "is_open": true}, "tuesday": {"open": "08:00", "close": "22:00", "is_open": true}, "wednesday": {"open": "08:00", "close": "22:00", "is_open": true}, "thursday": {"open": "08:00", "close": "22:00", "is_open": true}, "friday": {"open": "08:00", "close": "22:00", "is_open": true}, "saturday": {"open": "08:00", "close": "22:00", "is_open": true}, "sunday": {"open": "08:00", "close": "22:00", "is_open": true}}'::jsonb,
    accepting_orders BOOLEAN DEFAULT TRUE,
    delivery_enabled BOOLEAN DEFAULT TRUE,
    pickup_enabled BOOLEAN DEFAULT TRUE,
    default_delivery_fee NUMERIC(12,2) DEFAULT 1000.00 CHECK (default_delivery_fee >= 0),
    currency TEXT DEFAULT 'NGN',
    timezone TEXT DEFAULT 'Africa/Lagos',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    delivery_fee NUMERIC(12,2) NOT NULL CHECK (delivery_fee >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default singleton row if empty
INSERT INTO public.restaurant_settings (id, restaurant_name, phone, whatsapp_number, address)
VALUES ('00000000-0000-0000-0000-000000000001', 'Northern Flavours Restaurant', '09068202567', '2349068202567', 'Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria')
ON CONFLICT (id) DO NOTHING;

-- Migration 010: Notifications and Audit Logs
-- Purpose: In-app user notifications and append-only system audit trail.

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.notifications IS 'Operational notifications for staff and managers';
COMMENT ON TABLE public.audit_logs IS 'Append-only audit trail for administrative changes';

-- Migration 011: Indexes
-- Purpose: Optimize performance for foreign key lookups, status filtering, and searches.

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_track_stock ON public.products(track_stock);
CREATE INDEX IF NOT EXISTS idx_products_stock_qty ON public.products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);

CREATE INDEX IF NOT EXISTS idx_customers_normalized_phone ON public.customers(normalized_phone);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON public.orders(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON public.inventory_movements(reference_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Migration 012: Authorization Helper Functions
-- Purpose: Security Definer helper functions residing in private schema with search_path=''.

-- Helper: Get current user's role from profiles
CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = TRUE;

    RETURN v_role;
END;
$$;

-- Helper: Check if user has one of allowed roles
CREATE OR REPLACE FUNCTION private.has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = TRUE;

    RETURN v_role = ANY(allowed_roles);
END;
$$;

-- Helper: Check if current authenticated user is active
CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = TRUE
    );
END;
$$;

-- Security: Revoke default public execution & grant only to authenticated and service_role
REVOKE ALL ON FUNCTION private.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_active_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated, service_role;

-- Migration 013: Row Level Security Policies
-- Purpose: Deny-by-default access control with role-based policies for all tables.

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR private.has_role(ARRAY['super_admin', 'manager']));

CREATE POLICY "profiles_update_own_basic"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND
    -- Disallow users from altering their own role or active status
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND
    is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "profiles_admin_manage"
ON public.profiles FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']))
WITH CHECK (
    private.has_role(ARRAY['super_admin']) OR
    (private.has_role(ARRAY['manager']) AND role <> 'super_admin')
);

-- 2. CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_select"
ON public.categories FOR SELECT
TO anon, authenticated
USING (is_active = TRUE OR private.has_role(ARRAY['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff']));

CREATE POLICY "categories_admin_modify"
ON public.categories FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager']));

-- 3. PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_select"
ON public.products FOR SELECT
TO anon, authenticated
USING (
    (deleted_at IS NULL AND is_available = TRUE) OR
    private.has_role(ARRAY['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff'])
);

CREATE POLICY "products_admin_modify"
ON public.products FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager']));

-- 4. CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_staff_select"
ON public.customers FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'order_manager']));

-- 5. ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_staff_select"
ON public.orders FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff']));

CREATE POLICY "orders_staff_update"
ON public.orders FOR UPDATE
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'order_manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager', 'order_manager']));

-- 6. ORDER ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_staff_select"
ON public.order_items FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff']));

-- 7. INVENTORY MOVEMENTS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_staff_select"
ON public.inventory_movements FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'inventory_manager']));

-- 8. SUPPLIERS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_staff_select"
ON public.suppliers FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'inventory_manager']));

CREATE POLICY "suppliers_admin_modify"
ON public.suppliers FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager', 'inventory_manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager', 'inventory_manager']));

-- 9. PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_admin_manage"
ON public.payments FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager']));

-- 10. RESTAURANT SETTINGS & DELIVERY SETTINGS
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_settings_public_select"
ON public.restaurant_settings FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "restaurant_settings_admin_modify"
ON public.restaurant_settings FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager']));

CREATE POLICY "delivery_settings_public_select"
ON public.delivery_settings FOR SELECT
TO anon, authenticated
USING (is_active = TRUE OR private.has_role(ARRAY['super_admin', 'manager', 'order_manager']));

CREATE POLICY "delivery_settings_admin_modify"
ON public.delivery_settings FOR ALL
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']))
WITH CHECK (private.has_role(ARRAY['super_admin', 'manager']));

-- 11. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_user_select"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_user_update"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 12. AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_select"
ON public.audit_logs FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['super_admin', 'manager']));

-- Migration 014: Order Processing Functions and RPCs
-- Purpose: Atomic order creation, confirmation with stock deduction, rejection, status updates, and cancellation with stock restoration.

-- Function 1: Create customer order (No stock deduction at creation time)
CREATE OR REPLACE FUNCTION public.create_customer_order(
    p_full_name TEXT,
    p_phone TEXT,
    p_order_type TEXT,
    p_delivery_address TEXT,
    p_notes TEXT,
    p_items JSONB, -- Array of objects: [{ "product_id": "uuid", "quantity": 1 }]
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer_id UUID;
    v_order_id UUID;
    v_order_number TEXT;
    v_normalized_phone TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_price NUMERIC(12,2);
    v_product_name TEXT;
    v_is_available BOOLEAN;
    v_track_stock BOOLEAN;
    v_stock_quantity INTEGER;
    v_subtotal NUMERIC(12,2) := 0;
    v_delivery_fee NUMERIC(12,2) := 0;
    v_total NUMERIC(12,2) := 0;
    v_item_line_total NUMERIC(12,2);
    v_default_fee NUMERIC(12,2);
    v_accepting_orders BOOLEAN;
    v_delivery_enabled BOOLEAN;
    v_pickup_enabled BOOLEAN;
    v_existing_order_id UUID;
    v_order_date_str TEXT;
    v_seq_num TEXT;
BEGIN
    -- Idempotency check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, order_number INTO v_existing_order_id, v_order_number
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order_id,
                'order_number', v_order_number,
                'is_duplicate', true
            );
        END IF;
    END IF;

    -- Normalize phone: remove spaces, dashes, parentheses
    v_normalized_phone := regexp_replace(p_phone, '[^0-9+]', '', 'g');
    IF length(v_normalized_phone) < 10 THEN
        RAISE EXCEPTION 'Invalid customer phone number';
    END IF;

    -- Validate order type
    IF p_order_type NOT IN ('delivery', 'pickup') THEN
        RAISE EXCEPTION 'Order type must be delivery or pickup';
    END IF;

    -- Check restaurant settings
    SELECT accepting_orders, delivery_enabled, pickup_enabled, default_delivery_fee
    INTO v_accepting_orders, v_delivery_enabled, v_pickup_enabled, v_default_fee
    FROM public.restaurant_settings
    LIMIT 1;

    IF v_accepting_orders = FALSE THEN
        RAISE EXCEPTION 'Restaurant is currently not accepting new orders';
    END IF;

    IF p_order_type = 'delivery' AND v_delivery_enabled = FALSE THEN
        RAISE EXCEPTION 'Delivery orders are currently unavailable';
    END IF;

    IF p_order_type = 'pickup' AND v_pickup_enabled = FALSE THEN
        RAISE EXCEPTION 'Pickup orders are currently unavailable';
    END IF;

    IF p_order_type = 'delivery' THEN
        v_delivery_fee := COALESCE(v_default_fee, 1000.00);
        IF p_delivery_address IS NULL OR length(trim(p_delivery_address)) = 0 THEN
            RAISE EXCEPTION 'Delivery address is required for delivery orders';
        END IF;
    ELSE
        v_delivery_fee := 0;
    END IF;

    -- Find or create customer
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE normalized_phone = v_normalized_phone;

    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, phone, normalized_phone)
        VALUES (p_full_name, p_phone, v_normalized_phone)
        RETURNING id INTO v_customer_id;
    ELSE
        UPDATE public.customers
        SET full_name = p_full_name,
            phone = p_phone,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_customer_id;
    END IF;

    -- Generate Order Number: NF-YYYYMMDD-XXXX
    v_order_date_str := to_char(timezone('Africa/Lagos'::text, now()), 'YYYYMMDD');
    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_order_number := 'NF-' || v_order_date_str || '-' || v_seq_num;

    -- Ensure order number is unique
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_order_number := 'NF-' || v_order_date_str || '-' || v_seq_num;
    END LOOP;

    -- Calculate subtotal by querying authentic product records
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot create an empty order';
    END IF;

    -- First create order header with 0 amounts
    INSERT INTO public.orders (
        order_number, customer_id, order_type, delivery_address, notes,
        subtotal, delivery_fee, total, status, idempotency_key
    )
    VALUES (
        v_order_number, v_customer_id, p_order_type, p_delivery_address, p_notes,
        0, v_delivery_fee, 0, 'pending', p_idempotency_key
    )
    RETURNING id INTO v_order_id;

    -- Insert order items with snapshots and compute authoritative total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than 0';
        END IF;

        SELECT name, price, is_available, track_stock, stock_quantity
        INTO v_product_name, v_price, v_is_available, v_track_stock, v_stock_quantity
        FROM public.products
        WHERE id = v_product_id AND deleted_at IS NULL;

        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'Product with ID % not found', v_product_id;
        END IF;

        IF v_is_available = FALSE THEN
            RAISE EXCEPTION 'Product % is currently marked unavailable', v_product_name;
        END IF;

        IF v_track_stock = TRUE AND v_stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product % (Available: %, Requested: %)',
                v_product_name, v_stock_quantity, v_qty;
        END IF;

        v_item_line_total := v_price * v_qty;
        v_subtotal := v_subtotal + v_item_line_total;

        INSERT INTO public.order_items (
            order_id, product_id, product_name, unit_price, quantity, line_total
        )
        VALUES (
            v_order_id, v_product_id, v_product_name, v_price, v_qty, v_item_line_total
        );
    END LOOP;

    v_total := v_subtotal + v_delivery_fee;

    -- Update order with verified totals
    UPDATE public.orders
    SET subtotal = v_subtotal,
        total = v_total
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'subtotal', v_subtotal,
        'delivery_fee', v_delivery_fee,
        'total', v_total
    );
END;
$$;

-- Function 2: Confirm Order and Deduct Stock
CREATE OR REPLACE FUNCTION public.confirm_order_and_deduct_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_order_status TEXT;
    v_order_number TEXT;
    v_item RECORD;
    v_prod_stock INTEGER;
    v_prod_name TEXT;
    v_prod_track BOOLEAN;
    v_new_stock INTEGER;
BEGIN
    -- Verify caller authorization
    v_caller_role := private.get_user_role();
    IF v_caller_role NOT IN ('super_admin', 'manager', 'order_manager') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to confirm orders';
    END IF;

    -- Lock order row FOR UPDATE
    SELECT status, order_number INTO v_order_status, v_order_number
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_status IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order_status <> 'pending' THEN
        RAISE EXCEPTION 'Cannot confirm order %: current status is %', v_order_number, v_order_status;
    END IF;

    -- Deduct stock for all tracked items in this order
    -- Lock products ordered by id to prevent deadlocks across concurrent orders
    FOR v_item IN
        SELECT oi.product_id, oi.product_name, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
        ORDER BY oi.product_id
    LOOP
        SELECT stock_quantity, track_stock, name
        INTO v_prod_stock, v_prod_track, v_prod_name
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_prod_track = TRUE THEN
            IF v_prod_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Cannot confirm order: % has only % items left (Requested: %)',
                    v_prod_name, v_prod_stock, v_item.quantity;
            END IF;

            v_new_stock := v_prod_stock - v_item.quantity;

            -- Update product stock
            UPDATE public.products
            SET stock_quantity = v_new_stock,
                is_available = CASE WHEN v_new_stock = 0 THEN FALSE ELSE is_available END,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_item.product_id;

            -- Record stock movement
            INSERT INTO public.inventory_movements (
                product_id, movement_type, quantity, previous_quantity,
                new_quantity, reason, reference_order_id, performed_by
            )
            VALUES (
                v_item.product_id, 'order_deduction', v_item.quantity,
                v_prod_stock, v_new_stock, 'Order confirmation for ' || v_order_number,
                p_order_id, v_caller_id
            );
        END IF;
    END LOOP;

    -- Update order status to confirmed
    UPDATE public.orders
    SET status = 'confirmed',
        confirmed_by = v_caller_id,
        confirmed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- Log audit action
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
        v_caller_id, 'order_confirmed', 'orders', p_order_id,
        jsonb_build_object('order_number', v_order_number, 'status', 'confirmed')
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_number,
        'status', 'confirmed'
    );
END;
$$;

-- Function 3: Reject Order (No stock deduction occurred)
CREATE OR REPLACE FUNCTION public.reject_order(p_order_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_order_status TEXT;
    v_order_number TEXT;
BEGIN
    v_caller_role := private.get_user_role();
    IF v_caller_role NOT IN ('super_admin', 'manager', 'order_manager') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to reject orders';
    END IF;

    SELECT status, order_number INTO v_order_status, v_order_number
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_status IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order_status <> 'pending' THEN
        RAISE EXCEPTION 'Cannot reject order %: current status is %', v_order_number, v_order_status;
    END IF;

    UPDATE public.orders
    SET status = 'rejected',
        notes = CASE WHEN p_reason IS NOT NULL THEN COALESCE(notes, '') || ' [Rejection Reason: ' || p_reason || ']' ELSE notes END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
        v_caller_id, 'order_rejected', 'orders', p_order_id,
        jsonb_build_object('order_number', v_order_number, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_number,
        'status', 'rejected'
    );
END;
$$;

-- Function 4: Update Order Status (Controlled State Transitions)
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_current_status TEXT;
    v_order_type TEXT;
    v_order_number TEXT;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    v_caller_role := private.get_user_role();
    IF v_caller_role NOT IN ('super_admin', 'manager', 'order_manager') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to update order statuses';
    END IF;

    SELECT status, order_type, order_number INTO v_current_status, v_order_type, v_order_number
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Validate transitions
    IF v_current_status = 'confirmed' AND p_new_status = 'preparing' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'preparing' AND p_new_status = 'ready' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'ready' AND p_new_status = 'out_for_delivery' AND v_order_type = 'delivery' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'ready' AND p_new_status = 'completed' AND v_order_type = 'pickup' THEN
        v_valid_transition := TRUE;
    ELSIF v_current_status = 'out_for_delivery' AND p_new_status = 'completed' THEN
        v_valid_transition := TRUE;
    END IF;

    IF v_valid_transition = FALSE THEN
        RAISE EXCEPTION 'Invalid status transition from % to % for % order',
            v_current_status, p_new_status, v_order_type;
    END IF;

    UPDATE public.orders
    SET status = p_new_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (
        v_caller_id, 'order_status_update', 'orders', p_order_id,
        jsonb_build_object('status', v_current_status),
        jsonb_build_object('status', p_new_status)
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_number,
        'status', p_new_status
    );
END;
$$;

-- Function 5: Cancel Order and Restore Stock
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(p_order_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_order_status TEXT;
    v_order_number TEXT;
    v_mov RECORD;
    v_prod_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    v_caller_role := private.get_user_role();
    IF v_caller_role NOT IN ('super_admin', 'manager', 'order_manager') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to cancel orders';
    END IF;

    SELECT status, order_number INTO v_order_status, v_order_number
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_status IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order_status IN ('cancelled', 'rejected', 'completed') THEN
        RAISE EXCEPTION 'Cannot cancel an order with status %', v_order_status;
    END IF;

    -- If order had been confirmed, restore any deducted stock
    IF v_order_status IN ('confirmed', 'preparing', 'ready', 'out_for_delivery') THEN
        FOR v_mov IN
            SELECT im.product_id, im.quantity
            FROM public.inventory_movements im
            WHERE im.reference_order_id = p_order_id AND im.movement_type = 'order_deduction'
            ORDER BY im.product_id
        LOOP
            SELECT stock_quantity INTO v_prod_stock
            FROM public.products
            WHERE id = v_mov.product_id
            FOR UPDATE;

            v_new_stock := v_prod_stock + v_mov.quantity;

            UPDATE public.products
            SET stock_quantity = v_new_stock,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_mov.product_id;

            INSERT INTO public.inventory_movements (
                product_id, movement_type, quantity, previous_quantity,
                new_quantity, reason, reference_order_id, performed_by
            )
            VALUES (
                v_mov.product_id, 'order_reversal', v_mov.quantity,
                v_prod_stock, v_new_stock, 'Cancellation reversal for ' || v_order_number,
                p_order_id, v_caller_id
            );
        END LOOP;
    END IF;

    -- Update order record
    UPDATE public.orders
    SET status = 'cancelled',
        cancelled_by = v_caller_id,
        cancelled_at = timezone('utc'::text, now()),
        notes = CASE WHEN p_reason IS NOT NULL THEN COALESCE(notes, '') || ' [Cancellation Reason: ' || p_reason || ']' ELSE notes END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
        v_caller_id, 'order_cancelled', 'orders', p_order_id,
        jsonb_build_object('order_number', v_order_number, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_number,
        'status', 'cancelled'
    );
END;
$$;

-- Migration 015: Inventory Functions
-- Purpose: Controlled stock-in and manual adjustments with row locking and movement auditing.

-- Function 1: Add product stock (Stock In)
CREATE OR REPLACE FUNCTION public.add_product_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_reason TEXT DEFAULT 'Standard restocking'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_prev_stock INTEGER;
    v_new_stock INTEGER;
    v_prod_name TEXT;
BEGIN
    v_caller_role := private.get_user_role();
    IF v_caller_role NOT IN ('super_admin', 'manager', 'inventory_manager') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to add product stock';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Stock addition quantity must be greater than zero';
    END IF;

    SELECT stock_quantity, name INTO v_prev_stock, v_prod_name
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF v_prod_name IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    v_new_stock := v_prev_stock + p_quantity;

    UPDATE public.products
    SET stock_quantity = v_new_stock,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id;

    INSERT INTO public.inventory_movements (
        product_id, movement_type, quantity, previous_quantity,
        new_quantity, reason, performed_by
    )
    VALUES (
        p_product_id, 'stock_in', p_quantity, v_prev_stock,
        v_new_stock, p_reason, v_caller_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'product_name', v_prod_name,
        'previous_quantity', v_prev_stock,
        'new_quantity', v_new_stock
    );
END;
$$;

-- Function 2: Adjust product stock (Adjustments, Waste, Damaged, Stock Out)
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_product_id UUID,
    p_quantity_change INTEGER, -- Negative to reduce, positive to increase
    p_movement_type TEXT,      -- 'adjustment', 'stock_out', 'waste', 'damaged'
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_prev_stock INTEGER;
    v_new_stock INTEGER;
    v_prod_name TEXT;
    v_abs_qty INTEGER;
BEGIN
    v_caller_role := private.get_user_role();
    IF v_caller_role NOT IN ('super_admin', 'manager', 'inventory_manager') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to adjust inventory';
    END IF;

    IF p_movement_type NOT IN ('adjustment', 'stock_out', 'waste', 'damaged') THEN
        RAISE EXCEPTION 'Invalid adjustment movement type: %', p_movement_type;
    END IF;

    IF p_quantity_change = 0 THEN
        RAISE EXCEPTION 'Quantity change cannot be zero';
    END IF;

    SELECT stock_quantity, name INTO v_prev_stock, v_prod_name
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF v_prod_name IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    v_new_stock := v_prev_stock + p_quantity_change;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Cannot adjust stock: resulting quantity (%) would be negative', v_new_stock;
    END IF;

    v_abs_qty := @p_quantity_change;

    UPDATE public.products
    SET stock_quantity = v_new_stock,
        is_available = CASE WHEN v_new_stock = 0 THEN FALSE ELSE is_available END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id;

    INSERT INTO public.inventory_movements (
        product_id, movement_type, quantity, previous_quantity,
        new_quantity, reason, performed_by
    )
    VALUES (
        p_product_id, p_movement_type, v_abs_qty, v_prev_stock,
        v_new_stock, p_reason, v_caller_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'product_name', v_prod_name,
        'previous_quantity', v_prev_stock,
        'new_quantity', v_new_stock
    );
END;
$$;

-- Migration 016: Reporting and Analytics Functions
-- Purpose: Aggregated performance metrics, inventory valuation, and sales reporting.

-- Function 1: Dashboard Overview Statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_role TEXT;
    v_today_start TIMESTAMPTZ;
    v_stats JSONB;
BEGIN
    v_caller_role := private.get_user_role();
    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authenticated session required';
    END IF;

    -- Local Africa/Lagos midnight in UTC
    v_today_start := date_trunc('day', timezone('Africa/Lagos'::text, now())) AT TIME ZONE 'Africa/Lagos';

    SELECT jsonb_build_object(
        'today_orders', (
            SELECT COUNT(*) FROM public.orders WHERE created_at >= v_today_start
        ),
        'pending_orders', (
            SELECT COUNT(*) FROM public.orders WHERE status = 'pending'
        ),
        'confirmed_orders', (
            SELECT COUNT(*) FROM public.orders WHERE status = 'confirmed'
        ),
        'preparing_orders', (
            SELECT COUNT(*) FROM public.orders WHERE status = 'preparing'
        ),
        'completed_orders', (
            SELECT COUNT(*) FROM public.orders WHERE status = 'completed'
        ),
        'today_sales', (
            SELECT COALESCE(SUM(total), 0) FROM public.orders
            WHERE status = 'completed' AND created_at >= v_today_start
        ),
        'total_completed_sales', (
            SELECT COALESCE(SUM(total), 0) FROM public.orders
            WHERE status = 'completed'
        ),
        'total_active_products', (
            SELECT COUNT(*) FROM public.products
            WHERE deleted_at IS NULL AND is_available = TRUE
        ),
        'low_stock_products', (
            SELECT COUNT(*) FROM public.products
            WHERE deleted_at IS NULL AND track_stock = TRUE AND stock_quantity > 0 AND stock_quantity <= low_stock_threshold
        ),
        'out_of_stock_products', (
            SELECT COUNT(*) FROM public.products
            WHERE deleted_at IS NULL AND track_stock = TRUE AND stock_quantity = 0
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$;

-- Function 2: Sales Summary over Date Range
CREATE OR REPLACE FUNCTION public.get_sales_summary(
    p_start_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
)
RETURNS TABLE (
    sales_date DATE,
    total_sales NUMERIC(12,2),
    order_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        DATE(timezone('Africa/Lagos'::text, created_at)) AS sales_date,
        COALESCE(SUM(total), 0) AS total_sales,
        COUNT(*) AS order_count
    FROM public.orders
    WHERE status = 'completed'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    GROUP BY DATE(timezone('Africa/Lagos'::text, created_at))
    ORDER BY sales_date ASC;
$$;

-- Function 3: Best Selling Products
CREATE OR REPLACE FUNCTION public.get_best_selling_products(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    total_quantity_sold BIGINT,
    total_revenue NUMERIC(12,2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity)::BIGINT AS total_quantity_sold,
        SUM(oi.line_total)::NUMERIC(12,2) AS total_revenue
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
    GROUP BY oi.product_id, oi.product_name
    ORDER BY total_quantity_sold DESC
    LIMIT p_limit;
$$;

-- Function 4: Inventory Valuation
CREATE OR REPLACE FUNCTION public.get_inventory_valuation()
RETURNS TABLE (
    total_items_in_stock BIGINT,
    total_cost_valuation NUMERIC(12,2),
    total_retail_valuation NUMERIC(12,2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        COALESCE(SUM(stock_quantity), 0)::BIGINT AS total_items_in_stock,
        COALESCE(SUM(stock_quantity * COALESCE(cost_price, 0)), 0)::NUMERIC(12,2) AS total_cost_valuation,
        COALESCE(SUM(stock_quantity * price), 0)::NUMERIC(12,2) AS total_retail_valuation
    FROM public.products
    WHERE deleted_at IS NULL AND track_stock = TRUE;
$$;

-- Migration 017: Triggers and Automation
-- Purpose: Updated_at maintenance and automated order notification triggers.

-- 1. Generalized updated_at timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_restaurant_settings_updated_at ON public.restaurant_settings;
CREATE TRIGGER trg_restaurant_settings_updated_at BEFORE UPDATE ON public.restaurant_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_delivery_settings_updated_at ON public.delivery_settings;
CREATE TRIGGER trg_delivery_settings_updated_at BEFORE UPDATE ON public.delivery_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. New Order Notification Trigger: notify order managers
CREATE OR REPLACE FUNCTION public.notify_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_user RECORD;
BEGIN
    FOR v_admin_user IN
        SELECT id FROM public.profiles
        WHERE role IN ('super_admin', 'manager', 'order_manager')
          AND is_active = TRUE
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_order_id)
        VALUES (
            v_admin_user.id,
            'New Order Received: ' || NEW.order_number,
            'A new ' || NEW.order_type || ' order for ₦' || trim(to_char(NEW.total, '999,999,990.00')) || ' has arrived and requires review.',
            'order',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_order ON public.orders;
CREATE TRIGGER trg_notify_on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_order();

-- Migration 018: Supabase Storage Configuration
-- Purpose: Create buckets and define row level security policies for image assets.

-- Ensure storage schema buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('food-images', 'food-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('restaurant-assets', 'restaurant-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('receipts', 'receipts', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Public read policies for public buckets
CREATE POLICY "Public Read Food Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Public Read Category Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Public Read Restaurant Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Admin upload policies
CREATE POLICY "Staff Upload Food Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'food-images' AND
    private.has_role(ARRAY['super_admin', 'manager'])
);

CREATE POLICY "Staff Upload Category Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'category-images' AND
    private.has_role(ARRAY['super_admin', 'manager'])
);

CREATE POLICY "Staff Upload Restaurant Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'restaurant-assets' AND
    private.has_role(ARRAY['super_admin', 'manager'])
);

CREATE POLICY "Staff Upload Avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
);

-- Migration 019: Fix Permissions for Schema and Helper Functions
-- Purpose: Grant usage on private schema and execute on helper functions to anon role
-- so that public RLS policies can evaluate without throwing PostgreSQL error 42501 ('permission denied for function has_role').

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO anon, authenticated, service_role;

-- Grant customer order creation to public anon callers
GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;

-- Administrative functions granted to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.confirm_order_and_deduct_stock(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_order(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_product_stock(UUID, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_statistics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sales_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_best_selling_products(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_inventory_valuation() TO authenticated, service_role;
-- Seed Data for Northern Flavors Restaurant
-- Categories & Authentic Northern/Nigerian Menu Items

-- 1. Insert Categories
INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Rice', 'rice', 'Savory, aromatic Nigerian rice dishes cooked to perfection', 1, true),
    ('c0000000-0000-0000-0000-000000000002', 'Swallow', 'swallow', 'Traditional swallow dishes served hot and smooth', 2, true),
    ('c0000000-0000-0000-0000-000000000003', 'Proteins', 'proteins', 'Succulent beef, seasoned chicken, fresh fish and tender turkey', 3, true),
    ('c0000000-0000-0000-0000-000000000004', 'Sides', 'sides', 'Delectable side accompaniments to enrich your plate', 4, true),
    ('c0000000-0000-0000-0000-000000000005', 'Meals', 'meals', 'Authentic Northern regional delicacies and full combo platters', 5, true),
    ('c0000000-0000-0000-0000-000000000006', 'Snacks', 'snacks', 'Freshly baked pastries and crispy appetizers', 6, true),
    ('c0000000-0000-0000-0000-000000000007', 'Drinks', 'drinks', 'Chilled homemade beverages, natural juices and refreshments', 7, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Menu Products
INSERT INTO public.products (
    id, category_id, name, slug, description, price, cost_price, sku,
    stock_quantity, low_stock_threshold, track_stock, is_available, is_featured, is_favourite, sort_order
)
VALUES
    -- Rice
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'Signature Jollof Rice', 'signature-jollof-rice',
     'Smoky firewood-style Nigerian party Jollof rice infused with tomatoes, sweet bell peppers and Northern spices.',
     1800.00, 950.00, 'RICE-JOL-01', 50, 10, true, true, true, true, 1),

    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
     'Special Fried Rice', 'special-fried-rice',
     'Stir-fried parboiled rice with sweet corn, carrots, peas, liver and fragrant seasoning.',
     2000.00, 1100.00, 'RICE-FRD-02', 35, 8, true, true, false, true, 2),

    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
     'White Rice & Native Stew', 'white-rice-native-stew',
     'Fluffy steamed white rice served with deep, rich red pepper and tomato meat stew.',
     1600.00, 800.00, 'RICE-WHT-03', 40, 10, true, true, false, false, 3),

    -- Swallow
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002',
     'Tuwon Shinkafa', 'tuwon-shinkafa',
     'Classic soft Northern rice swallow, smooth and comforting, pairs wonderfully with Miyan Taushe or Egusi.',
     1200.00, 500.00, 'SWL-TSH-01', 30, 8, true, true, true, true, 4),

    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002',
     'Semovita', 'semovita',
     'Silky, finely-kneaded premium semolina swallow.',
     1200.00, 550.00, 'SWL-SEM-02', 25, 5, true, true, false, false, 5),

    ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002',
     'Pounded Yam', 'pounded-yam',
     'Elastic, hot pounded yam with a soft velvety texture.',
     1500.00, 700.00, 'SWL-PYM-03', 25, 5, true, true, false, true, 6),

    -- Proteins
    ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003',
     'Peppered Fried Chicken', 'peppered-fried-chicken',
     'Crispy golden chicken tossed in hot scotch bonnet, red pepper glaze, and caramelized onions.',
     2500.00, 1400.00, 'PRO-CHK-01', 30, 8, true, true, true, true, 7),

    ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000003',
     'Spicy Northern Beef Suya', 'spicy-northern-beef-suya',
     'Thinly sliced tender prime beef crusted in authentic Jigawa yaji spice, charred to smoky bliss.',
     2200.00, 1200.00, 'PRO-SYA-02', 40, 10, true, true, true, true, 8),

    ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003',
     'Fried Titus Fish', 'fried-titus-fish',
     'Deep-fried marinated mackerel steak seasoned with garlic, ginger, and herbs.',
     2000.00, 1100.00, 'PRO-FSH-03', 20, 5, true, true, false, false, 9),

    -- Sides
    ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000004',
     'Sweet Fried Plantain (Dodo)', 'sweet-fried-plantain-dodo',
     'Caramelized sweet ripe plantain slices fried golden brown.',
     800.00, 350.00, 'SID-PLA-01', 40, 10, true, true, false, true, 10),

    ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000004',
     'Rich Moi Moi', 'rich-moi-moi',
     'Steamed savory bean pudding packed with flaked fish, boiled egg, and native peppers.',
     900.00, 450.00, 'SID-MMI-02', 25, 5, true, true, false, false, 11),

    -- Meals
    ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000005',
     'Masa with Miyan Taushe', 'masa-with-miyan-taushe',
     'Fermented puffed rice cakes (waina) served alongside sweet pumpkin and peanut soup with beef chunks.',
     3000.00, 1600.00, 'MEL-MAS-01', 20, 5, true, true, true, true, 12),

    ('d0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000005',
     'Egusi Soup with Assorted Meat', 'egusi-soup-assorted-meat',
     'Rich ground melon seed soup cooked with spinach, stockfish, cow leg, and tender beef.',
     3200.00, 1800.00, 'MEL-EGU-02', 20, 5, true, true, true, false, 13),

    -- Snacks
    ('d0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000006',
     'Golden Meat Pie', 'golden-meat-pie',
     'Flaky, buttery shortcrust pastry filled with minced beef, potatoes, and diced carrots.',
     1000.00, 450.00, 'SNK-MTP-01', 35, 8, true, true, false, true, 14),

    ('d0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000006',
     'Crispy Spring Rolls & Samosa (Pair)', 'spring-rolls-samosa-pair',
     'Crunchy pastry rolls and samosas stuffed with seasoned vegetables and chicken.',
     1200.00, 550.00, 'SNK-SAM-02', 30, 8, true, true, false, false, 15),

    -- Drinks
    ('d0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000007',
     'Chilled Hibiscus Zobo', 'chilled-hibiscus-zobo',
     'Freshly brewed hibiscus petal tea infused with ginger, cloves, and pineapple sweetness.',
     800.00, 300.00, 'DRK-ZOB-01', 50, 15, true, true, true, true, 16),

    ('d0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000007',
     'Creamy Kunu Aya (Tiger Nut Milk)', 'creamy-kunu-aya',
     'Naturally sweet and creamy tiger nut, date, and coconut milk, chilled to refresh.',
     1000.00, 450.00, 'DRK-KUN-02', 40, 10, true, true, true, true, 17),

    ('d0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000007',
     'Signature Chapman', 'signature-chapman',
     'Classic Nigerian cocktail blend with aromatic bitters, citrus slices, and cucumber garnish.',
     1500.00, 600.00, 'DRK-CHP-03', 25, 8, true, true, false, true, 18)
ON CONFLICT (id) DO NOTHING;

-- 3. Delivery Settings Seed
INSERT INTO public.delivery_settings (name, delivery_fee, is_active)
VALUES
    ('Dutse Urban (Yalwawa, Gajambe, Takur)', 1000.00, true),
    ('Dutse Outer (FUD Campus, G9, Limawa)', 1500.00, true),
    ('Express Delivery', 2000.00, true)
ON CONFLICT DO NOTHING;


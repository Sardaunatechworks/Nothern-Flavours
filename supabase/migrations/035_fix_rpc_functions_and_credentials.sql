-- ==============================================================================
-- Migration 035: Fix RPC Ambiguity, Order Functions, and Staff Credentials
-- Purpose:
--   1. Drop ambiguous overloaded 7-parameter complete_pos_sale function (PGRST203 fix)
--   2. Redefine complete_pos_sale (10 params) with robust staff role & FK handling
--   3. Redefine create_customer_order with default 300 Naira delivery fee & safe customer query
--   4. Repair staff credentials without attempting to update the generated auth.identities.email column
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. DROP THE AMBIGUOUS OVERLOADED 7-PARAMETER FUNCTION
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_pos_sale(
    JSONB, JSONB, JSONB, NUMERIC, NUMERIC, TEXT, UUID
);

-- ------------------------------------------------------------------------------
-- 2. CREATE ROBUST 10-PARAMETER complete_pos_sale FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_pos_sale(
    p_items JSONB,
    p_payments JSONB,
    p_customer JSONB DEFAULT '{}'::jsonb,
    p_discount_amount NUMERIC DEFAULT 0,
    p_tax_amount NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL,
    p_order_type TEXT DEFAULT 'dine_in',
    p_packaging_fee NUMERIC DEFAULT 0,
    p_delivery_fee NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_customer_id UUID;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_normalized_phone TEXT;
    v_cashier_name TEXT;
    
    v_order_id UUID;
    v_order_number TEXT;
    v_trans_id UUID;
    v_trans_number TEXT;
    v_receipt_id UUID;
    v_receipt_number TEXT;
    v_date_str TEXT;
    v_seq_num TEXT;

    v_item JSONB;
    v_prod_id UUID;
    v_prod_qty INT;
    v_prod_price NUMERIC(12,2);
    v_prod_name TEXT;
    v_prod_stock INT;
    v_prod_track BOOLEAN;
    v_prod_available BOOLEAN;
    v_line_total NUMERIC(12,2);
    v_subtotal NUMERIC(12,2) := 0;
    v_packaging_fee NUMERIC(12,2) := 0;
    v_delivery_fee NUMERIC(12,2) := 0;
    v_total NUMERIC(12,2) := 0;

    v_payment JSONB;
    v_pay_method TEXT;
    v_pay_amount NUMERIC(12,2);
    v_pay_tendered NUMERIC(12,2);
    v_pay_change NUMERIC(12,2);
    v_pay_provider TEXT;
    v_pay_ref TEXT;
    v_total_paid NUMERIC(12,2) := 0;
    v_primary_method TEXT;
    v_payment_id UUID;
BEGIN
    -- Role verification (allow super_admin, manager, cashier, staff, order_manager)
    IF v_caller_id IS NOT NULL THEN
        IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier', 'staff', 'order_manager']) THEN
            RAISE EXCEPTION 'Access denied. Cashier privilege required.';
        END IF;
    END IF;

    -- Validate cart items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot complete sale with an empty cart.';
    END IF;

    -- Validate payments
    IF p_payments IS NULL OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'Payment details are required.';
    END IF;

    -- Cashier name resolution & FK safety
    IF v_caller_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_id) THEN
        SELECT full_name INTO v_cashier_name FROM public.profiles WHERE id = v_caller_id;
    ELSE
        v_caller_id := NULL;
        v_cashier_name := 'Cashier Staff';
    END IF;

    IF v_cashier_name IS NULL THEN
        v_cashier_name := 'Cashier Staff';
    END IF;

    -- Customer resolution
    IF p_customer ? 'customer_id' AND (p_customer->>'customer_id') IS NOT NULL AND length(p_customer->>'customer_id') > 0 THEN
        v_customer_id := (p_customer->>'customer_id')::UUID;
        SELECT full_name, phone INTO v_customer_name, v_customer_phone FROM public.customers WHERE id = v_customer_id LIMIT 1;
    ELSIF p_customer ? 'phone' AND length(trim(p_customer->>'phone')) > 0 THEN
        v_customer_name := COALESCE(trim(p_customer->>'name'), 'Walk-in Customer');
        v_customer_phone := trim(p_customer->>'phone');
        v_normalized_phone := regexp_replace(v_customer_phone, '[^0-9+]', '', 'g');

        SELECT id INTO v_customer_id FROM public.customers WHERE normalized_phone = v_normalized_phone LIMIT 1;
        IF v_customer_id IS NULL THEN
            INSERT INTO public.customers (full_name, phone, normalized_phone)
            VALUES (v_customer_name, v_customer_phone, v_normalized_phone)
            RETURNING id INTO v_customer_id;
        END IF;
    ELSE
        v_customer_name := COALESCE(trim(p_customer->>'name'), 'Walk-in Customer');
        v_customer_phone := NULL;
    END IF;

    -- Lock and verify stock for each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_prod_qty := COALESCE((v_item->>'quantity')::INT, 1);

        IF v_prod_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity for item %', v_prod_id;
        END IF;

        SELECT id, name, price, stock_quantity, track_stock, is_available
        INTO v_prod_id, v_prod_name, v_prod_price, v_prod_stock, v_prod_track, v_prod_available
        FROM public.products
        WHERE id = v_prod_id
        FOR UPDATE;

        IF v_prod_id IS NULL THEN
            RAISE EXCEPTION 'Product % does not exist.', (v_item->>'product_id');
        END IF;

        IF NOT v_prod_available THEN
            RAISE EXCEPTION 'Product "%" is currently marked unavailable.', v_prod_name;
        END IF;

        IF v_prod_track = TRUE THEN
            IF v_prod_stock < v_prod_qty THEN
                RAISE EXCEPTION 'Insufficient stock for "%": requested %, available %',
                    v_prod_name, v_prod_qty, v_prod_stock;
            END IF;

            -- Deduct stock
            UPDATE public.products
            SET stock_quantity = stock_quantity - v_prod_qty,
                is_available = CASE WHEN stock_quantity - v_prod_qty <= 0 THEN FALSE ELSE is_available END,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_prod_id;

            -- Record inventory movement
            INSERT INTO public.inventory_movements (
                product_id,
                movement_type,
                quantity,
                previous_quantity,
                new_quantity,
                reason,
                performed_by
            ) VALUES (
                v_prod_id,
                'order_deduction',
                v_prod_qty,
                v_prod_stock,
                v_prod_stock - v_prod_qty,
                'POS Walk-in Sale',
                v_caller_id
            );
        END IF;

        v_line_total := v_prod_price * v_prod_qty;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- Packaging & Delivery charges
    IF p_order_type = 'takeaway' THEN
        v_packaging_fee := COALESCE(p_packaging_fee, 0);
    ELSE
        v_packaging_fee := 0;
    END IF;

    IF p_order_type = 'delivery' THEN
        v_delivery_fee := COALESCE(p_delivery_fee, 300.00);
    ELSE
        v_delivery_fee := 0;
    END IF;

    -- Grand Total calculation
    v_total := v_subtotal + v_packaging_fee + v_delivery_fee - COALESCE(p_discount_amount, 0) + COALESCE(p_tax_amount, 0);
    IF v_total < 0 THEN
        v_total := 0;
    END IF;

    -- Validate payment totals
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_pay_amount := COALESCE((v_payment->>'amount')::NUMERIC, 0);
        v_total_paid := v_total_paid + v_pay_amount;
    END LOOP;

    IF v_total_paid < v_total THEN
        RAISE EXCEPTION 'Total paid (₦%) is less than order total (₦%)', v_total_paid, v_total;
    END IF;

    IF jsonb_array_length(p_payments) = 1 THEN
        v_primary_method := p_payments->0->>'method';
    ELSE
        v_primary_method := 'split';
    END IF;

    -- Generate Unique Numbers
    v_date_str := to_char(timezone('Africa/Lagos'::text, now()), 'YYYYMMDD');
    
    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_order_number := 'NF-' || v_date_str || '-' || v_seq_num;
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_order_number := 'NF-' || v_date_str || '-' || v_seq_num;
    END LOOP;

    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_trans_number := 'POS-' || v_date_str || '-' || v_seq_num;
    WHILE EXISTS (SELECT 1 FROM public.pos_transactions WHERE transaction_number = v_trans_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_trans_number := 'POS-' || v_date_str || '-' || v_seq_num;
    END LOOP;

    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_receipt_number := 'REC-' || v_date_str || '-' || v_seq_num;
    WHILE EXISTS (SELECT 1 FROM public.receipts WHERE receipt_number = v_receipt_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_receipt_number := 'REC-' || v_date_str || '-' || v_seq_num;
    END LOOP;

    -- 1. Create order
    INSERT INTO public.orders (
        order_number,
        customer_id,
        order_type,
        status,
        payment_status,
        subtotal,
        packaging_fee,
        delivery_fee,
        discount_amount,
        total,
        total_amount,
        amount_paid,
        order_source,
        created_by,
        confirmed_by,
        confirmed_at,
        paid_at,
        notes
    ) VALUES (
        v_order_number,
        v_customer_id,
        COALESCE(p_order_type, 'dine_in'),
        'completed',
        'paid',
        v_subtotal,
        v_packaging_fee,
        v_delivery_fee,
        COALESCE(p_discount_amount, 0),
        v_total,
        v_total,
        v_total_paid,
        'pos',
        v_caller_id,
        v_caller_id,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        p_notes
    ) RETURNING id INTO v_order_id;

    -- 2. Insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_prod_qty := COALESCE((v_item->>'quantity')::INT, 1);

        SELECT name, price INTO v_prod_name, v_prod_price
        FROM public.products WHERE id = v_prod_id;

        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            line_total
        ) VALUES (
            v_order_id,
            v_prod_id,
            v_prod_name,
            v_prod_qty,
            v_prod_price,
            v_prod_price * v_prod_qty
        );
    END LOOP;

    -- 3. Record payments
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_pay_amount := COALESCE((v_payment->>'amount')::NUMERIC, 0);
        v_pay_method := COALESCE(v_payment->>'method', 'cash');
        v_pay_tendered := COALESCE((v_payment->>'amount_tendered')::NUMERIC, v_pay_amount);
        v_pay_change := COALESCE((v_payment->>'change_due')::NUMERIC, 0);
        v_pay_provider := v_payment->>'provider';
        v_pay_ref := v_payment->>'transaction_reference';

        INSERT INTO public.payments (
            order_id,
            cashier_id,
            verified_by,
            verified_at,
            payment_method,
            amount,
            amount_tendered,
            change_due,
            provider,
            transaction_reference,
            status
        ) VALUES (
            v_order_id,
            v_caller_id,
            v_caller_id,
            timezone('utc'::text, now()),
            v_pay_method,
            v_pay_amount,
            v_pay_tendered,
            v_pay_change,
            v_pay_provider,
            v_pay_ref,
            'completed'
        ) RETURNING id INTO v_payment_id;
    END LOOP;

    -- 4. Create POS Transaction record
    INSERT INTO public.pos_transactions (
        transaction_number,
        order_id,
        cashier_id,
        customer_id,
        customer_name,
        customer_phone,
        order_type,
        subtotal,
        packaging_fee,
        delivery_fee,
        discount_amount,
        tax_amount,
        total,
        payment_method,
        status,
        notes,
        completed_at
    ) VALUES (
        v_trans_number,
        v_order_id,
        v_caller_id,
        v_customer_id,
        v_customer_name,
        v_customer_phone,
        COALESCE(p_order_type, 'dine_in'),
        v_subtotal,
        v_packaging_fee,
        v_delivery_fee,
        COALESCE(p_discount_amount, 0),
        COALESCE(p_tax_amount, 0),
        v_total,
        v_primary_method,
        'completed',
        p_notes,
        timezone('utc'::text, now())
    ) RETURNING id INTO v_trans_id;

    -- 5. Issue receipt
    INSERT INTO public.receipts (
        receipt_number,
        order_id,
        payment_id,
        pos_transaction_id,
        cashier_id,
        receipt_type,
        reprint_count,
        issued_at,
        metadata
    ) VALUES (
        v_receipt_number,
        v_order_id,
        v_payment_id,
        v_trans_id,
        v_caller_id,
        'pos',
        0,
        timezone('utc'::text, now()),
        jsonb_build_object(
            'customer_name', v_customer_name,
            'customer_phone', v_customer_phone,
            'cashier_name', v_cashier_name,
            'order_number', v_order_number,
            'order_type', p_order_type,
            'packaging_fee', v_packaging_fee,
            'delivery_fee', v_delivery_fee,
            'transaction_number', v_trans_number
        )
    ) RETURNING id INTO v_receipt_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'transaction_id', v_trans_id,
        'transaction_number', v_trans_number,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'order_type', COALESCE(p_order_type, 'dine_in'),
        'subtotal', v_subtotal,
        'packaging_fee', v_packaging_fee,
        'delivery_fee', v_delivery_fee,
        'discount', COALESCE(p_discount_amount, 0),
        'total', v_total,
        'amount_paid', v_total_paid
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_pos_sale(JSONB, JSONB, JSONB, NUMERIC, NUMERIC, TEXT, UUID, TEXT, NUMERIC, NUMERIC) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. REDEFINE create_customer_order WITH 300 NAIRA DEFAULT DELIVERY FEE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_customer_order(
    p_full_name TEXT,
    p_phone TEXT,
    p_order_type TEXT,
    p_delivery_address TEXT,
    p_notes TEXT,
    p_items JSONB,
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
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order_id,
                'order_number', v_order_number,
                'is_duplicate', true
            );
        END IF;
    END IF;

    -- Validate Name
    IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'Please enter your full name (at least 2 characters)';
    END IF;

    -- Normalize and validate phone
    v_normalized_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g');
    IF length(v_normalized_phone) < 10 THEN
        RAISE EXCEPTION 'Invalid customer phone number (must be at least 10 digits)';
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
        v_delivery_fee := COALESCE(v_default_fee, 300.00);
        IF p_delivery_address IS NULL OR length(trim(p_delivery_address)) = 0 THEN
            RAISE EXCEPTION 'Delivery address is required for delivery orders';
        END IF;
    ELSE
        v_delivery_fee := 0;
    END IF;

    -- Find or create customer
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE normalized_phone = v_normalized_phone
    LIMIT 1;

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

    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_order_number := 'NF-' || v_order_date_str || '-' || v_seq_num;
    END LOOP;

    -- Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
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
        v_qty := COALESCE((v_item->>'quantity')::INTEGER, 1);

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
            RAISE EXCEPTION 'Product "%" is currently marked unavailable', v_product_name;
        END IF;

        IF v_track_stock = TRUE AND v_stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product "%" (Available: %, Requested: %)',
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

GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. UPDATE / CREATE PRODUCTION STAFF USERS (NO GENERATED COLUMN ERROR)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_admin_email          TEXT := 'admin@northernflavors.ng';
    v_admin_password       TEXT := 'admin123';
    v_admin_name           TEXT := 'Restaurant Administrator';
    v_admin_phone          TEXT := '09068202567';

    v_cashier_email        TEXT := 'cashier@northernflavors.ng';
    v_cashier_password     TEXT := 'cashier123';
    v_cashier_name         TEXT := 'Cashier Staff';
    v_cashier_phone        TEXT := '09068202567';

    v_admin_user_id        UUID;
    v_cashier_user_id      UUID;
    v_admin_encrypted_pw   TEXT := crypt(v_admin_password, gen_salt('bf'));
    v_cashier_encrypted_pw TEXT := crypt(v_cashier_password, gen_salt('bf'));
BEGIN
    -- ADMIN ACCOUNT
    SELECT id INTO v_admin_user_id 
    FROM auth.users 
    WHERE lower(email) = lower(v_admin_email) 
       OR id IN (SELECT id FROM public.profiles WHERE role = 'super_admin') 
    LIMIT 1;

    IF v_admin_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET email = lower(v_admin_email),
            encrypted_password = v_admin_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = jsonb_build_object('full_name', v_admin_name, 'role', 'super_admin'),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, ''),
            updated_at = now()
        WHERE id = v_admin_user_id;

        -- DO NOT update auth.identities.email directly because it is a GENERATED ALWAYS column
        UPDATE auth.identities
        SET provider_id = v_admin_user_id::text,
            identity_data = jsonb_build_object('sub', v_admin_user_id::text, 'email', lower(v_admin_email)),
            updated_at = now()
        WHERE user_id = v_admin_user_id;

        UPDATE public.profiles
        SET full_name = v_admin_name,
            phone = v_admin_phone,
            role = 'super_admin',
            email = lower(v_admin_email),
            is_active = true
        WHERE id = v_admin_user_id;
    ELSE
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            lower(v_admin_email), v_admin_encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_admin_name, 'role', 'super_admin'),
            now(), now(),
            '', '', '', '', '', '', '', ''
        ) RETURNING id INTO v_admin_user_id;

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_admin_user_id, v_admin_user_id, v_admin_user_id::text,
            jsonb_build_object('sub', v_admin_user_id::text, 'email', lower(v_admin_email)),
            'email', now(), now(), now()
        );

        INSERT INTO public.profiles (id, full_name, email, phone, role, is_active)
        VALUES (v_admin_user_id, v_admin_name, lower(v_admin_email), v_admin_phone, 'super_admin', true)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            role = 'super_admin',
            is_active = true;
    END IF;

    -- CASHIER ACCOUNT
    SELECT id INTO v_cashier_user_id 
    FROM auth.users 
    WHERE lower(email) = lower(v_cashier_email) 
       OR id IN (SELECT id FROM public.profiles WHERE role = 'cashier') 
    LIMIT 1;

    IF v_cashier_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET email = lower(v_cashier_email),
            encrypted_password = v_cashier_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = jsonb_build_object('full_name', v_cashier_name, 'role', 'cashier'),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, ''),
            updated_at = now()
        WHERE id = v_cashier_user_id;

        -- DO NOT update auth.identities.email directly because it is a GENERATED ALWAYS column
        UPDATE auth.identities
        SET provider_id = v_cashier_user_id::text,
            identity_data = jsonb_build_object('sub', v_cashier_user_id::text, 'email', lower(v_cashier_email)),
            updated_at = now()
        WHERE user_id = v_cashier_user_id;

        UPDATE public.profiles
        SET full_name = v_cashier_name,
            phone = v_cashier_phone,
            role = 'cashier',
            email = lower(v_cashier_email),
            is_active = true
        WHERE id = v_cashier_user_id;
    ELSE
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change, email_change_token_new,
            email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            lower(v_cashier_email), v_cashier_encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_cashier_name, 'role', 'cashier'),
            now(), now(),
            '', '', '', '', '', '', '', ''
        ) RETURNING id INTO v_cashier_user_id;

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_cashier_user_id, v_cashier_user_id, v_cashier_user_id::text,
            jsonb_build_object('sub', v_cashier_user_id::text, 'email', lower(v_cashier_email)),
            'email', now(), now(), now()
        );

        INSERT INTO public.profiles (id, full_name, email, phone, role, is_active)
        VALUES (v_cashier_user_id, v_cashier_name, lower(v_cashier_email), v_cashier_phone, 'cashier', true)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            role = 'cashier',
            is_active = true;
    END IF;
END $$;

COMMIT;

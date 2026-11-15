-- Migration 027: Remove Shift Dependency, Add Takeaway Packaging Fee & Simplify POS Completion
-- Purpose: Remove all shift constraints from POS checkout and support configurable takeaway packaging charges.

-- 1. Extend restaurant_settings for Takeaway Packaging Configuration
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS takeaway_packaging_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS takeaway_packaging_model TEXT NOT NULL DEFAULT 'order' CHECK (takeaway_packaging_model IN ('order', 'item', 'product')),
ADD COLUMN IF NOT EXISTS takeaway_packaging_fee NUMERIC(12,2) NOT NULL DEFAULT 500.00 CHECK (takeaway_packaging_fee >= 0);

-- Update default settings row with standard ₦500 packaging fee
UPDATE public.restaurant_settings
SET takeaway_packaging_enabled = TRUE,
    takeaway_packaging_model = 'order',
    takeaway_packaging_fee = 200.00
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Extend orders & pos_transactions for packaging fee, order types, and total_amount synchronization
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS packaging_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (packaging_fee >= 0),
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);

-- Synchronize total and total_amount for maximum backward and forward compatibility
UPDATE public.orders SET total_amount = total WHERE total_amount IS NULL AND total IS NOT NULL;
UPDATE public.orders SET total = total_amount WHERE total IS NULL AND total_amount IS NOT NULL;

-- Update orders order_type check constraint to support dine_in and takeaway alongside online delivery & pickup
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check CHECK (
    order_type IN ('delivery', 'pickup', 'dine_in', 'takeaway')
);

ALTER TABLE public.pos_transactions
ADD COLUMN IF NOT EXISTS packaging_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (packaging_fee >= 0),
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery'));

-- 3. Redefine complete_pos_sale without shift dependency
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
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Access denied. Cashier privilege required.';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot complete sale with an empty cart.';
    END IF;

    IF jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'Payment details are required.';
    END IF;

    -- Cashier name resolution
    SELECT full_name INTO v_cashier_name FROM public.profiles WHERE id = v_caller_id;
    IF v_cashier_name IS NULL THEN
        v_cashier_name := 'Cashier Staff';
    END IF;

    -- Customer resolution
    IF p_customer ? 'customer_id' AND (p_customer->>'customer_id') IS NOT NULL AND length(p_customer->>'customer_id') > 0 THEN
        v_customer_id := (p_customer->>'customer_id')::UUID;
        SELECT full_name, phone INTO v_customer_name, v_customer_phone FROM public.customers WHERE id = v_customer_id;
    ELSIF p_customer ? 'phone' AND length(trim(p_customer->>'phone')) > 0 THEN
        v_customer_name := COALESCE(trim(p_customer->>'name'), 'Walk-in Customer');
        v_customer_phone := trim(p_customer->>'phone');
        v_normalized_phone := regexp_replace(v_customer_phone, '[^0-9+]', '', 'g');

        SELECT id INTO v_customer_id FROM public.customers WHERE normalized_phone = v_normalized_phone;
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
        v_prod_qty := (v_item->>'quantity')::INT;

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
        v_delivery_fee := COALESCE(p_delivery_fee, 0);
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
        v_pay_amount := (v_payment->>'amount')::NUMERIC;
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

    -- Generate numbers (NF-YYYYMMDD-XXXX, POS-YYYYMMDD-XXXX, REC-YYYYMMDD-XXXX)
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
        v_prod_qty := (v_item->>'quantity')::INT;

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
        v_pay_amount := (v_payment->>'amount')::NUMERIC;
        v_pay_method := v_payment->>'method';
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

GRANT EXECUTE ON FUNCTION public.complete_pos_sale(JSONB, JSONB, JSONB, NUMERIC, NUMERIC, TEXT, UUID, TEXT, NUMERIC, NUMERIC) TO authenticated;


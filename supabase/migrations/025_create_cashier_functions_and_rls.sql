-- Migration 025: Cashier Functions and RLS Policies
-- Purpose: Complete POS sale processing, shift open/close, payment recording, receipt issuing, and cashier role security.

-- ============================================================================
-- 1. FUNCTION: open_cashier_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION public.open_cashier_shift(
    p_opening_cash NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_active_shift_id UUID;
    v_shift_number TEXT;
    v_shift_date_str TEXT;
    v_seq_num TEXT;
    v_shift RECORD;
BEGIN
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Access denied. Only cashiers and managers can open shifts.';
    END IF;

    -- Check if caller already has an open shift
    SELECT id INTO v_active_shift_id
    FROM public.cashier_shifts
    WHERE cashier_id = v_caller_id AND status = 'open'
    LIMIT 1;

    IF v_active_shift_id IS NOT NULL THEN
        RAISE EXCEPTION 'You already have an active open shift (ID: %). Please close it first.', v_active_shift_id;
    END IF;

    IF p_opening_cash < 0 THEN
        RAISE EXCEPTION 'Opening cash float cannot be negative.';
    END IF;

    -- Generate unique shift number: SFT-YYYYMMDD-XXXX
    v_shift_date_str := to_char(timezone('Africa/Lagos'::text, now()), 'YYYYMMDD');
    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_shift_number := 'SFT-' || v_shift_date_str || '-' || v_seq_num;

    WHILE EXISTS (SELECT 1 FROM public.cashier_shifts WHERE shift_number = v_shift_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_shift_number := 'SFT-' || v_shift_date_str || '-' || v_seq_num;
    END LOOP;

    -- Create shift record
    INSERT INTO public.cashier_shifts (
        shift_number,
        cashier_id,
        opening_cash,
        expected_cash,
        status,
        opened_at,
        notes
    ) VALUES (
        v_shift_number,
        v_caller_id,
        p_opening_cash,
        p_opening_cash,
        'open',
        timezone('utc'::text, now()),
        p_notes
    ) RETURNING * INTO v_shift;

    -- Log opening float cash movement if > 0
    IF p_opening_cash > 0 THEN
        INSERT INTO public.cash_movements (
            shift_id,
            cashier_id,
            movement_type,
            amount,
            reason
        ) VALUES (
            v_shift.id,
            v_caller_id,
            'in',
            p_opening_cash,
            'Initial cash float opening balance'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'shift', to_jsonb(v_shift)
    );
END;
$$;

-- ============================================================================
-- 2. FUNCTION: record_cash_movement
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_cash_movement(
    p_shift_id UUID,
    p_movement_type TEXT,
    p_amount NUMERIC,
    p_reason TEXT,
    p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_shift RECORD;
    v_new_expected NUMERIC(12,2);
BEGIN
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    IF p_movement_type NOT IN ('in', 'out') THEN
        RAISE EXCEPTION 'Manual cash movement type must be "in" or "out".';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero.';
    END IF;

    SELECT * INTO v_shift
    FROM public.cashier_shifts
    WHERE id = p_shift_id
    FOR UPDATE;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Shift not found.';
    END IF;

    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Shift is already closed.';
    END IF;

    IF p_movement_type = 'in' THEN
        v_new_expected := v_shift.expected_cash + p_amount;
    ELSE
        IF v_shift.expected_cash < p_amount THEN
            RAISE EXCEPTION 'Cannot remove %: current expected cash is only %', p_amount, v_shift.expected_cash;
        END IF;
        v_new_expected := v_shift.expected_cash - p_amount;
    END IF;

    -- Insert movement
    INSERT INTO public.cash_movements (
        shift_id,
        cashier_id,
        movement_type,
        amount,
        reason,
        reference
    ) VALUES (
        p_shift_id,
        v_caller_id,
        p_movement_type,
        p_amount,
        p_reason,
        p_reference
    );

    -- Update shift expected cash
    UPDATE public.cashier_shifts
    SET expected_cash = v_new_expected,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
        'success', true,
        'shift_id', p_shift_id,
        'expected_cash', v_new_expected
    );
END;
$$;

-- ============================================================================
-- 3. FUNCTION: close_cashier_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION public.close_cashier_shift(
    p_shift_id UUID,
    p_closing_cash NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_shift RECORD;
    v_difference NUMERIC(12,2);
    v_cash_sales NUMERIC(12,2) := 0;
    v_cash_in NUMERIC(12,2) := 0;
    v_cash_out NUMERIC(12,2) := 0;
    v_refunds NUMERIC(12,2) := 0;
    v_recalculated_expected NUMERIC(12,2) := 0;
BEGIN
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    IF p_closing_cash < 0 THEN
        RAISE EXCEPTION 'Closing cash count cannot be negative.';
    END IF;

    SELECT * INTO v_shift
    FROM public.cashier_shifts
    WHERE id = p_shift_id
    FOR UPDATE;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Shift not found.';
    END IF;

    IF v_shift.status <> 'open' THEN
        RAISE EXCEPTION 'Shift is already closed.';
    END IF;

    -- Cashier can only close their own shift, unless manager/super_admin
    IF v_shift.cashier_id <> v_caller_id AND NOT private.has_role(ARRAY['super_admin', 'manager']) THEN
        RAISE EXCEPTION 'You cannot close another cashier''s shift.';
    END IF;

    -- Calculate verified ledger totals
    SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'sale' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN movement_type = 'in' AND reason NOT LIKE 'Initial cash float%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN movement_type = 'out' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN movement_type = 'refund' THEN amount ELSE 0 END), 0)
    INTO v_cash_sales, v_cash_in, v_cash_out, v_refunds
    FROM public.cash_movements
    WHERE shift_id = p_shift_id;

    v_recalculated_expected := v_shift.opening_cash + v_cash_sales + v_cash_in - v_cash_out - v_refunds;
    v_difference := p_closing_cash - v_recalculated_expected;

    UPDATE public.cashier_shifts
    SET expected_cash = v_recalculated_expected,
        closing_cash = p_closing_cash,
        cash_difference = v_difference,
        status = 'closed',
        closed_at = timezone('utc'::text, now()),
        closed_by = v_caller_id,
        notes = CASE 
            WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN 
                COALESCE(notes || E'\n' || p_notes, p_notes)
            ELSE notes 
        END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
        'success', true,
        'shift_id', p_shift_id,
        'opening_cash', v_shift.opening_cash,
        'cash_sales', v_cash_sales,
        'cash_in', v_cash_in,
        'cash_out', v_cash_out,
        'expected_cash', v_recalculated_expected,
        'closing_cash', p_closing_cash,
        'cash_difference', v_difference,
        'closed_at', timezone('utc'::text, now())
    );
END;
$$;

-- ============================================================================
-- 4. FUNCTION: complete_pos_sale
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_pos_sale(
    p_items JSONB,
    p_payments JSONB,
    p_customer JSONB DEFAULT '{}'::jsonb,
    p_discount_amount NUMERIC DEFAULT 0,
    p_tax_amount NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_shift_id UUID := p_shift_id;
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
    v_total NUMERIC(12,2) := 0;

    v_payment JSONB;
    v_pay_method TEXT;
    v_pay_amount NUMERIC(12,2);
    v_pay_tendered NUMERIC(12,2);
    v_pay_change NUMERIC(12,2);
    v_pay_provider TEXT;
    v_pay_ref TEXT;
    v_total_paid NUMERIC(12,2) := 0;
    v_total_cash NUMERIC(12,2) := 0;
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

    -- Get cashier name
    SELECT full_name INTO v_cashier_name FROM public.profiles WHERE id = v_caller_id;

    -- Validate or discover open shift
    IF v_shift_id IS NULL THEN
        SELECT id INTO v_shift_id
        FROM public.cashier_shifts
        WHERE cashier_id = v_caller_id AND status = 'open'
        LIMIT 1;
    ELSE
        IF NOT EXISTS (SELECT 1 FROM public.cashier_shifts WHERE id = v_shift_id AND status = 'open') THEN
            RAISE EXCEPTION 'Specified shift % is not active or closed.', v_shift_id;
        END IF;
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

    -- Check and deduct inventory atomically
    -- Loop items, verify pricing and stock
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

    -- Total calculation
    v_total := v_subtotal - COALESCE(p_discount_amount, 0) + COALESCE(p_tax_amount, 0);
    IF v_total < 0 THEN
        v_total := 0;
    END IF;

    -- Validate payment totals
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_pay_amount := (v_payment->>'amount')::NUMERIC;
        v_pay_method := v_payment->>'method';
        v_total_paid := v_total_paid + v_pay_amount;

        IF v_pay_method = 'cash' THEN
            v_total_cash := v_total_cash + v_pay_amount;
        END IF;
    END LOOP;

    IF v_total_paid < v_total THEN
        RAISE EXCEPTION 'Total paid (%) is less than order total (%)', v_total_paid, v_total;
    END IF;

    IF v_total_cash > 0 AND v_shift_id IS NULL THEN
        RAISE EXCEPTION 'An active open shift is required to accept cash payments.';
    END IF;

    IF jsonb_array_length(p_payments) = 1 THEN
        v_primary_method := p_payments->0->>'method';
    ELSE
        v_primary_method := 'split';
    END IF;

    -- Generate numbers
    v_date_str := to_char(timezone('Africa/Lagos'::text, now()), 'YYYYMMDD');
    
    -- Order number
    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_order_number := 'NF-' || v_date_str || '-' || v_seq_num;
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_order_number := 'NF-' || v_date_str || '-' || v_seq_num;
    END LOOP;

    -- POS Transaction number
    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_trans_number := 'POS-' || v_date_str || '-' || v_seq_num;
    WHILE EXISTS (SELECT 1 FROM public.pos_transactions WHERE transaction_number = v_trans_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_trans_number := 'POS-' || v_date_str || '-' || v_seq_num;
    END LOOP;

    -- Receipt number
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
        discount_amount,
        delivery_fee,
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
        'dine_in',
        'completed',
        'paid',
        v_subtotal,
        COALESCE(p_discount_amount, 0),
        0,
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

    -- 3. Record payments & shift cash movements
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
            status,
            shift_id
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
            'completed',
            v_shift_id
        ) RETURNING id INTO v_payment_id;

        -- If cash, record movement and update shift drawer
        IF v_pay_method = 'cash' AND v_shift_id IS NOT NULL THEN
            INSERT INTO public.cash_movements (
                shift_id,
                cashier_id,
                movement_type,
                amount,
                reason,
                reference,
                payment_id
            ) VALUES (
                v_shift_id,
                v_caller_id,
                'sale',
                v_pay_amount,
                'POS Cash Sale ' || v_order_number,
                v_order_number,
                v_payment_id
            );

            UPDATE public.cashier_shifts
            SET expected_cash = expected_cash + v_pay_amount,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_shift_id;
        END IF;
    END LOOP;

    -- 4. Create POS Transaction record
    INSERT INTO public.pos_transactions (
        transaction_number,
        order_id,
        cashier_id,
        shift_id,
        customer_id,
        customer_name,
        customer_phone,
        subtotal,
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
        v_shift_id,
        v_customer_id,
        v_customer_name,
        v_customer_phone,
        v_subtotal,
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
        'subtotal', v_subtotal,
        'discount', COALESCE(p_discount_amount, 0),
        'total', v_total,
        'amount_paid', v_total_paid
    );
END;
$$;

-- ============================================================================
-- 5. FUNCTION: record_order_payment (Online / Phone orders)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_order_payment(
    p_order_id UUID,
    p_payment_method TEXT,
    p_amount NUMERIC,
    p_amount_tendered NUMERIC DEFAULT NULL,
    p_change_due NUMERIC DEFAULT 0,
    p_provider TEXT DEFAULT NULL,
    p_transaction_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_shift_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_shift_id UUID := p_shift_id;
    v_order RECORD;
    v_cashier_name TEXT;
    v_new_paid NUMERIC(12,2);
    v_payment_id UUID;
    v_receipt_id UUID;
    v_receipt_number TEXT;
    v_date_str TEXT;
    v_seq_num TEXT;
BEGIN
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Access denied. Cashier privilege required.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Order % is already fully paid.', v_order.order_number;
    END IF;

    -- Get cashier name
    SELECT full_name INTO v_cashier_name FROM public.profiles WHERE id = v_caller_id;

    -- Validate or discover open shift if cash
    IF p_payment_method = 'cash' THEN
        IF v_shift_id IS NULL THEN
            SELECT id INTO v_shift_id
            FROM public.cashier_shifts
            WHERE cashier_id = v_caller_id AND status = 'open'
            LIMIT 1;
        END IF;

        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'An active open shift is required to accept cash payments.';
        END IF;
    END IF;

    -- Insert payment record
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
        status,
        shift_id
    ) VALUES (
        p_order_id,
        v_caller_id,
        v_caller_id,
        timezone('utc'::text, now()),
        p_payment_method,
        p_amount,
        COALESCE(p_amount_tendered, p_amount),
        COALESCE(p_change_due, 0),
        p_provider,
        p_transaction_reference,
        'completed',
        v_shift_id
    ) RETURNING id INTO v_payment_id;

    -- Update order paid totals
    v_new_paid := v_order.amount_paid + p_amount;

    UPDATE public.orders
    SET amount_paid = v_new_paid,
        payment_status = CASE WHEN v_new_paid >= total_amount THEN 'paid' ELSE 'partially_paid' END,
        paid_at = CASE WHEN v_new_paid >= total_amount THEN timezone('utc'::text, now()) ELSE paid_at END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- If cash, record drawer movement
    IF p_payment_method = 'cash' AND v_shift_id IS NOT NULL THEN
        INSERT INTO public.cash_movements (
            shift_id,
            cashier_id,
            movement_type,
            amount,
            reason,
            reference,
            payment_id
        ) VALUES (
            v_shift_id,
            v_caller_id,
            'sale',
            p_amount,
            'Payment for ' || v_order.order_number,
            v_order.order_number,
            v_payment_id
        );

        UPDATE public.cashier_shifts
        SET expected_cash = expected_cash + p_amount,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_shift_id;
    END IF;

    -- Issue receipt
    v_date_str := to_char(timezone('Africa/Lagos'::text, now()), 'YYYYMMDD');
    v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_receipt_number := 'REC-' || v_date_str || '-' || v_seq_num;
    WHILE EXISTS (SELECT 1 FROM public.receipts WHERE receipt_number = v_receipt_number) LOOP
        v_seq_num := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
        v_receipt_number := 'REC-' || v_date_str || '-' || v_seq_num;
    END LOOP;

    INSERT INTO public.receipts (
        receipt_number,
        order_id,
        payment_id,
        cashier_id,
        receipt_type,
        reprint_count,
        issued_at,
        metadata
    ) VALUES (
        v_receipt_number,
        p_order_id,
        v_payment_id,
        v_caller_id,
        'standard',
        0,
        timezone('utc'::text, now()),
        jsonb_build_object(
            'cashier_name', v_cashier_name,
            'order_number', v_order.order_number,
            'amount_paid', p_amount,
            'total_order_amount', v_order.total_amount
        )
    ) RETURNING id INTO v_receipt_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'payment_id', v_payment_id,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'amount_paid', v_new_paid,
        'is_fully_paid', (v_new_paid >= v_order.total_amount)
    );
END;
$$;

-- ============================================================================
-- 6. FUNCTION: reprint_receipt
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reprint_receipt(p_receipt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_receipt RECORD;
BEGIN
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    UPDATE public.receipts
    SET reprint_count = reprint_count + 1,
        last_reprinted_at = timezone('utc'::text, now()),
        last_reprinted_by = v_caller_id
    WHERE id = p_receipt_id
    RETURNING * INTO v_receipt;

    IF v_receipt IS NULL THEN
        RAISE EXCEPTION 'Receipt not found.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt.id,
        'receipt_number', v_receipt.receipt_number,
        'reprint_count', v_receipt.reprint_count,
        'last_reprinted_at', v_receipt.last_reprinted_at
    );
END;
$$;

-- ============================================================================
-- 7. FUNCTION: get_cashier_dashboard_stats
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_cashier_dashboard_stats(p_shift_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_today_start TIMESTAMPTZ := timezone('Africa/Lagos'::text, date_trunc('day', timezone('Africa/Lagos'::text, now())));
    v_today_total NUMERIC(12,2) := 0;
    v_today_count INT := 0;
    v_cash_total NUMERIC(12,2) := 0;
    v_transfer_total NUMERIC(12,2) := 0;
    v_pos_total NUMERIC(12,2) := 0;
    v_online_total NUMERIC(12,2) := 0;
    v_pending_orders_count INT := 0;
    v_active_shift RECORD;
BEGIN
    IF NOT private.has_role(ARRAY['super_admin', 'manager', 'cashier']) THEN
        RETURN jsonb_build_object(
            'today_total', 0,
            'today_count', 0,
            'cash_total', 0,
            'transfer_total', 0,
            'pos_total', 0,
            'online_total', 0,
            'pending_orders_count', 0,
            'active_shift', NULL
        );
    END IF;

    -- Query today's payments
    SELECT
        COALESCE(SUM(amount), 0),
        COUNT(*),
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method = 'pos_terminal' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method = 'online' THEN amount ELSE 0 END), 0)
    INTO
        v_today_total,
        v_today_count,
        v_cash_total,
        v_transfer_total,
        v_pos_total,
        v_online_total
    FROM public.payments
    WHERE status = 'completed'
      AND created_at >= v_today_start
      AND (
          -- If cashier, filter by cashier_id unless manager
          private.has_role(ARRAY['super_admin', 'manager']) OR cashier_id = v_caller_id
      );

    -- Pending orders count
    SELECT COUNT(*) INTO v_pending_orders_count
    FROM public.orders
    WHERE payment_status IN ('unpaid', 'partially_paid')
      AND status NOT IN ('cancelled', 'rejected');

    -- Active shift for caller
    SELECT id, shift_number, opening_cash, expected_cash, opened_at, notes
    INTO v_active_shift
    FROM public.cashier_shifts
    WHERE cashier_id = v_caller_id AND status = 'open'
    LIMIT 1;

    RETURN jsonb_build_object(
        'today_total', v_today_total,
        'today_count', v_today_count,
        'cash_total', v_cash_total,
        'transfer_total', v_transfer_total,
        'pos_total', v_pos_total,
        'online_total', v_online_total,
        'pending_orders_count', v_pending_orders_count,
        'active_shift', CASE WHEN v_active_shift.id IS NOT NULL THEN to_jsonb(v_active_shift) ELSE NULL END
    );
END;
$$;

-- ============================================================================
-- 8. RLS POLICIES FOR CASHIER MODULE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- cashier_shifts Policies
DROP POLICY IF EXISTS "Cashiers and Managers can view shifts" ON public.cashier_shifts;
CREATE POLICY "Cashiers and Managers can view shifts"
ON public.cashier_shifts FOR SELECT
USING (
    private.has_role(ARRAY['super_admin', 'manager']) OR
    (private.has_role(ARRAY['cashier']) AND cashier_id = auth.uid())
);

DROP POLICY IF EXISTS "Cashiers can insert their shifts" ON public.cashier_shifts;
CREATE POLICY "Cashiers can insert their shifts"
ON public.cashier_shifts FOR INSERT
WITH CHECK (
    private.has_role(ARRAY['super_admin', 'manager', 'cashier']) AND
    cashier_id = auth.uid()
);

-- cash_movements Policies
DROP POLICY IF EXISTS "Cashiers and Managers can view movements" ON public.cash_movements;
CREATE POLICY "Cashiers and Managers can view movements"
ON public.cash_movements FOR SELECT
USING (
    private.has_role(ARRAY['super_admin', 'manager']) OR
    (private.has_role(ARRAY['cashier']) AND cashier_id = auth.uid())
);

-- pos_transactions Policies
DROP POLICY IF EXISTS "Staff can view pos_transactions" ON public.pos_transactions;
CREATE POLICY "Staff can view pos_transactions"
ON public.pos_transactions FOR SELECT
USING (
    private.has_role(ARRAY['super_admin', 'manager', 'cashier'])
);

-- receipts Policies
DROP POLICY IF EXISTS "Staff can view receipts" ON public.receipts;
CREATE POLICY "Staff can view receipts"
ON public.receipts FOR SELECT
USING (
    private.has_role(ARRAY['super_admin', 'manager', 'cashier'])
);

-- payments SELECT Policy update for cashiers
DROP POLICY IF EXISTS "Cashiers can view payments" ON public.payments;
CREATE POLICY "Cashiers can view payments"
ON public.payments FOR SELECT
USING (
    private.has_role(ARRAY['super_admin', 'manager', 'cashier'])
);

-- Permissions grants
GRANT EXECUTE ON FUNCTION public.open_cashier_shift(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_cash_movement(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cashier_shift(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pos_sale(JSONB, JSONB, JSONB, NUMERIC, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reprint_receipt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cashier_dashboard_stats(UUID) TO anon, authenticated, service_role;


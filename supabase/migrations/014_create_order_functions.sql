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

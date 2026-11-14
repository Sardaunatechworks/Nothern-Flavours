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


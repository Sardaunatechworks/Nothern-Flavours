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


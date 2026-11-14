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

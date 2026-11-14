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

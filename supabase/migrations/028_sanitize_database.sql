-- ==============================================================================
-- Migration 028: Database Sanitization & Production Reset
-- Purpose: Purge all mock, seed, and development test data, leaving a clean,
--          secure production-ready state while preserving admin/cashier credentials
--          and core restaurant configurations.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PURGE ALL TRANSACTIONAL & OPERATIONAL TEST DATA
-- ------------------------------------------------------------------------------
-- Truncates all orders, sales, payments, receipts, shifts, movements, and logs
TRUNCATE TABLE 
    public.receipts,
    public.pos_transactions,
    public.payments,
    public.cash_movements,
    public.cashier_shifts,
    public.order_items,
    public.orders,
    public.customers,
    public.inventory_movements,
    public.audit_logs,
    public.notifications,
    public.payment_webhook_events
CASCADE;

-- Optional: Reset suppliers table if any mock vendor was created
TRUNCATE TABLE public.suppliers CASCADE;

-- ------------------------------------------------------------------------------
-- 2. PURGE MOCK PRODUCTS & CATEGORIES (FRESH START)
-- ------------------------------------------------------------------------------
-- Remove seeded menu items and mock categories so you can start with a clean menu
TRUNCATE TABLE 
    public.products,
    public.categories
CASCADE;

-- Re-insert clean, production-ready category hierarchy (optional starter categories)
INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Rice Dishes', 'rice-dishes', 'Freshly prepared savory rice specialties', 1, true),
    ('c0000000-0000-0000-0000-000000000002', 'Swallow & Soups', 'swallow-soups', 'Traditional swallows and rich local soups', 2, true),
    ('c0000000-0000-0000-0000-000000000003', 'Proteins & Suya', 'proteins-suya', 'Seasoned meats, fresh fish, chicken and spicy suya', 3, true),
    ('c0000000-0000-0000-0000-000000000004', 'Sides & Extras', 'sides-extras', 'Plantain, moi-moi, salads and side portions', 4, true),
    ('c0000000-0000-0000-0000-000000000005', 'Special Combos', 'special-combos', 'Chef special platters and Northern delicacies', 5, true),
    ('c0000000-0000-0000-0000-000000000006', 'Snacks & Pastries', 'snacks-pastries', 'Pies, spring rolls, samosas and quick bites', 6, true),
    ('c0000000-0000-0000-0000-000000000007', 'Drinks & Beverages', 'drinks-beverages', 'Zobo, kunu aya, juices and cold refreshments', 7, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_active = true;

-- ------------------------------------------------------------------------------
-- 3. ENSURE CLEAN RESTAURANT & DELIVERY SETTINGS
-- ------------------------------------------------------------------------------
-- Ensure singleton restaurant profile is accurate
INSERT INTO public.restaurant_settings (
    id,
    restaurant_name,
    phone,
    whatsapp_number,
    address,
    opening_time,
    closing_time,
    is_accepting_orders,
    default_delivery_fee,
    takeaway_packaging_enabled,
    takeaway_packaging_model,
    takeaway_packaging_fee
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Northern Flavours Restaurant',
    '09068202567',
    '2349068202567',
    'Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria',
    '08:00:00',
    '22:00:00',
    true,
    300.00,
    true,
    'order',
    500.00
)
ON CONFLICT (id) DO UPDATE SET
    restaurant_name = EXCLUDED.restaurant_name,
    phone = EXCLUDED.phone,
    whatsapp_number = EXCLUDED.whatsapp_number,
    address = EXCLUDED.address,
    default_delivery_fee = EXCLUDED.default_delivery_fee,
    takeaway_packaging_enabled = EXCLUDED.takeaway_packaging_enabled,
    takeaway_packaging_model = EXCLUDED.takeaway_packaging_model,
    takeaway_packaging_fee = EXCLUDED.takeaway_packaging_fee;

-- Clean delivery zones
TRUNCATE TABLE public.delivery_settings CASCADE;

INSERT INTO public.delivery_settings (name, delivery_fee, is_active)
VALUES
    ('Dutse Central (Gajambe, Yalwawa, Takur)', 300.00, true),
    ('Dutse Outer (FUD Campus, G9, Limawa)', 500.00, true),
    ('Dutse Outskirts / Express Delivery', 1000.00, true);

-- ------------------------------------------------------------------------------
-- 4. VERIFY USER ACCOUNTS & PROFILES INTEGRITY
-- ------------------------------------------------------------------------------
-- Ensure admin and cashier staff roles are properly set and active
UPDATE public.profiles
SET is_active = true
WHERE role IN ('super_admin', 'manager', 'cashier');

COMMIT;

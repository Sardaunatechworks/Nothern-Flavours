-- Migration 021: Extend Roles, Orders, and Payments
-- Purpose: Add cashier role and extend orders and payments tables for POS & cashier tracking.

-- 1. Extend profiles.role check constraint to include 'cashier'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('super_admin', 'manager', 'order_manager', 'inventory_manager', 'cashier', 'staff')
);

-- 2. Extend orders table with source, discount, amount_paid, paid_at, and creator
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'online' CHECK (order_source IN ('online', 'pos')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0);

-- 3. Extend orders.payment_status check constraint to support 'partially_paid'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('unpaid', 'pending', 'partially_paid', 'paid', 'refunded', 'failed')
);

-- 4. Extend payments table with cashier, verification, provider, and shift metadata
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_reference TEXT,
ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS amount_tendered NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS change_due NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_id UUID;

-- 5. Indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_cashier_id ON public.payments(cashier_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift_id ON public.payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON public.payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON public.orders(order_source);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);


-- Migration 023: POS Transactions and Payment Webhooks
-- Purpose: Store dedicated POS counter transactions and idempotent payment webhook logs.

-- 1. Create pos_transactions table
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number TEXT UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'pos_terminal', 'online', 'split')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    notes TEXT,
    completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create payment_webhook_events table
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    transaction_reference TEXT,
    event_type TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'ignored', 'failed')),
    payload JSONB NOT NULL,
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_webhook_provider_event UNIQUE(provider, event_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_pos_transactions_order_id ON public.pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier_id ON public.pos_transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_shift_id ON public.pos_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_completed_at ON public.pos_transactions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_ref ON public.payment_webhook_events(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON public.payment_webhook_events(processing_status);

COMMENT ON TABLE public.pos_transactions IS 'Detailed audit records for walk-in POS counter orders and transactions';
COMMENT ON TABLE public.payment_webhook_events IS 'Inbound payment provider webhook event logs with idempotency tracking';

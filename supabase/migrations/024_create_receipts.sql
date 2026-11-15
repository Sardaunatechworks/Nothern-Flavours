-- Migration 024: Cashier Receipts and Thermal Invoicing
-- Purpose: Track issued receipts, thermal printer print/reprint counts, and receipt audit trails.

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    pos_transaction_id UUID REFERENCES public.pos_transactions(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    receipt_type TEXT NOT NULL DEFAULT 'standard' CHECK (receipt_type IN ('standard', 'pos', 'duplicate', 'refund')),
    reprint_count INT NOT NULL DEFAULT 0 CHECK (reprint_count >= 0),
    last_reprinted_at TIMESTAMPTZ,
    last_reprinted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON public.receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_cashier_id ON public.receipts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_issued_at ON public.receipts(issued_at DESC);

COMMENT ON TABLE public.receipts IS 'Audit records of sales receipts printed or emailed with reprint tracking';

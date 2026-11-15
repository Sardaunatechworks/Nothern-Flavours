-- Migration 022: Cashier Shifts and Cash Movements
-- Purpose: Track cashier work shifts, starting floats, expected cash, and movement audit logs.

-- 1. Create cashier_shifts table
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_number TEXT UNIQUE NOT NULL,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
    expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
    closing_cash NUMERIC(12,2),
    cash_difference NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Link payments.shift_id foreign key constraint
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS fk_payments_shift_id;
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_shift_id 
FOREIGN KEY (shift_id) REFERENCES public.cashier_shifts(id) ON DELETE SET NULL;

-- 3. Create cash_movements table
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.cashier_shifts(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'refund', 'in', 'out')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    reference TEXT,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier ON public.cashier_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_status ON public.cashier_shifts(status);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_opened_at ON public.cashier_shifts(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON public.cash_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_cashier ON public.cash_movements(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_payment ON public.cash_movements(payment_id);

-- 5. Updated_at trigger for shifts
DROP TRIGGER IF EXISTS trg_cashier_shifts_updated_at ON public.cashier_shifts;
CREATE TRIGGER trg_cashier_shifts_updated_at BEFORE UPDATE ON public.cashier_shifts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cashier_shifts IS 'Cashier register work sessions and cash drawer reconciliations';
COMMENT ON TABLE public.cash_movements IS 'Audit ledger for all cash drawer in/out movements and cash sales';


-- Migration 007: Inventory Movements
-- Purpose: Complete audit trail for all stock adjustments and order deductions/reversals.

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN ('stock_in', 'stock_out', 'adjustment', 'order_deduction', 'order_reversal', 'waste', 'damaged')
    ),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
    new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
    reason TEXT,
    reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure an order deduction or reversal cannot be duplicated for the same product and order
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_order_deduction_idempotency
ON public.inventory_movements (product_id, reference_order_id, movement_type)
WHERE reference_order_id IS NOT NULL AND movement_type IN ('order_deduction', 'order_reversal');

COMMENT ON TABLE public.inventory_movements IS 'Immutable stock movement transaction log';


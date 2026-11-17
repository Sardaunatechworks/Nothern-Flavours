-- ==============================================================================
-- Migration 032: Fix Product Unique Constraints & Clean Blank SKUs
-- Purpose: Resolves HTTP 409 Conflict when creating or updating products.
--          1. Converts empty string/whitespace SKUs to NULL (Postgres allows multiple NULLs in unique constraints).
--          2. Suffixes archived products so they never conflict with active items.
--          3. Replaces global unique constraints with partial unique indexes for active items.
-- ==============================================================================

BEGIN;

-- 1. Convert any empty or blank string SKUs to NULL
UPDATE public.products
SET sku = NULL
WHERE sku IS NOT NULL AND trim(sku) = '';

-- 2. Suffix archived/deleted products so old archived items never block active menu items
UPDATE public.products
SET slug = slug || '-archived-' || substr(id::text, 1, 8),
    sku = CASE 
            WHEN sku IS NOT NULL AND sku NOT LIKE '%-archived-%' 
            THEN sku || '-archived-' || substr(id::text, 1, 8) 
            ELSE sku 
          END
WHERE deleted_at IS NOT NULL 
  AND slug NOT LIKE '%-archived-%';

-- 3. Replace table-level slug unique constraint with partial unique index on active items
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_slug_key;
DROP INDEX IF EXISTS public.idx_products_active_slug;
CREATE UNIQUE INDEX idx_products_active_slug 
ON public.products(slug) 
WHERE deleted_at IS NULL;

-- 4. Replace table-level sku unique constraint with partial unique index on active items with non-null SKU
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
DROP INDEX IF EXISTS public.idx_products_active_sku;
CREATE UNIQUE INDEX idx_products_active_sku 
ON public.products(sku) 
WHERE deleted_at IS NULL AND sku IS NOT NULL;

COMMIT;


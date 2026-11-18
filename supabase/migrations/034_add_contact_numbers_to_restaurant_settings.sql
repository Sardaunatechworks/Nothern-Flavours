-- ==============================================================================
-- Migration 034: Add General Telephone Contact Numbers to Restaurant Settings
-- Purpose: Adds secondary and tertiary telephone contact numbers to the singleton
--          restaurant_settings table (0813 139 3402 and 0904 353 8768).
--          Preserves existing WhatsApp number separately.
-- ==============================================================================

BEGIN;

-- 1. Add secondary and tertiary telephone columns
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS phone_secondary TEXT DEFAULT '08131393402',
ADD COLUMN IF NOT EXISTS phone_tertiary TEXT DEFAULT '09043538768';

-- 2. Populate default contact numbers if null or empty
UPDATE public.restaurant_settings
SET 
    phone = COALESCE(NULLIF(phone, ''), '09068202567'),
    phone_secondary = COALESCE(NULLIF(phone_secondary, ''), '08131393402'),
    phone_tertiary = COALESCE(NULLIF(phone_tertiary, ''), '09043538768'),
    whatsapp_number = COALESCE(NULLIF(whatsapp_number, ''), '2349068202567')
WHERE id IS NOT NULL;

COMMIT;

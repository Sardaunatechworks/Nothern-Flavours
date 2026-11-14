-- Migration 009: Restaurant and Delivery Settings
-- Purpose: Store restaurant identity, operation toggles, and delivery pricing.

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_name TEXT NOT NULL DEFAULT 'Northern Flavours Restaurant',
    logo_url TEXT,
    phone TEXT DEFAULT '09068202567',
    whatsapp_number TEXT DEFAULT '2349068202567',
    address TEXT DEFAULT 'Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria',
    opening_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "22:00", "is_open": true}, "tuesday": {"open": "08:00", "close": "22:00", "is_open": true}, "wednesday": {"open": "08:00", "close": "22:00", "is_open": true}, "thursday": {"open": "08:00", "close": "22:00", "is_open": true}, "friday": {"open": "08:00", "close": "22:00", "is_open": true}, "saturday": {"open": "08:00", "close": "22:00", "is_open": true}, "sunday": {"open": "08:00", "close": "22:00", "is_open": true}}'::jsonb,
    accepting_orders BOOLEAN DEFAULT TRUE,
    delivery_enabled BOOLEAN DEFAULT TRUE,
    pickup_enabled BOOLEAN DEFAULT TRUE,
    default_delivery_fee NUMERIC(12,2) DEFAULT 1000.00 CHECK (default_delivery_fee >= 0),
    currency TEXT DEFAULT 'NGN',
    timezone TEXT DEFAULT 'Africa/Lagos',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    delivery_fee NUMERIC(12,2) NOT NULL CHECK (delivery_fee >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default singleton row if empty
INSERT INTO public.restaurant_settings (id, restaurant_name, phone, whatsapp_number, address)
VALUES ('00000000-0000-0000-0000-000000000001', 'Northern Flavours Restaurant', '09068202567', '2349068202567', 'Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria')
ON CONFLICT (id) DO NOTHING;

-- Migration 002: Profiles and Roles
-- Purpose: User profile records linked to auth.users with strict 5-tier role validation.

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (
        role IN ('super_admin', 'manager', 'order_manager', 'inventory_manager', 'staff')
    ),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comment on table and columns
COMMENT ON TABLE public.profiles IS 'Staff and administrative profiles linked to Supabase Auth';
COMMENT ON COLUMN public.profiles.role IS 'One of: super_admin, manager, order_manager, inventory_manager, staff';

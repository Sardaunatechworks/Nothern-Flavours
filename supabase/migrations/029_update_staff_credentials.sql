-- ==============================================================================
-- Migration 029: Update Staff Login Credentials (Admin & Cashier)
-- Purpose: Set or update production login credentials for Super Admin & Cashier.
--          Edit the variables in the DECLARE block below before running in Supabase.
-- ==============================================================================

DO $$
DECLARE
    -- =========================================================================
    -- 1. CONFIGURE YOUR DESIRED CREDENTIALS HERE:
    -- =========================================================================
    v_admin_email          TEXT := 'admin@northernflavors.ng';
    v_admin_password       TEXT := 'admin123';
    v_admin_name           TEXT := 'Restaurant Administrator';
    v_admin_phone          TEXT := '09068202567';

    v_cashier_email        TEXT := 'cashier@northernflavors.ng';
    v_cashier_password     TEXT := 'cashier123';
    v_cashier_name         TEXT := 'Cashier Staff';
    v_cashier_phone        TEXT := '09068202567';
    -- =========================================================================

    v_admin_user_id        UUID;
    v_cashier_user_id      UUID;
    v_admin_encrypted_pw   TEXT := crypt(v_admin_password, gen_salt('bf'));
    v_cashier_encrypted_pw TEXT := crypt(v_cashier_password, gen_salt('bf'));
BEGIN
    -- -------------------------------------------------------------------------
    -- UPDATE OR CREATE ADMIN USER
    -- -------------------------------------------------------------------------
    SELECT id INTO v_admin_user_id 
    FROM auth.users 
    WHERE email = v_admin_email 
       OR id IN (SELECT id FROM public.profiles WHERE role = 'super_admin') 
    LIMIT 1;

    IF v_admin_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET email = v_admin_email,
            encrypted_password = v_admin_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('full_name', v_admin_name, 'role', 'super_admin'),
            updated_at = now()
        WHERE id = v_admin_user_id;

        UPDATE auth.identities
        SET email = v_admin_email,
            provider_id = v_admin_user_id::text,
            identity_data = jsonb_build_object('sub', v_admin_user_id::text, 'email', v_admin_email),
            updated_at = now()
        WHERE user_id = v_admin_user_id;

        UPDATE public.profiles
        SET full_name = v_admin_name,
            phone = v_admin_phone,
            role = 'super_admin',
            is_active = true
        WHERE id = v_admin_user_id;
    ELSE
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            v_admin_email, v_admin_encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_admin_name, 'role', 'super_admin'),
            now(), now()
        ) RETURNING id INTO v_admin_user_id;

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_admin_user_id, v_admin_user_id, v_admin_user_id::text,
            jsonb_build_object('sub', v_admin_user_id::text, 'email', v_admin_email),
            'email', now(), now(), now()
        );

        INSERT INTO public.profiles (id, full_name, phone, role, is_active)
        VALUES (v_admin_user_id, v_admin_name, v_admin_phone, 'super_admin', true)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            role = 'super_admin',
            is_active = true;
    END IF;

    -- -------------------------------------------------------------------------
    -- UPDATE OR CREATE CASHIER USER
    -- -------------------------------------------------------------------------
    SELECT id INTO v_cashier_user_id 
    FROM auth.users 
    WHERE email = v_cashier_email 
       OR id IN (SELECT id FROM public.profiles WHERE role = 'cashier') 
    LIMIT 1;

    IF v_cashier_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET email = v_cashier_email,
            encrypted_password = v_cashier_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('full_name', v_cashier_name, 'role', 'cashier'),
            updated_at = now()
        WHERE id = v_cashier_user_id;

        UPDATE auth.identities
        SET email = v_cashier_email,
            provider_id = v_cashier_user_id::text,
            identity_data = jsonb_build_object('sub', v_cashier_user_id::text, 'email', v_cashier_email),
            updated_at = now()
        WHERE user_id = v_cashier_user_id;

        UPDATE public.profiles
        SET full_name = v_cashier_name,
            phone = v_cashier_phone,
            role = 'cashier',
            is_active = true
        WHERE id = v_cashier_user_id;
    ELSE
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            v_cashier_email, v_cashier_encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_cashier_name, 'role', 'cashier'),
            now(), now()
        ) RETURNING id INTO v_cashier_user_id;

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_cashier_user_id, v_cashier_user_id, v_cashier_user_id::text,
            jsonb_build_object('sub', v_cashier_user_id::text, 'email', v_cashier_email),
            'email', now(), now(), now()
        );

        INSERT INTO public.profiles (id, full_name, phone, role, is_active)
        VALUES (v_cashier_user_id, v_cashier_name, v_cashier_phone, 'cashier', true)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            role = 'cashier',
            is_active = true;
    END IF;
END $$;

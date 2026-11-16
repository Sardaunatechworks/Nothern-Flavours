-- ==============================================================================
-- Migration 030: Staff Management CRUD, Temporary Passwords & Password Change
-- Purpose: Support complete Admin CRUD for staff personnel, role assignments,
--          temporary passwords requiring first-login reset, and self-service password updates.
-- ==============================================================================

BEGIN;

-- 1. Extend profiles table with must_change_password and email
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users where possible
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 2. Function: Admin Create Staff Member
CREATE OR REPLACE FUNCTION public.admin_create_staff_member(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'cashier',
    p_must_change_password BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_new_user_id UUID := gen_random_uuid();
    v_encrypted_pw TEXT;
    v_clean_email TEXT := lower(trim(p_email));
    v_clean_role TEXT := lower(trim(p_role));
BEGIN
    -- Authorization: Caller must be super_admin or manager
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('super_admin', 'manager') THEN
        RAISE EXCEPTION 'Access denied. Only Super Admins and Managers can create staff members.';
    END IF;

    -- Validate role
    IF v_clean_role NOT IN ('super_admin', 'manager', 'order_manager', 'inventory_manager', 'cashier', 'staff') THEN
        RAISE EXCEPTION 'Invalid role specified: %', p_role;
    END IF;

    -- Ensure manager cannot create super_admin
    IF v_caller_role = 'manager' AND v_clean_role = 'super_admin' THEN
        RAISE EXCEPTION 'Managers cannot create Super Admin accounts.';
    END IF;

    -- Validate email does not exist
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_clean_email) THEN
        RAISE EXCEPTION 'A user with email % already exists.', v_clean_email;
    END IF;

    -- Encrypt password
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id,
        'authenticated',
        'authenticated',
        v_clean_email,
        v_encrypted_pw,
        timezone('utc'::text, now()),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', p_full_name, 'role', v_clean_role),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        v_new_user_id,
        v_new_user_id::text,
        jsonb_build_object('sub', v_new_user_id::text, 'email', v_clean_email),
        'email',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );

    -- Insert into public.profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        role,
        is_active,
        must_change_password,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        p_full_name,
        v_clean_email,
        p_phone,
        v_clean_role,
        true,
        p_must_change_password,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        must_change_password = EXCLUDED.must_change_password,
        is_active = true;

    -- Audit log
    INSERT INTO public.audit_logs (
        user_id, action, entity_type, entity_id, new_values
    ) VALUES (
        v_caller_id,
        'create_staff',
        'profiles',
        v_new_user_id,
        jsonb_build_object('email', v_clean_email, 'role', v_clean_role, 'full_name', p_full_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_new_user_id,
        'email', v_clean_email,
        'full_name', p_full_name,
        'role', v_clean_role,
        'must_change_password', p_must_change_password
    );
END;
$$;

-- 3. Function: Admin Reset Staff Password & Require Change
CREATE OR REPLACE FUNCTION public.admin_reset_staff_password(
    p_user_id UUID,
    p_new_password TEXT,
    p_must_change_password BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_target_role TEXT;
    v_encrypted_pw TEXT;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('super_admin', 'manager') THEN
        RAISE EXCEPTION 'Access denied. Only Super Admins and Managers can reset passwords.';
    END IF;

    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Target user not found.';
    END IF;

    -- Managers cannot reset Super Admin passwords
    IF v_caller_role = 'manager' AND v_target_role = 'super_admin' THEN
        RAISE EXCEPTION 'Managers cannot reset Super Admin passwords.';
    END IF;

    v_encrypted_pw := crypt(p_new_password, gen_salt('bf'));

    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    UPDATE public.profiles
    SET must_change_password = p_must_change_password,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    INSERT INTO public.audit_logs (
        user_id, action, entity_type, entity_id, new_values
    ) VALUES (
        v_caller_id,
        'reset_staff_password',
        'profiles',
        p_user_id,
        jsonb_build_object('must_change_password', p_must_change_password)
    );

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- 4. Function: Admin Delete Staff Member
CREATE OR REPLACE FUNCTION public.admin_delete_staff_member(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('super_admin', 'manager') THEN
        RAISE EXCEPTION 'Access denied. Only Super Admins and Managers can delete staff members.';
    END IF;

    IF v_caller_id = p_user_id THEN
        RAISE EXCEPTION 'You cannot delete your own account.';
    END IF;

    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
    IF v_target_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only Super Admins can delete another Super Admin.';
    END IF;

    -- Delete from auth.users (cascades to profiles)
    DELETE FROM auth.users WHERE id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;

    INSERT INTO public.audit_logs (
        user_id, action, entity_type, entity_id, new_values
    ) VALUES (
        v_caller_id,
        'delete_staff',
        'profiles',
        p_user_id,
        jsonb_build_object('deleted_user_id', p_user_id)
    );

    RETURN jsonb_build_object('success', true, 'deleted_user_id', p_user_id);
END;
$$;

-- 5. Function: Complete First-Time Password Change (Self-Service)
CREATE OR REPLACE FUNCTION public.complete_first_time_password_change(
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_encrypted_pw TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF length(p_new_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters long.';
    END IF;

    v_encrypted_pw := crypt(p_new_password, gen_salt('bf'));

    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_caller_id;

    UPDATE public.profiles
    SET must_change_password = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_caller_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_create_staff_member(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_staff_password(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_first_time_password_change(TEXT) TO authenticated;

COMMIT;

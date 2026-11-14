-- Migration 020: Create or Sync Initial Super Admin Staff Account
-- Purpose: Safely link or create admin@northernflavors.ng in auth.users & public.profiles
-- Email: admin@northernflavors.ng
-- Password: admin123

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT := crypt('admin123', gen_salt('bf'));
BEGIN
  -- 1. Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@northernflavors.ng';

  IF v_user_id IS NOT NULL THEN
    -- User already exists: update password to admin123 and confirm email
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    -- User does not exist: generate a new UUID and insert
    v_user_id := gen_random_uuid();

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
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@northernflavors.ng',
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Mallam Aminu Kano"}'::jsonb,
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id::text, 'admin@northernflavors.ng')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- 2. Upsert matching profile using the actual v_user_id from auth.users
  INSERT INTO public.profiles (id, full_name, phone, role, is_active)
  VALUES (
    v_user_id,
    'Mallam Aminu Kano (Super Admin)',
    '09068202567',
    'super_admin',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin',
      is_active = true,
      full_name = 'Mallam Aminu Kano (Super Admin)';
END $$;

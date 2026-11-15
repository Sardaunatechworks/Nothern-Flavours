-- Migration 026: Create or Sync Cashier Staff Account
-- Purpose: Safely link or create cashier@northernflavors.ng in auth.users & public.profiles
-- Email: cashier@northernflavors.ng
-- Password: cashier123

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT := crypt('cashier123', gen_salt('bf'));
BEGIN
  -- 1. Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'cashier@northernflavors.ng';

  IF v_user_id IS NOT NULL THEN
    -- User already exists: update password to cashier123 and confirm email
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
      'cashier@northernflavors.ng',
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Fatima Bello"}'::jsonb,
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
      format('{"sub":"%s","email":"%s"}', v_user_id::text, 'cashier@northernflavors.ng')::jsonb,
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
    'Fatima Bello (Head Cashier)',
    '09068202567',
    'cashier',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'cashier',
      is_active = true,
      full_name = 'Fatima Bello (Head Cashier)';
END $$;

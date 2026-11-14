-- Migration 020: Create Initial Super Admin Staff Account
-- Purpose: Insert default Super Admin into Supabase auth.users & public.profiles
-- Email: admin@northernflavors.ng
-- Password: admin123

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_encrypted_pw TEXT := crypt('admin123', gen_salt('bf'));
BEGIN
  -- Insert user into auth.users if not already registered
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@northernflavors.ng') THEN
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

    -- Insert identity record
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

  -- Ensure matching profile exists in public.profiles with super_admin role
  INSERT INTO public.profiles (id, full_name, phone, role, is_active)
  VALUES (
    v_user_id,
    'Mallam Aminu Kano (Super Admin)',
    '09068202567',
    'super_admin',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin', is_active = true, full_name = 'Mallam Aminu Kano (Super Admin)';
END $$;

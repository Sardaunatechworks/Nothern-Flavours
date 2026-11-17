-- ==============================================================================
-- Migration 031: Fix Supabase GoTrue 500 Internal Server Error on Login
-- Purpose: Resolves GoTrue scan crashes (HTTP 500 on /auth/v1/token?grant_type=password)
--          by ensuring all string/token columns in auth.users are non-null empty strings
--          and repairing auth.identities records.
-- ==============================================================================

BEGIN;

-- 1. Ensure all token/change string columns in auth.users are empty strings, not NULL.
-- (GoTrue crashes with a 500 error when scanning NULL into Go string variables).
UPDATE auth.users
SET 
    confirmation_token          = COALESCE(confirmation_token, ''),
    recovery_token              = COALESCE(recovery_token, ''),
    email_change                = COALESCE(email_change, ''),
    email_change_token_new      = COALESCE(email_change_token_new, ''),
    email_change_token_current  = COALESCE(email_change_token_current, ''),
    phone_change                = COALESCE(phone_change, ''),
    phone_change_token          = COALESCE(phone_change_token, ''),
    reauthentication_token      = COALESCE(reauthentication_token, ''),
    aud                         = COALESCE(NULLIF(aud, ''), 'authenticated'),
    role                        = COALESCE(NULLIF(role, ''), 'authenticated'),
    raw_app_meta_data           = COALESCE(NULLIF(raw_app_meta_data, '{}'::jsonb), '{"provider":"email","providers":["email"]}'::jsonb),
    raw_user_meta_data          = COALESCE(raw_user_meta_data, '{}'::jsonb);

-- 2. Repair auth.identities for email users
-- In GoTrue, email identity provider_id MUST match user_id::text
UPDATE auth.identities i
SET 
    provider_id   = i.user_id::text,
    identity_data = jsonb_build_object('sub', i.user_id::text, 'email', lower(u.email)),
    updated_at    = now()
FROM auth.users u
WHERE i.user_id = u.id AND i.provider = 'email';

-- 3. If any user in auth.users is missing a corresponding auth.identities entry, create it
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    u.id::text,
    jsonb_build_object('sub', u.id::text, 'email', lower(u.email)),
    'email',
    now(),
    now(),
    now()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

-- 4. Ensure profiles table is synced and has email and role
UPDATE public.profiles p
SET 
    email = lower(u.email),
    is_active = COALESCE(p.is_active, true)
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

COMMIT;

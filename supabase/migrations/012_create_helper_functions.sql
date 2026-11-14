-- Migration 012: Authorization Helper Functions
-- Purpose: Security Definer helper functions residing in private schema with search_path=''.

-- Helper: Get current user's role from profiles
CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = TRUE;

    RETURN v_role;
END;
$$;

-- Helper: Check if user has one of allowed roles
CREATE OR REPLACE FUNCTION private.has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = TRUE;

    RETURN v_role = ANY(allowed_roles);
END;
$$;

-- Helper: Check if current authenticated user is active
CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_active = TRUE
    );
END;
$$;

-- Security: Revoke default public execution & grant only to authenticated and service_role
REVOKE ALL ON FUNCTION private.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_active_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated, service_role;

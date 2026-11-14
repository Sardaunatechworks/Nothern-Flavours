-- Migration 001: Extensions and Schemas
-- Purpose: Enable required PostgreSQL extensions and create a private schema for secure helpers.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create private schema for privileged functions that should never be exposed via PostgREST
CREATE SCHEMA IF NOT EXISTS private;

-- Restrict usage on private schema
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;


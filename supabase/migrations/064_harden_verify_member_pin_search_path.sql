-- Migration 064: Harden verify_member_pin search_path
-- P0 #3 remediation: add fixed search_path to SECURITY DEFINER function
--
-- verify_member_pin is a legacy function with zero application callers.
-- This migration adds SET search_path = public, extensions to prevent
-- search-path hijack attacks on the SECURITY DEFINER function.

BEGIN;

ALTER FUNCTION public.verify_member_pin(UUID, TEXT)
  SET search_path = public, extensions;

COMMIT;

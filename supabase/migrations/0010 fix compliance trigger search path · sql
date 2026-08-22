-- Migration 0010: Set explicit search_path on the compliance_cases trigger
-- function to clear the Supabase security advisor warning
-- (function_search_path_mutable). Folded into 0009's CREATE OR REPLACE
-- going forward -- this migration exists only to match what was actually
-- run against the live database.

alter function enforce_compliance_case_status_transition() set search_path = public;

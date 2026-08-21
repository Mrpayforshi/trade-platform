-- ============================================================================
-- Migration 0004 — Security advisor fixes
-- Applied to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade)
-- ============================================================================

alter function is_admin() set search_path = public, pg_temp;
alter function enforce_transaction_state_transition() set search_path = public, pg_temp;
alter function log_transaction_state_change() set search_path = public, pg_temp;
alter function log_generic_change() set search_path = public, pg_temp;

revoke execute on function log_transaction_state_change() from anon, authenticated;
revoke execute on function log_generic_change() from anon, authenticated;

revoke execute on function is_admin() from anon;

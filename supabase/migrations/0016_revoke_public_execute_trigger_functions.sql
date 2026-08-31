-- These 4 functions all RETURN trigger or event_trigger. Postgres refuses
-- to invoke functions with those return types outside their trigger
-- context ("trigger functions can only be called as triggers"), so the
-- EXECUTE grant to anon/authenticated flagged by the security advisor was
-- never actually exploitable via /rest/v1/rpc/... — but it's still dead
-- privilege that shouldn't be there. Revoking it is safe: trigger firing
-- doesn't check the firing session's EXECUTE grant on the trigger
-- function, only the table-level trigger definition itself.
--
-- is_admin() is deliberately left untouched. It's used inside
-- using()/with_check() clauses across most admin-write RLS policies
-- (platform_fees, inspections, supplier_performance, hs_code_reviews,
-- compliance_rules, and more); revoking EXECUTE from authenticated would
-- very likely break RLS evaluation platform-wide, not just admin actions,
-- since Postgres needs EXECUTE on any function referenced inside a policy
-- expression to evaluate it at all — including the "OR is_admin()" half
-- of owner-or-admin read policies. If this warning needs to be silenced
-- too, it must be verified on a Supabase branch first, not applied blind
-- to production.

revoke execute on function public.handle_new_auth_user() from anon, authenticated;
revoke execute on function public.log_generic_change() from anon, authenticated;
revoke execute on function public.log_transaction_state_change() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

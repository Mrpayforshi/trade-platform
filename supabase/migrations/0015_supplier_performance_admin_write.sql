-- supplier_performance had a SELECT policy (supplier can read their own
-- row, or admin) but no write policy at all — same gap shape as
-- platform_fees before migration 0014. Nothing could write to this
-- table even with a correct API route.
--
-- Split into separate INSERT/UPDATE policies rather than one FOR ALL
-- policy: this table has no DELETE use case (a supplier's performance
-- record should never be deleted, only corrected), so no DELETE grant
-- is given here.
--
-- Manual entry only for now — see app/api/admin/supplier-performance/
-- for the caveat that on_time_rate, dispute_rate, and lead_time_accuracy
-- have no automated computation path yet.

create policy supplier_performance_admin_insert
  on public.supplier_performance
  for insert
  with check (is_admin());

create policy supplier_performance_admin_update
  on public.supplier_performance
  for update
  using (is_admin())
  with check (is_admin());

-- platform_fees had a SELECT policy (buyer/supplier of the linked
-- transaction, or admin) but no write policy at all, so no fee could
-- ever be recorded even with a correct API route. This closes that gap
-- with a single admin-only ALL policy covering INSERT/UPDATE/DELETE.
--
-- Fee creation stays an explicit ops action — never auto-triggered off
-- a transaction state change — because the plan's pricing logic
-- (Section 10: tiered by category/order value, % of completed trade
-- value) isn't a precise enough rule to safely automate yet.

create policy platform_fees_admin_write
  on public.platform_fees
  for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- Migration 0005 — Inspections table (gap analysis: supplier_performance.
-- inspection_pass_rate has no source-of-truth events table to aggregate from)
-- Applied to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade)
-- ============================================================================

create type inspection_type as enum (
  'pre_shipment','in_process','final','post_delivery'
);
create type inspection_status as enum (
  'scheduled','in_progress','passed','failed','waived'
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id),
  supplier_id uuid not null references suppliers(id),
  inspection_type inspection_type not null default 'pre_shipment',
  status inspection_status not null default 'scheduled',
  inspection_agency text,
  scheduled_date date,
  completed_at timestamptz,
  result_summary text,
  defects_found jsonb not null default '[]',
  evidence_document_id uuid references documents(id),
  platform_fee_id uuid references platform_fees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table inspections enable row level security;

-- Same ownership pattern as platform_fees: buyer or supplier on the
-- underlying transaction can read, ops/admin can read everything.
create policy inspections_read on inspections
  for select using (
    transaction_id in (
      select id from transactions
      where buyer_id in (select id from users where auth_user_id = auth.uid())
         or supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    )
    or is_admin()
  );

-- Writes are ops-only — inspection results are recorded by the platform,
-- not self-reported by either party.
create policy inspections_admin_write on inspections
  for insert with check (is_admin());
create policy inspections_admin_update on inspections
  for update using (is_admin()) with check (is_admin());

create trigger trg_audit_inspections
  after update on inspections
  for each row execute function log_generic_change();

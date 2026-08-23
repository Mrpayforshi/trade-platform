-- transaction_actual_costs: realized costs per transaction, entered by ops
-- after the fact (freight bills, duty paid, clearing invoices, etc).
-- Enables gross profit per transaction = platform_fees revenue minus the
-- sum of this table, as opposed to landed_cost_estimates which is
-- estimate-only by design (is_estimate check constraint).
create table transaction_actual_costs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id),
  cost_type text not null check (cost_type in
    ('product','freight','insurance','duty','clearing','delivery','payment_processing','fx','other')),
  amount numeric not null,
  currency text not null default 'USD',
  incurred_at date,
  notes text,
  created_at timestamptz not null default now()
);

alter table transaction_actual_costs enable row level security;

-- Ops/admin only -- this is internal financial data, not something buyers
-- or suppliers should see line-items of.
create policy "admin_full_access_actual_costs"
  on transaction_actual_costs
  for all
  using (is_admin())
  with check (is_admin());

-- trade_visits: represents the "See It Yourself" assisted-trade product
-- line (plan section 4.2). Enables Trip-to-purchase conversion KPI.
create table trade_visits (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id),
  category_id uuid references categories(id),
  status text not null default 'planned' check (status in ('planned','confirmed','completed','cancelled')),
  travel_start_date date,
  travel_end_date date,
  resulted_in_transaction_id uuid references transactions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trade_visits enable row level security;

-- Buyers can see their own trips.
create policy "buyer_reads_own_trade_visits"
  on trade_visits
  for select
  using (
    buyer_id in (select id from users where auth_user_id = auth.uid())
  );

-- Ops/admin full access (create/manage trips, mark completed, link outcome).
create policy "admin_full_access_trade_visits"
  on trade_visits
  for all
  using (is_admin())
  with check (is_admin());

-- Keep updated_at honest on trade_visits, matching the pattern used
-- elsewhere in the schema.
create or replace function set_trade_visits_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_trade_visits_updated_at
  before update on trade_visits
  for each row
  execute function set_trade_visits_updated_at();

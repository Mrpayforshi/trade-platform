-- ============================================================================
-- Migration 0003 — Phase 2 MVP additions: compliance engine, revenue,
-- notifications (Backend Build Doc Part 2, Part 4.3, Part 4.4, Part 4.7)
-- Applied to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade)
-- ============================================================================

create type fee_type as enum (
  'transaction_commission','buyer_service_fee','freight_margin',
  'clearing_coordination_fee','inspection_fee','trade_visit_fee'
);
create type fee_status as enum ('pending','invoiced','paid','waived');
create type invoice_recipient as enum ('buyer','supplier');
create type invoice_status as enum ('draft','sent','paid','overdue','cancelled');
create type notif_channel as enum ('push','email','whatsapp');
create type notif_status as enum ('pending','sent','delivered','failed');
create type sub_tier as enum ('standard','premium');
create type billing_cycle as enum ('annual','category_based');

create table compliance_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  rule_name text not null,
  required_documents text[] not null default '{}',
  sla_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table compliance_rules enable row level security;
create policy compliance_rules_admin_only on compliance_rules
  for all using (is_admin()) with check (is_admin());

create table hs_code_reviews (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid references rfqs(id),
  proposed_hs_code text,
  status text not null default 'pending' check (status in ('pending','reviewed','escalated')),
  reviewed_by uuid references admin_users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
alter table hs_code_reviews enable row level security;
create policy hs_code_reviews_admin_only on hs_code_reviews
  for all using (is_admin()) with check (is_admin());

create table supplier_performance (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) unique,
  on_time_rate numeric(5,4) not null default 0,
  conformity_rate numeric(5,4) not null default 0,
  inspection_pass_rate numeric(5,4) not null default 0,
  dispute_rate numeric(5,4) not null default 0,
  lead_time_accuracy numeric(5,4) not null default 0,
  updated_at timestamptz not null default now()
);
alter table supplier_performance enable row level security;
create policy supplier_performance_read on supplier_performance
  for select using (
    supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    or is_admin()
  );

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  recipient_type invoice_recipient not null,
  recipient_id uuid not null,
  line_items jsonb not null default '[]',
  total_amount numeric(12,2) not null,
  currency text not null default 'USD',
  status invoice_status not null default 'draft',
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table invoices enable row level security;
create policy invoices_owner_read on invoices
  for select using (
    (recipient_type = 'buyer' and recipient_id in (select id from users where auth_user_id = auth.uid()))
    or (recipient_type = 'supplier' and recipient_id in (select id from suppliers where auth_user_id = auth.uid()))
    or is_admin()
  );

create table platform_fees (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id),
  fee_type fee_type not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status fee_status not null default 'pending',
  invoice_id uuid references invoices(id),
  created_at timestamptz not null default now()
);
alter table platform_fees enable row level security;
create policy platform_fees_read on platform_fees
  for select using (
    transaction_id in (
      select id from transactions
      where buyer_id in (select id from users where auth_user_id = auth.uid())
         or supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    )
    or is_admin()
  );

create table supplier_subscriptions (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  tier sub_tier not null default 'standard',
  amount numeric(12,2) not null,
  billing_cycle billing_cycle not null default 'annual',
  next_billing_date date,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  invoice_id uuid references invoices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table supplier_subscriptions enable row level security;
create policy supplier_subscriptions_owner_read on supplier_subscriptions
  for select using (
    supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    or is_admin()
  );

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  channel notif_channel not null,
  event_type text not null,
  content text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  status notif_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy notifications_owner_read on notifications
  for select using (
    user_id in (select id from users where auth_user_id = auth.uid())
    or is_admin()
  );

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  event_type text not null,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_type)
);
alter table notification_preferences enable row level security;
create policy notification_prefs_owner_all on notification_preferences
  for all using (user_id in (select id from users where auth_user_id = auth.uid()))
  with check (user_id in (select id from users where auth_user_id = auth.uid()));

create or replace function log_generic_change()
returns trigger as $$
begin
  insert into audit_logs (table_name, record_id, action, changed_fields, performed_by)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    lower(TG_OP),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)),
    'system'
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_audit_platform_fees
  after update on platform_fees
  for each row execute function log_generic_change();

create trigger trg_audit_compliance_cases
  after update on compliance_cases
  for each row execute function log_generic_change();

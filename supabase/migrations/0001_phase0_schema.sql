-- ============================================================================
-- CROSS-BORDER TRADE PLATFORM — Phase 0 Schema
-- Source of truth: Trade_Platform_Backend_Build_Document_Updated.docx, Part 2
-- Apply via Supabase SQL Editor or `supabase db push` against the CORRECT
-- project (confirm project ref before running — this is not yet wired to
-- qaqbshgrlsmqrqzjfelc or any connected project).
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- ENUMS (state machine values are constrained here, not left as free text —
-- guarded transitions in Part 4.1 are enforced twice: once by this enum
-- rejecting garbage values, once by the trigger in migration 0002 rejecting
-- illegal-but-valid-enum transitions)
-- ----------------------------------------------------------------------------

create type transaction_state as enum (
  'quote_accepted','kyc_pending','funded','compliance_pending',
  'compliance_cleared','released','dispatched','in_transit',
  'customs_clearance','delivered','closed','disputed','refunded'
);

create type funds_status as enum ('unfunded','held','released','refunded');

create type admission_status as enum ('pending','active','suspended','rejected');

create type subscription_status as enum ('none','active','expired','suspended');

create type admission_task_type as enum (
  'identity_verification','ownership_check','factory_verification',
  'product_cert_review','export_capability','bank_verification',
  'reference_check','sample_order','sla_agreement'
);

create type admission_task_status as enum ('pending','in_progress','completed','failed','waived');

create type rfq_status as enum ('open','quoted','assigned','expired','cancelled');

create type compliance_case_status as enum ('open','pending_documents','under_review','approved','rejected');

create type admin_role as enum ('ops','ops_manager','super_admin');

-- ----------------------------------------------------------------------------
-- admin_users — Phase 1, but created early: ops needs an account to run the
-- console before anything else works
-- ----------------------------------------------------------------------------
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null unique,
  email text not null unique,
  role admin_role not null default 'ops',
  mfa_enabled boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- users — buyer accounts
-- ----------------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null unique,
  email text,
  phone text,
  business_name text,
  kyc_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- categories — ops-controlled. High-risk defaults to disabled per the
-- non-negotiable rule in Part 1.4.
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_enabled boolean not null default false,
  is_high_risk boolean not null default false,
  commission_rate numeric(5,4) not null default 0, -- e.g. 0.0500 = 5%
  requires_compliance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint high_risk_needs_explicit_enable
    check (not (is_high_risk and is_enabled) or is_enabled = true)
);

-- ----------------------------------------------------------------------------
-- suppliers
-- ----------------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) unique, -- null until invited/activated
  name text not null,
  admission_status admission_status not null default 'pending',
  category_ids uuid[] not null default '{}',
  performance_score numeric(5,2) check (performance_score between 0 and 100),
  subscription_status subscription_status not null default 'none',
  subscription_expires_at date,
  contact_email text,
  contact_phone text,
  country_of_origin text default 'China',
  factory_address text,
  bank_account_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- supplier_admission_tasks — the stage-gate checklist per supplier
-- ----------------------------------------------------------------------------
create table supplier_admission_tasks (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  task_type admission_task_type not null,
  status admission_task_status not null default 'pending',
  assigned_to uuid references admin_users(id),
  due_date date,
  completed_at timestamptz,
  evidence_document_id uuid, -- FK added once `documents` exists below
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- rfqs
-- ----------------------------------------------------------------------------
create table rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id),
  category_id uuid not null references categories(id),
  quantity numeric(12,2),
  specification text,
  status rfq_status not null default 'open',
  assigned_supplier_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- compliance_cases — one per transaction that needs a permit/licence
-- (created before transactions since transactions FK to it)
-- ----------------------------------------------------------------------------
create table compliance_cases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  status compliance_case_status not null default 'open',
  buyer_submitted_reference text, -- buyer's own application ref, tracked manually
  official_reference text,        -- filled in once ops confirms the real permit
  sla_deadline timestamptz,
  escalation_triggered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- documents — never hard-deleted, SHA-256 hashed on upload
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('buyer','supplier','ops','dispute')),
  owner_id uuid not null,
  doc_type text not null,
  file_url text not null,
  file_hash text not null, -- SHA-256, computed on upload, verified on retrieval
  version integer not null default 1,
  deleted_at timestamptz,  -- soft-delete only, per Part 1.4
  deleted_by uuid,
  created_at timestamptz not null default now()
);

-- back-fill the FK now that documents exists
alter table supplier_admission_tasks
  add constraint fk_admission_task_evidence
  foreign key (evidence_document_id) references documents(id);

-- ----------------------------------------------------------------------------
-- transactions — the core state-machine record
-- ----------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id),
  supplier_id uuid not null references suppliers(id),
  rfq_id uuid references rfqs(id),
  category_id uuid not null references categories(id),
  state transaction_state not null default 'quote_accepted',
  previous_state transaction_state,
  landed_cost_estimate_id uuid, -- FK added after landed_cost_estimates exists
  compliance_required boolean not null default false,
  compliance_case_id uuid references compliance_cases(id),
  funds_status funds_status not null default 'unfunded',
  total_value_usd numeric(12,2) not null,
  platform_fee_amount numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  state_changed_at timestamptz not null default now(),
  state_changed_by text, -- user id or 'system'
  state_change_reason text
);

-- ----------------------------------------------------------------------------
-- landed_cost_estimates — versioned, never overwritten, always flagged
-- ----------------------------------------------------------------------------
create table landed_cost_estimates (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id),
  product_cost numeric(12,2) not null default 0,
  freight_cost numeric(12,2) not null default 0,
  insurance_cost numeric(12,2) not null default 0,
  duty_estimate numeric(12,2) not null default 0,
  clearing_cost numeric(12,2) not null default 0,
  delivery_cost numeric(12,2) not null default 0,
  platform_fee numeric(12,2) not null default 0,
  is_estimate boolean not null default true check (is_estimate = true), -- Part 1.4: never final
  version integer not null default 1,
  created_at timestamptz not null default now()
);

alter table transactions
  add constraint fk_transaction_landed_cost
  foreign key (landed_cost_estimate_id) references landed_cost_estimates(id);

-- ============================================================================
-- ROW LEVEL SECURITY — every table, no exceptions (Part 5: "enabling RLS
-- without a policy is the most common data leak vector" — so every table
-- below gets RLS turned on AND a real policy, never one without the other)
-- ============================================================================

alter table admin_users enable row level security;
alter table users enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table supplier_admission_tasks enable row level security;
alter table rfqs enable row level security;
alter table compliance_cases enable row level security;
alter table documents enable row level security;
alter table transactions enable row level security;
alter table landed_cost_estimates enable row level security;

-- Helper: is the current auth.uid() an ops/admin user?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admin_users where auth_user_id = auth.uid()
  );
$$ language sql stable security definer;

-- admin_users: only admins can read; nobody writes via client (seeded manually)
create policy admin_users_select_self_or_admin on admin_users
  for select using (auth_user_id = auth.uid() or is_admin());

-- users: buyers see/edit their own row; admins see all
create policy users_select_own_or_admin on users
  for select using (auth_user_id = auth.uid() or is_admin());
create policy users_update_own on users
  for update using (auth_user_id = auth.uid());
create policy users_insert_own on users
  for insert with check (auth_user_id = auth.uid());

-- categories: enabled categories are publicly readable; only admins write
create policy categories_public_read_enabled on categories
  for select using (is_enabled = true or is_admin());
create policy categories_admin_write on categories
  for all using (is_admin()) with check (is_admin());

-- suppliers: public can read active suppliers with a live subscription;
-- a supplier can read/update only their own row; admins see all
create policy suppliers_public_read_active on suppliers
  for select using (
    admission_status = 'active' and subscription_status = 'active'
    or auth_user_id = auth.uid()
    or is_admin()
  );
create policy suppliers_self_update on suppliers
  for update using (auth_user_id = auth.uid());
create policy suppliers_admin_write on suppliers
  for insert with check (is_admin());
create policy suppliers_admin_status_write on suppliers
  for update using (is_admin());

-- supplier_admission_tasks: ops only (suppliers never see their own admission
-- pipeline internals per the doc's admin-perspective scoping)
create policy admission_tasks_admin_only on supplier_admission_tasks
  for all using (is_admin()) with check (is_admin());

-- rfqs: buyer sees/creates their own; assigned supplier sees theirs; admin sees all
create policy rfqs_buyer_own on rfqs
  for select using (
    buyer_id in (select id from users where auth_user_id = auth.uid())
    or is_admin()
  );
create policy rfqs_buyer_insert on rfqs
  for insert with check (
    buyer_id in (select id from users where auth_user_id = auth.uid())
  );
create policy rfqs_admin_update on rfqs
  for update using (is_admin());

-- compliance_cases: ops only in Mode B (no gov role exists yet — Part 1.4)
create policy compliance_cases_admin_only on compliance_cases
  for all using (is_admin()) with check (is_admin());

-- documents: owner can read/insert their own; admin sees all; nobody deletes
-- (no delete policy at all — enforces soft-delete-only at the RLS layer too)
create policy documents_owner_read on documents
  for select using (
    (owner_type = 'buyer' and owner_id in (select id from users where auth_user_id = auth.uid()))
    or (owner_type = 'supplier' and owner_id in (select id from suppliers where auth_user_id = auth.uid()))
    or is_admin()
  );
create policy documents_owner_insert on documents
  for insert with check (
    (owner_type = 'buyer' and owner_id in (select id from users where auth_user_id = auth.uid()))
    or (owner_type = 'supplier' and owner_id in (select id from suppliers where auth_user_id = auth.uid()))
    or is_admin()
  );

-- transactions: buyer and supplier see only their own; admin sees all;
-- no client-side update policy at all — state changes go through the
-- service layer (service role key), never direct client writes, per
-- Part 5: "No state-transition logic lives client-side"
create policy transactions_buyer_read on transactions
  for select using (
    buyer_id in (select id from users where auth_user_id = auth.uid())
    or supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    or is_admin()
  );

-- landed_cost_estimates: readable by the transaction's buyer/supplier/admin;
-- writes are system-only (service role), no client insert policy
create policy landed_cost_read on landed_cost_estimates
  for select using (
    transaction_id in (
      select id from transactions
      where buyer_id in (select id from users where auth_user_id = auth.uid())
         or supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    )
    or is_admin()
  );

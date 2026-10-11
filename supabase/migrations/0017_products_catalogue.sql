-- ============================================================================
-- Migration 0017 — Catalogue: products
-- The buyer dashboard Catalogue needs priced, comparable products. Until now
-- the schema only had suppliers and categories, so there was nothing to
-- browse. Products belong to one supplier and one category.
--
-- Visibility mirrors the existing public supplier rule: a product is
-- readable by buyers only when it is published AND its category is enabled
-- AND its supplier is active with a live subscription. A supplier can read
-- its own products; ops (is_admin) can read and write everything.
-- There is deliberately no delete policy: unpublish with is_published = false
-- (same soft-delete-only stance as documents).
--
-- unit_price_usd is the SUPPLIER price. It is not a landed cost; landed cost
-- estimates stay in landed_cost_estimates and are never derived from here.
-- Apply to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade) after 0016.
-- ============================================================================

create table products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  category_id uuid not null references categories(id),
  name text not null check (length(btrim(name)) > 0),
  specification text,
  unit text not null default 'unit',
  unit_price_usd numeric(12,2) not null check (unit_price_usd >= 0),
  moq integer not null default 1 check (moq >= 1),
  lead_time_days integer check (lead_time_days >= 0),
  warranty_months integer check (warranty_months >= 0),
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_published_idx
  on products (category_id) where is_published;
create index products_supplier_idx on products (supplier_id);

alter table products enable row level security;

create policy products_read on products
  for select using (
    is_admin()
    or supplier_id in (select id from suppliers where auth_user_id = auth.uid())
    or (
      is_published
      and exists (
        select 1 from categories c
        where c.id = products.category_id and c.is_enabled
      )
      and exists (
        select 1 from suppliers s
        where s.id = products.supplier_id
          and s.admission_status = 'active'
          and s.subscription_status = 'active'
      )
    )
  );

create policy products_admin_insert on products
  for insert with check (is_admin());

create policy products_admin_update on products
  for update using (is_admin()) with check (is_admin());

-- Keep updated_at honest, same pattern as trade_visits (0012).
create or replace function set_products_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_products_updated_at();

-- Standard audit trigger every other table has (see 0013).
create trigger trg_audit_products
  after insert or update or delete on products
  for each row execute function log_generic_change();

-- Same hygiene as 0016: trigger functions need no direct EXECUTE grant.
revoke execute on function public.set_products_updated_at() from public, anon, authenticated;

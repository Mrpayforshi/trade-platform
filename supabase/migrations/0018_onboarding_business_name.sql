-- ============================================================================
-- Migration 0018 — Capture business_name at signup
-- The new signup form collects a business name and sends it as
-- raw_user_meta_data.business_name. This updates handle_new_auth_user() from
-- 0006 so the buyer's users row is created with it.
--
-- ONLY the buyer branch changes. The supplier-invite branch is copied
-- unchanged on purpose (see the security note delivered with this change:
-- that branch trusts user-controlled signup metadata and needs a separate,
-- branch-tested fix).
--
-- CREATE OR REPLACE keeps the grants set by 0016, so EXECUTE stays revoked
-- from anon/authenticated.
-- Apply to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade) after 0017.
-- ============================================================================

create or replace function handle_new_auth_user()
returns trigger as $$
declare
  meta_role text := new.raw_user_meta_data ->> 'role';
  meta_supplier_id text := new.raw_user_meta_data ->> 'supplier_id';
begin
  if meta_role = 'supplier' and meta_supplier_id is not null then
    update public.suppliers
    set auth_user_id = new.id, updated_at = now()
    where id = meta_supplier_id::uuid
      and auth_user_id is null; -- never overwrite an already-linked supplier
  else
    insert into public.users (auth_user_id, email, business_name)
    values (
      new.id,
      new.email,
      nullif(left(btrim(new.raw_user_meta_data ->> 'business_name'), 120), '')
    )
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

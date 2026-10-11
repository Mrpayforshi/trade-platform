-- ============================================================================
-- Migration 0017 — Buyer signup metadata + supplier-link invite guard
--
-- Replaces handle_new_auth_user() from 0006. Two changes:
--
-- 1. SECURITY: 0006 decided "supplier path" purely from raw_user_meta_data,
--    which the person signing up controls (supabase.auth.signUp options.data).
--    With public buyer signup open, anyone could send
--    { role: 'supplier', supplier_id: '<uuid>' } and link their login to an
--    existing supplier row that has no auth_user_id yet. The supplier path is
--    now only taken when the auth user was created through an invite
--    (auth.users.invited_at is set by admin.inviteUserByEmail).
--    VERIFY ON STAGING: invite a test supplier and confirm
--    suppliers.auth_user_id gets linked. If it does not, do not ship signup.
--
-- 2. Buyer signup now copies business_name and contact_phone from signup
--    metadata onto public.users (length-capped, blank -> null).
--
-- Function keeps SECURITY DEFINER + fixed search_path as in 0006.
-- ============================================================================

create or replace function handle_new_auth_user()
returns trigger as $$
declare
  meta_role text := new.raw_user_meta_data ->> 'role';
  meta_supplier_id text := new.raw_user_meta_data ->> 'supplier_id';
begin
  if new.invited_at is not null
     and meta_role = 'supplier'
     and meta_supplier_id is not null then
    update public.suppliers
    set auth_user_id = new.id, updated_at = now()
    where id = meta_supplier_id::uuid
      and auth_user_id is null; -- never overwrite an already-linked supplier
  else
    insert into public.users (auth_user_id, email, business_name, phone)
    values (
      new.id,
      new.email,
      nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'business_name', '')), 200), ''),
      nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'contact_phone', '')), 30), '')
    )
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

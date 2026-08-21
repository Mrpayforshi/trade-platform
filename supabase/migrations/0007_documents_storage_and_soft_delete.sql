-- ============================================================================
-- Migration 0007 — Documents storage bucket + soft-delete policy
-- Closes the gap: admission tasks and compliance cases both reference
-- evidence_document_id, but nothing writes to `documents` yet, and the
-- table has no UPDATE policy at all (so soft-delete — the ONLY delete
-- path per Part 1.4 — was actually impossible even for admins).
-- Applied to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade)
-- ============================================================================

-- Private bucket — never public. Access goes through signed URLs generated
-- server-side after the caller passes the documents table RLS check.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage path convention: {owner_type}/{owner_id}/{uuid}-{filename}
-- Mirrors the documents_owner_read / documents_owner_insert policies on
-- the public.documents table exactly, so a caller who can read/write a
-- documents row can read/write the matching storage object.
create policy documents_storage_owner_read on storage.objects
  for select using (
    bucket_id = 'documents' and (
      ((storage.foldername(name))[1] = 'buyer'
        and (storage.foldername(name))[2] in (select id::text from public.users where auth_user_id = auth.uid()))
      or ((storage.foldername(name))[1] = 'supplier'
        and (storage.foldername(name))[2] in (select id::text from public.suppliers where auth_user_id = auth.uid()))
      or is_admin()
    )
  );

create policy documents_storage_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'documents' and (
      ((storage.foldername(name))[1] = 'buyer'
        and (storage.foldername(name))[2] in (select id::text from public.users where auth_user_id = auth.uid()))
      or ((storage.foldername(name))[1] = 'supplier'
        and (storage.foldername(name))[2] in (select id::text from public.suppliers where auth_user_id = auth.uid()))
      or is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- Soft-delete policy on public.documents
-- Row-level policy alone would let an owner update ANY column (file_hash,
-- file_url, etc), not just deleted_at — RLS is row-level, not column-level.
-- So: allow the UPDATE at the row level via policy, then use column
-- privileges to actually restrict WHICH columns can be touched. This is
-- the Postgres-native way to get column-level restriction under RLS.
-- ----------------------------------------------------------------------------

create policy documents_owner_soft_delete on documents
  for update using (
    (owner_type = 'buyer' and owner_id in (select id from users where auth_user_id = auth.uid()))
    or (owner_type = 'supplier' and owner_id in (select id from suppliers where auth_user_id = auth.uid()))
    or is_admin()
  )
  with check (
    (owner_type = 'buyer' and owner_id in (select id from users where auth_user_id = auth.uid()))
    or (owner_type = 'supplier' and owner_id in (select id from suppliers where auth_user_id = auth.uid()))
    or is_admin()
  );

revoke update on documents from authenticated;
grant update (deleted_at, deleted_by) on documents to authenticated;

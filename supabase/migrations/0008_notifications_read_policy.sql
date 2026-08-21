-- ============================================================================
-- Migration 0008 — Notifications read policy
-- Closes the gap: notifications table has a SELECT policy but no INSERT
-- or UPDATE policy at all. Writes are service-role only (system-generated,
-- by design — same pattern as transactions/platform_fees), but marking a
-- notification as read is a legitimate owner action and currently has no
-- path at all, even for the notification's own recipient.
-- Applied to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade)
-- ============================================================================

create policy notifications_owner_mark_read on notifications
  for update using (
    user_id in (select id from users where auth_user_id = auth.uid())
  )
  with check (
    user_id in (select id from users where auth_user_id = auth.uid())
  );

-- Column-restricted, same technique as the documents soft-delete policy:
-- row-level policy alone would let the owner rewrite content/event_type
-- too. Only read_at should ever be owner-writable.
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

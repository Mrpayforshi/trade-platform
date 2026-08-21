-- ============================================================================
-- Migration 0002 — Guarded transaction state-machine transitions (Part 4.1)
-- + audit_logs table (Part 1.4 / 4.8)
-- Applied to: qaqbshgrlsmqrqzjfelc (Cross Boarder Trade)
-- ============================================================================

create or replace function enforce_transaction_state_transition()
returns trigger as $$
declare
  legal boolean := false;
begin
  if old.state = new.state then
    return new;
  end if;

  if old.state = 'closed' then
    raise exception 'Illegal transition: % is a terminal state', old.state
      using errcode = '22023';
  end if;

  legal := case
    when old.state = 'quote_accepted' and new.state = 'kyc_pending' then true
    when old.state = 'kyc_pending' and new.state = 'funded' then true
    when old.state = 'kyc_pending' and new.state = 'disputed' then true
    when old.state = 'funded' and new.state = 'compliance_pending'
         and new.compliance_required = true then true
    when old.state = 'funded' and new.state = 'released'
         and new.compliance_required = false then true
    when old.state = 'compliance_pending' and new.state = 'compliance_cleared' then true
    when old.state = 'compliance_pending' and new.state = 'disputed' then true
    when old.state = 'compliance_cleared' and new.state = 'released'
         and new.funds_status = 'held' then true
    when old.state = 'released' and new.state = 'dispatched' then true
    when old.state = 'dispatched' and new.state = 'in_transit' then true
    when old.state = 'in_transit' and new.state = 'customs_clearance' then true
    when old.state = 'customs_clearance' and new.state = 'delivered' then true
    when old.state = 'delivered' and new.state = 'closed' then true
    when old.state = 'delivered' and new.state = 'disputed' then true
    when new.state = 'disputed' then true
    when old.state = 'disputed' and new.state = 'closed' then true
    when old.state = 'disputed' and new.state = 'refunded' then true
    else false
  end;

  if not legal then
    raise exception 'Illegal transition: % -> % (transaction %)', old.state, new.state, old.id
      using errcode = '22023';
  end if;

  new.previous_state := old.state;
  new.state_changed_at := now();
  if new.state_change_reason is null and old.state != 'quote_accepted' then
    raise exception 'state_change_reason is required for manual transitions';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_guard_transaction_state
  before update of state on transactions
  for each row
  execute function enforce_transaction_state_transition();

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('create','update','delete','state_transition')),
  changed_fields jsonb,
  performed_by text not null,
  performed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  reason text
);

alter table audit_logs enable row level security;

create policy audit_logs_admin_read on audit_logs
  for select using (is_admin());

create or replace function log_transaction_state_change()
returns trigger as $$
begin
  insert into audit_logs (table_name, record_id, action, changed_fields, performed_by, reason)
  values (
    'transactions',
    new.id,
    'state_transition',
    jsonb_build_object('old_state', old.state, 'new_state', new.state),
    coalesce(new.state_changed_by, 'system'),
    new.state_change_reason
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_audit_transaction_state
  after update of state on transactions
  for each row
  execute function log_transaction_state_change();

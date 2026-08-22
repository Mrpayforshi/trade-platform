-- Adds the fields the plan's KPIs actually need to compute:
--   - On-time delivery rate: needs a promised date to compare actual
--     delivery against (state_changed_at when state -> 'delivered' is
--     already captured via audit_logs).
--   - Clearance exception rate: needs a flag distinguishing a normal
--     customs_clearance pass-through from one that got held up.

alter table transactions
  add column promised_delivery_date date,
  add column customs_exception_at timestamptz,
  add column customs_exception_reason text,
  add column customs_exception_resolved_at timestamptz;

comment on column transactions.promised_delivery_date is
  'Set when the transaction is funded/quoted. Compared against the '
  'delivered state_changed_at (or the corresponding audit_logs entry) '
  'to compute on-time delivery rate.';

comment on column transactions.customs_exception_at is
  'Set when a transaction in customs_clearance hits a hold/delay/query '
  'from ZIMRA or the clearing agent, as opposed to clearing normally. '
  'Null customs_exception_at + reaching delivered = clean clearance.';

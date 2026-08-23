-- Both new tables (0012) were missing the standard audit trigger every
-- other table in the schema has. transaction_actual_costs especially
-- should never go unaudited -- it's the financial record behind gross
-- profit reporting.

create trigger trg_audit_transaction_actual_costs
  after insert or update or delete on transaction_actual_costs
  for each row
  execute function log_generic_change();

create trigger trg_audit_trade_visits
  after insert or update or delete on trade_visits
  for each row
  execute function log_generic_change();

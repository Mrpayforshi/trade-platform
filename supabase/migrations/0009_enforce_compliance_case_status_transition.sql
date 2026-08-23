-- Migration 0009: Guard compliance_cases.status against illegal transitions
-- Mirrors the pattern used for transactions.state (enforce_transaction_state_transition)
--
-- Legal transition map (based on plan section 7.2, the 5-stage government
-- workflow: case created -> requirements identified -> submission ->
-- validation -> decision):
--
--   open              -> pending_documents   (docs requested)
--   open              -> under_review        (no docs needed / submitted directly)
--   pending_documents -> under_review        (docs received)
--   pending_documents -> rejected            (case abandoned / docs never provided)
--   under_review      -> pending_documents   (authority requests more information)
--   under_review      -> approved            (decision: approved)
--   under_review      -> rejected            (decision: rejected)
--
-- approved / rejected are terminal states.

create or replace function enforce_compliance_case_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  legal boolean := false;
begin
  -- No-op update (status unchanged) is always fine
  if old.status = new.status then
    return new;
  end if;

  -- Terminal states never transition out
  if old.status in ('approved', 'rejected') then
    raise exception 'Illegal transition: % is a terminal status', old.status
      using errcode = '22023';
  end if;

  legal := case
    when old.status = 'open' and new.status = 'pending_documents' then true
    when old.status = 'open' and new.status = 'under_review' then true
    when old.status = 'pending_documents' and new.status = 'under_review' then true
    when old.status = 'pending_documents' and new.status = 'rejected' then true
    when old.status = 'under_review' and new.status = 'pending_documents' then true
    when old.status = 'under_review' and new.status = 'approved' then true
    when old.status = 'under_review' and new.status = 'rejected' then true
    else false
  end;

  if not legal then
    raise exception 'Illegal transition: % -> % (compliance_case %)', old.status, new.status, old.id
      using errcode = '22023';
  end if;

  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists trg_enforce_compliance_case_status_transition on compliance_cases;

create trigger trg_enforce_compliance_case_status_transition
  before update on compliance_cases
  for each row
  execute function enforce_compliance_case_status_transition();

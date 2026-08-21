import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications/dispatch";

// PATCH /api/admin/transactions/[id]/state
// Ops-only. Manually advances the transaction state machine.
// This is the single most safety-critical route in the whole backend
// (Part 1.4) — but note the actual guarding does NOT live here. It lives
// in the `trg_guard_transaction_state` database trigger. This route's job
// is: (1) confirm the caller is really ops, (2) require a reason, (3) hand
// off to the DB and translate its rejection into a clean 400. The trigger
// is the source of truth even if this route has a bug.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authClient = await createServerSupabase();

  const {
    data: { user: authUser },
  } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: "Authentication required", code: "unauthenticated" },
      { status: 401 }
    );
  }

  const { data: adminUser } = await authClient
    .from("admin_users")
    .select("id, mfa_enabled")
    .eq("auth_user_id", authUser.id)
    .single();

  if (!adminUser) {
    return NextResponse.json(
      { error: "Ops access required", code: "forbidden" },
      { status: 403 }
    );
  }

  // Part 5: MFA required for all ops/admin accounts before Phase 2 goes live.
  // Enforced here as a soft check for now — tighten to a hard block once
  // MFA enrollment is actually rolled out to the ops team.
  if (!adminUser.mfa_enabled) {
    console.warn(`Ops user ${adminUser.id} advancing transaction state without MFA enrolled`);
  }

  const body = await request.json();
  const { state: newState, compliance_required, funds_status, reason } = body;

  if (!newState || !reason) {
    return NextResponse.json(
      {
        error: "state and reason are both required for manual transitions",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  // Service-role client: bypasses RLS (there is currently no client write
  // policy on `transactions` at all — see Phase 0 migration notes), but
  // the DB trigger still enforces the legal-transition matrix regardless
  // of which client performs the write.
  const service = createServiceRoleClient();

  const updatePayload: Record<string, unknown> = {
    state: newState,
    state_changed_by: adminUser.id,
    state_change_reason: reason,
  };
  if (typeof compliance_required === "boolean") {
    updatePayload.compliance_required = compliance_required;
  }
  if (funds_status) {
    updatePayload.funds_status = funds_status;
  }

  const { data, error } = await service
    .from("transactions")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // The trigger's RAISE EXCEPTION for an illegal transition surfaces here.
    // Postgres error code 22023 = invalid_parameter_value, which is what
    // the trigger raises on purpose for illegal transitions.
    const isIllegalTransition = error.code === "22023";
    return NextResponse.json(
      {
        error: isIllegalTransition
          ? error.message
          : "Could not update transaction state",
        code: isIllegalTransition ? "illegal_transition" : "state_update_failed",
      },
      { status: isIllegalTransition ? 400 : 500 }
    );
  }

  // Notify the buyer. Deliberately not throwing/blocking on failure — a
  // notification issue should never roll back or fail a state change that
  // already succeeded and was already audit-logged by the DB trigger.
  // NOTE: the supplier side of this transaction is NOT notified here —
  // notifications.user_id has no FK path to suppliers under the current
  // schema (see lib/notifications/dispatch.ts). This is a known gap, not
  // an oversight — flagging again here since it's easy to miss at the
  // call site.
  await notifyUser(service, {
    userId: data.buyer_id,
    eventType: "transaction_state_changed",
    content: `Your transaction has moved to: ${newState}`,
  });

  return NextResponse.json({ data });
}

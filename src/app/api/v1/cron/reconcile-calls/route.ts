import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/database/supabase-admin";
import { reconcileActiveCalls } from "@/lib/calls/reconcile";

/**
 * Cron-driven post-call reconciler. A VPS crontab hits this every minute to
 * pull finished calls' data (status, duration, transcript, recording,
 * summary) from Ultravox into our tables. Authenticated by a shared secret
 * header rather than a user session, since no human is on the other end.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const provided = request.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await reconcileActiveCalls(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reconcile failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

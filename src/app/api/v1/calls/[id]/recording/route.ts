import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";

const UV_BASE = process.env.ULTRAVOX_BASE_URL ?? "https://api.ultravox.ai/api";

/**
 * Streams a call recording. The recording lives in Ultravox behind an
 * API-key-gated endpoint that 302-redirects to a short-lived (5 min) signed
 * GCS URL. We resolve that fresh on every request so the URL stored on the
 * call row (this route's own path) never expires and the API key stays
 * server-side. An <audio src> pointed here follows the redirect and plays.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found for this account" }, { status: 403 });
    }

    const { id } = await params;
    const { data: call, error } = await supabase
      .from("calls")
      .select("id, ultravox_call_id, recording_url")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Preferred path: resolve a fresh signed URL from Ultravox.
    if (call.ultravox_call_id) {
      const apiKey = process.env.ULTRAVOX_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "Voice provider not configured" }, { status: 500 });
      }
      const uvRes = await fetch(`${UV_BASE}/calls/${call.ultravox_call_id}/recording`, {
        headers: { "X-API-Key": apiKey },
        redirect: "manual",
      });
      const location = uvRes.headers.get("location");
      if ((uvRes.status === 302 || uvRes.status === 307) && location) {
        return NextResponse.redirect(location, 302);
      }
      if (uvRes.ok) {
        // Some deployments return the audio bytes directly rather than a redirect.
        return new NextResponse(uvRes.body, {
          status: 200,
          headers: { "Content-Type": uvRes.headers.get("content-type") ?? "audio/wav" },
        });
      }
      return NextResponse.json({ error: "Recording not available yet" }, { status: 404 });
    }

    // Fallback: an external recording URL saved by another provider.
    if (call.recording_url?.startsWith("http://") || call.recording_url?.startsWith("https://")) {
      return NextResponse.redirect(call.recording_url, 302);
    }

    return NextResponse.json({ error: "No recording available" }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

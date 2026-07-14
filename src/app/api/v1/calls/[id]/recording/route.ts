import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { uuidSchema } from "@/lib/validation/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenant_id = request.nextUrl.searchParams.get("tenant_id");

    if (!tenant_id) {
      return NextResponse.json(
        { error: "Invalid input", details: { fieldErrors: { tenant_id: ["Required"] } } },
        { status: 400 }
      );
    }

    const tenantParsed = uuidSchema.safeParse(tenant_id);
    if (!tenantParsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: { fieldErrors: { tenant_id: ["Invalid UUID"] } } },
        { status: 400 }
      );
    }

    // Verify tenant membership
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Look up the call and its recording_url
    const { data: call, error } = await supabase
      .from("calls")
      .select("id, recording_url")
      .eq("id", id)
      .eq("tenant_id", tenant_id)
      .single();

    if (error || !call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (!call.recording_url) {
      return NextResponse.json({ error: "No recording available" }, { status: 404 });
    }

    const expiresIn = 3600;

    // If the recording_url is already a full URL (e.g. from an external provider), return it directly
    if (call.recording_url.startsWith("http://") || call.recording_url.startsWith("https://")) {
      return NextResponse.json({ url: call.recording_url, expiresIn });
    }

    // Otherwise, treat it as a Supabase storage path and create a signed URL
    const { data: signedUrlData, error: storageError } = await supabase.storage
      .from("recordings")
      .createSignedUrl(call.recording_url, expiresIn);

    if (storageError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrlData.signedUrl, expiresIn });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

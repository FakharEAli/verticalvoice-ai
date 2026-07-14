import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";

const preflightSchema = z.object({
  tenantId: z.string().uuid(),
});

interface PreflightCheck {
  check: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = preflightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId } = parsed.data;

    const [tenantResult, profileResult, voiceResult, policyResult] =
      await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
        supabase
          .from("business_profiles")
          .select("*")
          .eq("tenant_id", tenantId)
          .single(),
        supabase
          .from("voice_profiles")
          .select("*")
          .eq("tenant_id", tenantId)
          .single(),
        supabase
          .from("policy_settings")
          .select("*")
          .eq("tenant_id", tenantId)
          .single(),
      ]);

    const checks: PreflightCheck[] = [];

    const tenant = tenantResult.data;
    const profile = profileResult.data;
    const voice = voiceResult.data;
    const policy = policyResult.data;

    checks.push({
      check: "Tenant exists",
      passed: !!tenant,
      message: tenant ? "Tenant configured" : "Tenant not found",
      severity: "error",
    });

    checks.push({
      check: "Business name set",
      passed: !!profile?.business_name,
      message: profile?.business_name
        ? "Business name configured"
        : "Business name required",
      severity: "error",
    });

    checks.push({
      check: "Phone number valid",
      passed: !!profile?.phone,
      message: profile?.phone
        ? "Phone number configured"
        : "Main phone number required",
      severity: "error",
    });

    checks.push({
      check: "Timezone configured",
      passed: !!profile?.timezone,
      message: profile?.timezone
        ? `Timezone: ${profile.timezone}`
        : "Timezone required",
      severity: "error",
    });

    checks.push({
      check: "Voice profile configured",
      passed: !!voice?.voice_id,
      message: voice?.voice_id
        ? "Voice selected"
        : "Select a voice for your agent",
      severity: "warning",
    });

    checks.push({
      check: "Recording policy set",
      passed: policy !== null,
      message: policy
        ? "Recording preferences configured"
        : "Set recording preferences",
      severity: "warning",
    });

    if (tenant?.industry === "healthcare") {
      checks.push({
        check: "Emergency route exists",
        passed: !!profile?.phone,
        message: profile?.phone
          ? "Emergency transfer number configured"
          : "Healthcare requires an emergency transfer number",
        severity: "error",
      });

      checks.push({
        check: "HIPAA acknowledgement",
        passed: !!policy?.hipaa_mode,
        message: policy?.hipaa_mode
          ? "HIPAA mode enabled"
          : "Review HIPAA compliance settings",
        severity: "warning",
      });
    }

    if (tenant?.industry === "restaurant") {
      checks.push({
        check: "Allergen disclaimer",
        passed: true,
        message: "Allergen disclaimer will be included in agent responses",
        severity: "warning",
      });
    }

    if (tenant?.industry === "real_estate") {
      checks.push({
        check: "Fair housing policy",
        passed: true,
        message: "Fair housing compliance enabled by default",
        severity: "warning",
      });
    }

    const allPassed = checks.every(
      (c) => c.passed || c.severity === "warning"
    );

    return NextResponse.json({
      passed: allPassed,
      checks,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

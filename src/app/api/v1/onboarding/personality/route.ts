import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { z } from "zod";

const personalitySchema = z.object({
  tenantId: z.string().uuid(),
  voiceId: z.string().min(1),
  tone: z.enum(["warm", "professional", "energetic", "calm"]),
  speakingPace: z.enum(["slower", "natural", "faster"]),
  greetingStyle: z.enum(["formal", "friendly", "minimal"]),
  aiDisclosure: z.boolean(),
  transferNumber: z.string().optional(),
  afterHoursBehavior: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
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
    const parsed = personalitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantId, ...fields } = parsed.data;

    const speedMap = { slower: 0.85, natural: 1.0, faster: 1.15 };

    const { error: voiceError } = await supabase
      .from("voice_profiles")
      .update({
        voice_id: fields.voiceId,
        speed: speedMap[fields.speakingPace],
        greeting: fields.greetingStyle,
      })
      .eq("tenant_id", tenantId);

    if (voiceError) {
      return NextResponse.json(
        { error: `Failed to update voice profile: ${voiceError.message}` },
        { status: 500 }
      );
    }

    const { error: policyError } = await supabase
      .from("policy_settings")
      .update({
        recording_consent_required: fields.aiDisclosure,
      })
      .eq("tenant_id", tenantId);

    if (policyError) {
      return NextResponse.json(
        { error: `Failed to update policies: ${policyError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

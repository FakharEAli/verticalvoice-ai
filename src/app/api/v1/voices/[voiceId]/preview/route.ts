import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/database/supabase-server";
import { findVoice, getVoiceCatalog } from "@/lib/voices/catalog";

/**
 * Streams a voice's sample clip to the browser.
 *
 * This proxy exists for one concrete reason: Ultravox's `previewUrl` points at
 * a public Google Cloud Storage object that is served with
 * `content-type: text/plain`. Browsers refuse to decode that in an `<audio>`
 * element, so handing the raw URL to the client produces a silent, broken play
 * button. Re-serving the same bytes under `audio/mpeg` fixes it.
 *
 * Authenticated but NOT tenant-scoped, for the same reason the list route is:
 * the sample clips are generic Ultravox data, needed during onboarding before a
 * tenant exists, and bought with our Ultravox key rather than being tenant
 * data. The upstream fetch is unauthenticated by design — the storage URL is
 * public and needs no API key.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const { voiceId } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const catalog = await getVoiceCatalog();
    const voice = findVoice(catalog, voiceId);

    if (!voice) {
      return NextResponse.json({ error: "That voice was not found." }, { status: 404 });
    }
    if (!voice.previewUrl) {
      return NextResponse.json(
        { error: "That voice has no sample to play." },
        { status: 404 }
      );
    }

    const upstream = await fetch(voice.previewUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "The sample could not be loaded. Please try again." },
        { status: 502 }
      );
    }

    // Sample clips are immutable per voice id, so they can be cached hard.
    // Private, because the route is behind a session.
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The sample could not be loaded. Please try again." },
      { status: 502 }
    );
  }
}

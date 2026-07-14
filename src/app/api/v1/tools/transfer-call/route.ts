import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with proper JWT verification using TOOL_TOKEN_SECRET
function verifyToolToken(request: NextRequest): { call_id: string; tenant_id: string } | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    if (!payload.call_id || !payload.tenant_id || (payload.exp && payload.exp < Date.now() / 1000)) return null;
    return { call_id: payload.call_id, tenant_id: payload.tenant_id };
  } catch { return null; }
}

const transferCallSchema = z.object({
  transfer_to: z.string().min(1),
  reason: z.string().optional(),
  warm_transfer: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = transferCallSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Log the transfer event for audit trail
    const { error } = await supabase
      .from('audit_events' as any)
      .insert({
        tenant_id: auth.tenant_id,
        call_id: auth.call_id,
        event_type: 'call_transfer',
        payload: {
          transfer_to: parsed.data.transfer_to,
          reason: parsed.data.reason ?? null,
          warm_transfer: parsed.data.warm_transfer,
        },
      });

    if (error) {
      console.error('[transfer-call] Audit log error:', error);
      // Non-fatal: continue with transfer even if audit fails
    }

    // TODO: Integrate with Twilio/Telnyx call transfer API
    // For now, log the intent and return success
    console.log(`[transfer-call] Transferring call ${auth.call_id} to ${parsed.data.transfer_to}`, {
      reason: parsed.data.reason,
      warm_transfer: parsed.data.warm_transfer,
    });

    return NextResponse.json({
      status: 'transferring',
      transfer_to: parsed.data.transfer_to,
    });
  } catch (error) {
    console.error('[transfer-call] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

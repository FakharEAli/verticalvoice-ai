import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

const sendConfirmationSchema = z.object({
  type: z.enum(['sms', 'email']),
  to: z.string().min(1),
  message: z.string().min(1),
  booking_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = sendConfirmationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // TODO: Integrate with actual SMS provider (Twilio) or email provider (Resend/SendGrid)
    // For now, log the confirmation intent and return success
    console.log(`[send-confirmation] ${parsed.data.type} to ${parsed.data.to}`, {
      call_id: auth.call_id,
      tenant_id: auth.tenant_id,
      booking_id: parsed.data.booking_id,
      message_length: parsed.data.message.length,
    });

    return NextResponse.json({
      sent: true,
      channel: parsed.data.type,
    });
  } catch (error) {
    console.error('[send-confirmation] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

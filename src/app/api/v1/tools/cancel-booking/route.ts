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

const cancelBookingSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = cancelBookingSchema.safeParse(body);

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

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: parsed.data.reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.booking_id)
      .eq('tenant_id', auth.tenant_id)
      .select('id')
      .single();

    if (error || !data) {
      console.error('[cancel-booking] DB error:', error);
      return NextResponse.json(
        { error: 'Booking not found or update failed' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      booking_id: data.id,
      status: 'cancelled',
    });
  } catch (error) {
    console.error('[cancel-booking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

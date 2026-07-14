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

const createBookingSchema = z.object({
  date: z.string(),
  time: z.string(),
  duration_minutes: z.number().int().positive(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_email: z.string().email().optional(),
  service_type: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

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

    const confirmationCode = `BK-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        tenant_id: auth.tenant_id,
        call_id: auth.call_id,
        date: parsed.data.date,
        time: parsed.data.time,
        duration_minutes: parsed.data.duration_minutes,
        customer_name: parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone,
        customer_email: parsed.data.customer_email ?? null,
        service_type: parsed.data.service_type ?? null,
        notes: parsed.data.notes ?? null,
        confirmation_code: confirmationCode,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[create-booking] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      booking_id: data.id,
      confirmation_code: confirmationCode,
      status: 'confirmed',
    });
  } catch (error) {
    console.error('[create-booking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

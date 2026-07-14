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

const createReservationSchema = z.object({
  date: z.string(),
  time: z.string(),
  party_size: z.number().int().positive(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  special_requests: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

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
      .from('reservations')
      .insert({
        tenant_id: auth.tenant_id,
        call_id: auth.call_id,
        date: parsed.data.date,
        time: parsed.data.time,
        party_size: parsed.data.party_size,
        customer_name: parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone,
        special_requests: parsed.data.special_requests ?? null,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[create-reservation] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to create reservation' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      reservation_id: data.id,
      status: 'confirmed',
    });
  } catch (error) {
    console.error('[create-reservation] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

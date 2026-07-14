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

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional(),
  interest: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);

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
      .from('leads')
      .insert({
        tenant_id: auth.tenant_id,
        call_id: auth.call_id,
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        source: parsed.data.source ?? 'voice_call',
        interest: parsed.data.interest ?? null,
        notes: parsed.data.notes ?? null,
        status: 'captured',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[create-lead] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to capture lead' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      lead_id: data.id,
      status: 'captured',
    });
  } catch (error) {
    console.error('[create-lead] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

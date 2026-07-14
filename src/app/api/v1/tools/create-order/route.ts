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

const orderItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  special_instructions: z.string().optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  order_type: z.enum(['pickup', 'delivery']),
  delivery_address: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = verifyToolToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.order_type === 'delivery' && !parsed.data.delivery_address) {
      return NextResponse.json(
        { error: 'Delivery address is required for delivery orders' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from('orders' as any)
      .insert({
        tenant_id: auth.tenant_id,
        call_id: auth.call_id,
        items: parsed.data.items,
        customer_name: parsed.data.customer_name,
        customer_phone: parsed.data.customer_phone,
        order_type: parsed.data.order_type,
        delivery_address: parsed.data.delivery_address ?? null,
        status: 'confirmed',
        estimated_time_minutes: 30,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[create-order] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      order_id: data.id,
      estimated_time_minutes: 30,
      status: 'confirmed',
    });
  } catch (error) {
    console.error('[create-order] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

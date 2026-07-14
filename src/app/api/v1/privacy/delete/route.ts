import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/database/supabase-server';
import { uuidSchema } from '@/lib/validation/schemas';
import { deleteTenantData } from '@/domain/privacy/service';
import { logger } from '@/lib/observability/logger';

const deleteSchema = z.object({
  tenant_id: uuidSchema,
  confirm: z.literal(true),
  mode: z.enum(['soft', 'hard']).default('soft'),
});

/**
 * POST /api/v1/privacy/delete
 * Delete (or soft-delete) all data for a tenant. Requires an explicit
 * `confirm: true` body flag and admin/owner role — this is destructive,
 * especially with `mode: "hard"`. Logs to `audit_events`.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input — deletion requires { tenant_id, confirm: true }',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { tenant_id, mode } = parsed.data;

    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins can delete tenant data' },
        { status: 403 }
      );
    }

    const result = await deleteTenantData(tenant_id, { mode });

    await supabase.from('audit_events').insert({
      tenant_id,
      actor_id: user.id,
      action: mode === 'hard' ? 'privacy_delete_hard' : 'privacy_delete_soft',
      resource_type: 'tenant',
      resource_id: tenant_id,
      metadata: { requested_by: user.id, mode, tables_purged: result.tables_purged },
    });

    logger.warn('privacy_delete_completed', { tenantId: tenant_id, actorId: user.id, mode });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('privacy_delete_route_failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

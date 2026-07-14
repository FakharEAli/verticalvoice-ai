import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/database/supabase-server';
import { uuidSchema } from '@/lib/validation/schemas';
import { exportTenantData } from '@/domain/privacy/service';
import { logger } from '@/lib/observability/logger';

const exportSchema = z.object({
  tenant_id: uuidSchema,
});

/**
 * POST /api/v1/privacy/export
 * Export all data held for a tenant as a JSON bundle. Auth-gated: caller
 * must be an authenticated admin/owner member of the tenant.
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
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tenant_id } = parsed.data;

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
        { error: 'Only admins can export tenant data' },
        { status: 403 }
      );
    }

    const bundle = await exportTenantData(tenant_id);

    await supabase.from('audit_events').insert({
      tenant_id,
      actor_id: user.id,
      action: 'privacy_export',
      resource_type: 'tenant',
      resource_id: tenant_id,
      metadata: { requested_by: user.id },
    });

    logger.info('privacy_export_completed', { tenantId: tenant_id, actorId: user.id });

    return NextResponse.json(bundle, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="tenant-${tenant_id}-export.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('privacy_export_route_failed', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Privacy controls: data export and deletion for a tenant's data.
 *
 * Backs the `/api/v1/privacy/export` and `/api/v1/privacy/delete` routes.
 * Every table queried/mutated here is tenant-scoped (`tenant_id` column) per
 * `src/lib/database/types.ts`. Industry-specific tables (appointments,
 * reservations/orders, real-estate leads, catering leads) are all queried —
 * only the ones with rows for this tenant will contribute data.
 */

import { createServerClient } from '@/lib/database/supabase-server';
import { logger } from '@/lib/observability/logger';

export interface TenantDataExport {
  exported_at: string;
  tenant_id: string;
  tenant: unknown;
  business_profile: unknown;
  calls: unknown[];
  call_transcripts: unknown[];
  appointments: unknown[];
  reservations: unknown[];
  orders: unknown[];
  real_estate_leads: unknown[];
  catering_leads: unknown[];
}

/**
 * Export all data VerticalVoice AI holds for a tenant as a single JSON
 * bundle, suitable for a data-subject access / portability request.
 */
export async function exportTenantData(tenantId: string): Promise<TenantDataExport> {
  const supabase = await createServerClient();

  const [
    tenantRes,
    businessProfileRes,
    callsRes,
    transcriptsRes,
    appointmentsRes,
    reservationsRes,
    ordersRes,
    realEstateLeadsRes,
    cateringLeadsRes,
  ] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle(),
    supabase.from('business_profiles').select('*').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('calls').select('*').eq('tenant_id', tenantId),
    supabase.from('call_transcripts').select('*').eq('tenant_id', tenantId),
    supabase.from('appointments').select('*').eq('tenant_id', tenantId),
    supabase.from('reservations').select('*').eq('tenant_id', tenantId),
    supabase.from('orders').select('*').eq('tenant_id', tenantId),
    supabase.from('real_estate_leads').select('*').eq('tenant_id', tenantId),
    supabase.from('catering_leads').select('*').eq('tenant_id', tenantId),
  ]);

  const firstError = [
    tenantRes,
    businessProfileRes,
    callsRes,
    transcriptsRes,
    appointmentsRes,
    reservationsRes,
    ordersRes,
    realEstateLeadsRes,
    cateringLeadsRes,
  ].find((r) => r.error);

  if (firstError?.error) {
    logger.error('privacy_export_failed', { tenantId, error: firstError.error.message });
    throw new Error(`Failed to export tenant data: ${firstError.error.message}`);
  }

  return {
    exported_at: new Date().toISOString(),
    tenant_id: tenantId,
    tenant: tenantRes.data,
    business_profile: businessProfileRes.data,
    calls: callsRes.data ?? [],
    call_transcripts: transcriptsRes.data ?? [],
    appointments: appointmentsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    orders: ordersRes.data ?? [],
    real_estate_leads: realEstateLeadsRes.data ?? [],
    catering_leads: cateringLeadsRes.data ?? [],
  };
}

export interface DeleteTenantDataOptions {
  /**
   * `soft` (default): mark the tenant `deleted` and leave rows in place for
   * the retention window (see docs/compliance/known-limitations.md) so
   * accidental deletes are recoverable and financial/audit records survive.
   * `hard`: irreversibly delete tenant-scoped rows from every table listed
   * in `exportTenantData`. Use only after the confirmation flow in the
   * route handler and only when the tenant has explicitly requested erasure.
   */
  mode?: 'soft' | 'hard';
}

export interface DeleteTenantDataResult {
  tenant_id: string;
  mode: 'soft' | 'hard';
  deleted_at: string;
  tables_purged: string[];
}

const HARD_DELETE_TABLES = [
  'call_transcripts',
  'calls',
  'appointments',
  'reservations',
  'orders',
  'real_estate_leads',
  'catering_leads',
  'business_profiles',
] as const;

/**
 * Delete (or soft-delete) all data for a tenant.
 *
 * Soft delete: sets `tenants.status = 'deleted'`. The tenant is excluded
 * from normal application queries (any query filtering on active tenant
 * status) but the underlying rows are preserved for the retention window.
 *
 * Hard delete: additionally purges rows from every tenant-scoped table.
 * This is irreversible — callers (the route handler) are responsible for
 * requiring an explicit `confirm: true` flag and admin role before calling
 * this with `mode: 'hard'`.
 */
export async function deleteTenantData(
  tenantId: string,
  options: DeleteTenantDataOptions = {},
): Promise<DeleteTenantDataResult> {
  const mode = options.mode ?? 'soft';
  const supabase = await createServerClient();
  const deletedAt = new Date().toISOString();

  const { error: statusError } = await supabase
    .from('tenants')
    .update({ status: 'deleted', updated_at: deletedAt })
    .eq('id', tenantId);

  if (statusError) {
    logger.error('privacy_delete_status_update_failed', { tenantId, error: statusError.message });
    throw new Error(`Failed to mark tenant deleted: ${statusError.message}`);
  }

  const tablesPurged: string[] = [];

  if (mode === 'hard') {
    for (const table of HARD_DELETE_TABLES) {
      const { error } = await supabase.from(table).delete().eq('tenant_id', tenantId);
      if (error) {
        // Keep going — a partial purge is still preferable to stopping
        // entirely, and each failure is logged for manual follow-up.
        logger.error('privacy_delete_table_purge_failed', { tenantId, table, error: error.message });
        continue;
      }
      tablesPurged.push(table);
    }
  }

  logger.warn('tenant_data_deleted', { tenantId, mode, tablesPurged });

  return {
    tenant_id: tenantId,
    mode,
    deleted_at: deletedAt,
    tables_purged: tablesPurged,
  };
}

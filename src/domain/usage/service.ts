import { createServerClient } from "@/lib/database/supabase-server";
import { logger } from "@/lib/observability/logger";

// Uses usage_ledger and usage_limits tables from types.ts

export type UsageResource = "call_minutes" | "sms" | "api_calls" | "knowledge_extraction" | "recording_storage";

export interface UsageEvent {
  id: string;
  tenant_id: string;
  resource: string;
  quantity: number;
  unit: string;
  reference_type: string | null;
  reference_id: string | null;
  recorded_at: string;
  created_at: string;
}

export interface UsageSummary {
  period: string;
  total_quantity: number;
  breakdown: Array<{
    resource: string;
    total_quantity: number;
    unit: string;
    count: number;
  }>;
}

export interface LimitStatus {
  resource: string;
  current_quantity: number;
  limit_value: number | null;
  is_hard_limit: boolean;
  exceeded: boolean;
  percentage: number;
}

export interface CostEstimate {
  call_minutes: number;
  estimated_cost_cents: number;
  rate_per_minute_cents: number;
}

// Default per-minute rate in cents (configurable per tenant later)
const DEFAULT_RATE_PER_MINUTE_CENTS = 10;

export async function recordUsage(
  tenantId: string,
  resource: UsageResource,
  quantity: number,
  unit: string = "count"
): Promise<UsageEvent> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("usage_ledger")
    .insert({
      tenant_id: tenantId,
      resource,
      quantity,
      unit,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to record usage", { tenantId, resource, error: error.message });
    throw new Error(`Failed to record usage: ${error.message}`);
  }

  logger.info("Usage recorded", { tenantId, resource, quantity, unit });
  return data;
}

export async function getUsageSummary(
  tenantId: string,
  period: string // YYYY-MM
): Promise<UsageSummary> {
  const supabase = await createServerClient();

  // Filter by period using recorded_at date range
  const periodStart = `${period}-01T00:00:00`;
  const [year, month] = period.split("-").map(Number);
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const periodEnd = `${nextMonth}-01T00:00:00`;

  const { data, error } = await supabase
    .from("usage_ledger")
    .select("resource, quantity, unit")
    .eq("tenant_id", tenantId)
    .gte("recorded_at", periodStart)
    .lt("recorded_at", periodEnd);

  if (error) {
    logger.error("Failed to get usage summary", { tenantId, period, error: error.message });
    throw new Error(`Failed to get usage summary: ${error.message}`);
  }

  const events = data ?? [];

  // Aggregate by resource
  const byResource = new Map<string, { total_quantity: number; unit: string; count: number }>();

  for (const event of events) {
    const existing = byResource.get(event.resource) ?? { total_quantity: 0, unit: event.unit, count: 0 };
    existing.total_quantity += event.quantity;
    existing.count += 1;
    byResource.set(event.resource, existing);
  }

  const breakdown = Array.from(byResource.entries()).map(([resource, stats]) => ({
    resource,
    ...stats,
  }));

  const totalQuantity = breakdown.reduce((sum, b) => sum + b.total_quantity, 0);

  return {
    period,
    total_quantity: totalQuantity,
    breakdown,
  };
}

export async function checkLimit(
  tenantId: string,
  resource: UsageResource
): Promise<LimitStatus> {
  const supabase = await createServerClient();

  // Get the limit for this resource
  const { data: limit } = await supabase
    .from("usage_limits")
    .select("limit_value, period, is_hard_limit")
    .eq("tenant_id", tenantId)
    .eq("resource", resource)
    .maybeSingle();

  // Calculate current period usage
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = `${currentPeriod}-01T00:00:00`;
  const nextMonth = now.getMonth() === 11
    ? `${now.getFullYear() + 1}-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;
  const periodEnd = `${nextMonth}-01T00:00:00`;

  const { data: events, error } = await supabase
    .from("usage_ledger")
    .select("quantity")
    .eq("tenant_id", tenantId)
    .eq("resource", resource)
    .gte("recorded_at", periodStart)
    .lt("recorded_at", periodEnd);

  if (error) {
    logger.error("Failed to check usage limit", { tenantId, resource, error: error.message });
    throw new Error(`Failed to check limit: ${error.message}`);
  }

  const currentQuantity = (events ?? []).reduce((sum, e) => sum + e.quantity, 0);

  const limitValue = limit?.limit_value ?? null;
  const isHardLimit = limit?.is_hard_limit ?? false;
  const exceeded = limitValue !== null && currentQuantity >= limitValue;
  const percentage = limitValue !== null && limitValue > 0
    ? Math.round((currentQuantity / limitValue) * 100)
    : 0;

  if (exceeded) {
    logger.warn("Usage limit exceeded", { tenantId, resource, currentQuantity, limitValue });
  }

  return {
    resource,
    current_quantity: currentQuantity,
    limit_value: limitValue,
    is_hard_limit: isHardLimit,
    exceeded,
    percentage,
  };
}

export async function estimateCost(
  _tenantId: string,
  callMinutes: number
): Promise<CostEstimate> {
  // In the future, look up tenant-specific rate from a pricing table.
  // For now, use the default rate.
  const ratePerMinuteCents = DEFAULT_RATE_PER_MINUTE_CENTS;
  const estimatedCostCents = Math.ceil(callMinutes * ratePerMinuteCents);

  return {
    call_minutes: callMinutes,
    estimated_cost_cents: estimatedCostCents,
    rate_per_minute_cents: ratePerMinuteCents,
  };
}

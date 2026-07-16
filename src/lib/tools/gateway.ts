import { z } from 'zod';
import { logger } from '@/lib/observability/logger';
import { verifyCallToken, type CallTokenPayload, TokenError } from './token';
import { redactOutput as applyRedaction, buildRedactionRules, type RedactionRule } from './redaction';
import { createAdminClient } from '@/lib/database/supabase-admin';
import { evaluateAllPolicies, type PolicyContext, type PolicyDecision } from '@/industries/core/policies';
import type { IndustryId, PolicyDefinition } from '@/industries/core/industry-pack';
import type { Json } from '@/lib/database/types';
import { checkRateLimit } from '@/lib/security/rate-limit';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolCallRequest {
  headers: { authorization?: string };
  body: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration_ms: number;
  redacted: boolean;
}

interface TenantInfo {
  id: string;
  name: string;
  industry: string;
  status: string;
}

interface AgentConfig {
  tenantId: string;
  enabledTools: string[];
  policies: PolicyDefinition[];
  piiRedactionEnabled: boolean;
  hipaaMode: boolean;
}

interface IdempotencyCacheEntry {
  result: unknown;
  expires: number;
}

// ─── Tool Input Schemas ───────────────────────────────────────────────────────

const TOOL_SCHEMAS: Record<string, z.ZodType> = {
  'check-availability': z.object({
    date: z.string(),
    duration_minutes: z.number().int().positive().optional().default(30),
    provider_id: z.string().optional(),
    service_type: z.string().optional(),
  }),
  'create-booking': z.object({
    date: z.string(),
    time: z.string(),
    name: z.string(),
    phone: z.string(),
    service: z.string().optional(),
    notes: z.string().optional(),
  }),
  'transfer-call': z.object({
    department: z.string(),
    reason: z.string().optional(),
  }),
  'send-confirmation': z.object({
    phone: z.string(),
    message: z.string(),
  }),
  'book-showing': z.object({
    listing_id: z.string(),
    date: z.string(),
    time: z.string(),
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
  }),
  'lookup-patient': z.object({
    patient_id: z.string().optional(),
    phone: z.string().optional(),
    date_of_birth: z.string().optional(),
  }),
  'check-insurance': z.object({
    insurance_provider: z.string(),
    member_id: z.string().optional(),
  }),
  'get-menu': z.object({
    category: z.string().optional(),
    dietary_filter: z.string().optional(),
  }),
};

// ─── Idempotency Cache ────────────────────────────────────────────────────────

const idempotencyCache = new Map<string, IdempotencyCacheEntry>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired entries periodically
let cleanupScheduled = false;

function scheduleIdempotencyCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of idempotencyCache) {
      if (entry.expires < now) {
        idempotencyCache.delete(key);
      }
    }
    if (idempotencyCache.size === 0) {
      clearInterval(interval);
      cleanupScheduled = false;
    }
  }, 60_000);
  // Allow the process to exit even if the interval is running
  if (typeof interval === 'object' && 'unref' in interval) {
    interval.unref();
  }
}

// ─── Step Functions ───────────────────────────────────────────────────────────

/**
 * Step 1: Authenticate the call-scoped JWT token.
 */
function authenticateCallToken(request: ToolCallRequest): CallTokenPayload {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    throw new GatewayError('unauthorized', 'Missing or invalid Authorization header', 401);
  }

  const token = auth.slice(7);
  try {
    return verifyCallToken(token);
  } catch (err) {
    if (err instanceof TokenError) {
      throw new GatewayError('unauthorized', `Token verification failed: ${err.code}`, 401);
    }
    throw new GatewayError('unauthorized', 'Token verification failed', 401);
  }
}

/**
 * Step 2: Resolve tenant information from the call record.
 */
async function resolveTenant(callId: string, tenantId: string): Promise<TenantInfo> {
  const supabase = createAdminClient();

  // Verify the call belongs to this tenant
  const { data: call, error: callError } = await supabase
    .from('calls')
    .select('id, tenant_id')
    .eq('id', callId)
    .single();

  if (callError || !call) {
    throw new GatewayError('call_not_found', `Call not found: ${callId}`, 404);
  }

  if (call.tenant_id !== tenantId) {
    throw new GatewayError('tenant_mismatch', 'Call does not belong to the authenticated tenant', 403);
  }

  // Fetch tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, industry, status')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new GatewayError('tenant_not_found', `Tenant not found: ${tenantId}`, 404);
  }

  logger.debug('resolve_tenant', { tenantId, industry: tenant.industry });
  return tenant;
}

/**
 * Step 3: Resolve the agent configuration for this tenant.
 */
async function resolveAgentConfig(tenantId: string): Promise<AgentConfig> {
  const supabase = createAdminClient();

  // Fetch policy settings for redaction config
  const { data: policySettings } = await supabase
    .from('policy_settings')
    .select('pii_redaction_enabled, hipaa_mode')
    .eq('tenant_id', tenantId)
    .single();

  // In production: fetch compiled agent config from a dedicated table or cache
  // For now we derive enabled tools and policies from policy settings
  // const compiledConfig = await fetchCompiledConfig(tenantId);

  logger.debug('resolve_agent_config', { tenantId });

  return {
    tenantId,
    enabledTools: Object.keys(TOOL_SCHEMAS),
    policies: [],
    piiRedactionEnabled: policySettings?.pii_redaction_enabled ?? false,
    hipaaMode: policySettings?.hipaa_mode ?? false,
  };
}

// Tool calls happen repeatedly within a single live call (one per intent),
// so the budget is generous per-call but still bounds runaway/looping agents
// or a compromised call token. Per-tenant budget guards against a tenant
// with many simultaneous live calls overwhelming shared downstream services.
const TOOL_CALLS_PER_CALL_LIMIT = 30;
const TOOL_CALLS_PER_CALL_WINDOW_MS = 60_000;
const TOOL_CALLS_PER_TENANT_LIMIT = 300;
const TOOL_CALLS_PER_TENANT_WINDOW_MS = 60_000;

/**
 * Step 3b: Enforce a per-call and per-tenant tool-call rate limit.
 * This is independent of (and in addition to) the idempotency cache, which
 * only dedupes retried calls sharing the same idempotency key — it does not
 * bound the overall call rate.
 */
function applyRateLimit(tenantId: string, callId: string): void {
  const perCall = checkRateLimit(`tool-call:call:${callId}`, TOOL_CALLS_PER_CALL_LIMIT, TOOL_CALLS_PER_CALL_WINDOW_MS);
  if (!perCall.allowed) {
    throw new GatewayError('rate_limited', 'Too many tool calls for this call', 429);
  }

  const perTenant = checkRateLimit(`tool-call:tenant:${tenantId}`, TOOL_CALLS_PER_TENANT_LIMIT, TOOL_CALLS_PER_TENANT_WINDOW_MS);
  if (!perTenant.allowed) {
    throw new GatewayError('rate_limited', 'Too many tool calls for this tenant', 429);
  }
}

/**
 * Step 4: Validate that the tool is enabled for this call.
 */
function validateToolEnabled(tokenPayload: CallTokenPayload, toolName: string): void {
  if (
    tokenPayload.enabled_tools.length > 0 &&
    !tokenPayload.enabled_tools.includes(toolName)
  ) {
    throw new GatewayError(
      'tool_not_enabled',
      `Tool '${toolName}' is not enabled for this call`,
      403,
    );
  }
}

/**
 * Step 5: Validate tool input against the registered schema.
 */
function validateInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  const schema = TOOL_SCHEMAS[toolName];
  if (!schema) {
    throw new GatewayError('unknown_tool', `No schema registered for tool '${toolName}'`, 400);
  }

  const result = schema.safeParse(input);
  if (!result.success) {
    const zodError = result.error;
    throw new GatewayError(
      'validation_error',
      `Input validation failed: ${zodError.issues.map((e) => `${String(e.path.join('.'))}: ${e.message}`).join('; ')}`,
      400,
    );
  }

  return result.data as Record<string, unknown>;
}

/**
 * Step 6: Apply policy checks for this tool call.
 */
function applyPolicy(
  tenantId: string,
  callId: string,
  toolName: string,
  policies: PolicyDefinition[],
  tenant: TenantInfo,
): PolicyDecision[] {
  if (policies.length === 0) {
    logger.debug('no_policies_to_evaluate', { tenantId, toolName });
    return [];
  }

  const context: PolicyContext = {
    industryId: (tenant.industry || 'healthcare') as IndustryId,
    tenantId,
    callId,
    intentId: toolName,
    callerVerified: false,
    currentTime: new Date(),
    customFields: {},
  };

  const decisions = evaluateAllPolicies(context, policies);
  const denied = decisions.filter((d) => !d.allowed && d.severity === 'block');

  if (denied.length > 0) {
    const reasons = denied.map((d) => d.reason).join('; ');
    logger.warn('policy_denied', { tenantId, toolName, reasons });
    throw new GatewayError('policy_denied', `Policy check failed: ${reasons}`, 403);
  }

  // Log warnings for non-blocking denials
  const warnings = decisions.filter((d) => !d.allowed && d.severity === 'warn');
  if (warnings.length > 0) {
    logger.warn('policy_warning', {
      tenantId,
      toolName,
      warnings: warnings.map((w) => w.reason),
    });
  }

  return decisions;
}

/**
 * Step 7: Check idempotency key to prevent duplicate execution.
 */
function applyIdempotency(key: string | undefined): IdempotencyCacheEntry | null {
  if (!key) return null;

  const existing = idempotencyCache.get(key);
  if (existing && existing.expires > Date.now()) {
    logger.info('idempotency_hit', { key });
    return existing;
  }

  return null;
}

/**
 * Step 8: Execute the tool call by routing to the appropriate domain service.
 * In production, each case would delegate to a real service module.
 */
async function executeToolCall(
  toolName: string,
  _tenantId: string,
  validatedInput: Record<string, unknown>,
): Promise<unknown> {
  logger.info('execute_tool_call', { toolName });

  // Route to domain services based on tool name
  switch (toolName) {
    case 'check-availability':
      return { available: true, slots: [], tool: toolName, input: validatedInput };
    case 'create-booking':
      return { booking_id: `bk_${Date.now()}`, status: 'confirmed', tool: toolName };
    case 'transfer-call':
      return { transfer_id: `tr_${Date.now()}`, status: 'initiated', tool: toolName };
    case 'send-confirmation':
      return { message_id: `msg_${Date.now()}`, status: 'sent', tool: toolName };
    case 'book-showing':
      return { showing_id: `sh_${Date.now()}`, status: 'scheduled', tool: toolName };
    case 'lookup-patient':
      return { found: false, tool: toolName };
    case 'check-insurance':
      return { covered: false, tool: toolName };
    case 'get-menu':
      return { items: [], tool: toolName };
    default:
      throw new GatewayError('unknown_tool', `No handler for tool '${toolName}'`, 400);
  }
}

/**
 * Step 9: Build redaction rules based on tenant policies.
 */
function buildRules(config: AgentConfig): RedactionRule[] {
  if (!config.piiRedactionEnabled) return [];
  const level = config.hipaaMode ? 'strict' : 'standard';
  return buildRedactionRules(level);
}

/**
 * Step 10: Log the tool execution to the database.
 */
async function logToolRun(
  callId: string,
  _tenantId: string,
  toolName: string,
  input: Record<string, unknown>,
  output: unknown,
  durationMs: number,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from('audit_events').insert({
      tenant_id: _tenantId,
      action: success ? 'tool_call_success' : 'tool_call_error',
      resource_type: 'call_tool_run',
      resource_id: callId,
      metadata: {
        tool_name: toolName,
        duration_ms: Math.round(durationMs),
        status: success ? 'success' : 'error',
        error_message: error ?? null,
      } as unknown as Json,
    });
  } catch (err) {
    // Logging failures must not break the tool call response
    logger.error('failed_to_log_tool_run', {
      callId,
      toolName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Main gateway entry point: orchestrates all steps for a tool call.
 */
export async function handleToolCall(
  request: ToolCallRequest,
  toolName: string,
): Promise<ToolCallResult> {
  const startTime = Date.now();
  let callId = '';
  let tenantId = '';

  try {
    // Step 1: Authenticate
    const tokenPayload = authenticateCallToken(request);
    callId = tokenPayload.call_id;
    tenantId = tokenPayload.tenant_id;

    logger.info('tool_call_started', { callId, tenantId, toolName });

    // Step 2: Resolve tenant (also verifies call ownership)
    const tenant = await resolveTenant(callId, tenantId);
    if (tenant.status !== 'active') {
      throw new GatewayError('tenant_inactive', 'Tenant account is not active', 403);
    }

    // Step 3: Resolve agent config
    const agentConfig = await resolveAgentConfig(tenantId);

    // Step 3b: Rate limit
    applyRateLimit(tenantId, callId);

    // Step 4: Validate tool is enabled
    validateToolEnabled(tokenPayload, toolName);

    // Step 5: Validate input
    const validatedInput = validateInput(toolName, request.body);

    // Step 6: Apply policies
    applyPolicy(tenantId, callId, toolName, agentConfig.policies, tenant);

    // Step 7: Check idempotency
    const cached = applyIdempotency(request.idempotencyKey);
    if (cached) {
      const durationMs = Date.now() - startTime;
      return {
        success: true,
        data: cached.result,
        duration_ms: durationMs,
        redacted: false,
      };
    }

    // Step 8: Execute
    const rawOutput = await executeToolCall(toolName, tenantId, validatedInput);

    // Step 9: Redact
    const rules = buildRules(agentConfig);
    const redacted = rules.length > 0;
    const output = redacted ? applyRedaction(rawOutput, rules) : rawOutput;

    // Cache for idempotency
    if (request.idempotencyKey) {
      idempotencyCache.set(request.idempotencyKey, {
        result: output,
        expires: Date.now() + IDEMPOTENCY_TTL_MS,
      });
      scheduleIdempotencyCleanup();
    }

    const durationMs = Date.now() - startTime;

    // Step 10: Log
    await logToolRun(callId, tenantId, toolName, validatedInput, output, durationMs, true);

    logger.info('tool_call_completed', { callId, tenantId, toolName, durationMs });

    return {
      success: true,
      data: output,
      duration_ms: durationMs,
      redacted,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = err instanceof GatewayError ? err.code : 'internal_error';

    logger.error('tool_call_failed', { callId, tenantId, toolName, error: message, code, durationMs });

    if (callId) {
      await logToolRun(callId, tenantId, toolName, request.body, null, durationMs, false, message).catch(() => {
        // Swallow logging errors to avoid masking the original error
      });
    }

    return {
      success: false,
      error: message,
      duration_ms: durationMs,
      redacted: false,
    };
  }
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class GatewayError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

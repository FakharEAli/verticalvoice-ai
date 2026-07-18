import type {
  IndustryId,
  IndustryPack,
  VoiceConfig,
  CallConfig,
  IntentDefinition,
  ToolBinding,
  PolicyDefinition,
  EscalationRule,
  KnowledgeSchema,
  AnalyticsDefinition,
  PromptFragment,
} from "@/industries/core/industry-pack";
import { VOICE_CONVERSATION_RULES } from "@/industries/core/voice-rules";

// ─── Tenant Configuration ──────────────────────────────────────────────────

export interface TenantConfig {
  tenantId: string;
  industryId: IndustryId;
  businessName: string;
  businessPhone: string;
  timezone: string;
  locale: string;
  features: Record<string, boolean>;
  overrides: {
    voice?: Partial<VoiceConfig>;
    call?: Partial<CallConfig>;
    greeting?: string;
  };
}

// ─── Compiled Agent Configuration ──────────────────────────────────────────

export interface CompiledAgentConfig {
  hash: string;
  inputHash: string;
  compiledAt: string;
  tenantId: string;
  industryId: IndustryId;
  systemPrompt: string;
  voice: VoiceConfig;
  call: CallConfig;
  activeIntents: IntentDefinition[];
  activeTools: ToolBinding[];
  activePolicies: PolicyDefinition[];
  escalationRules: EscalationRule[];
  greeting: string;
  knowledgeConfig: KnowledgeSchema;
  analyticsConfig: AnalyticsDefinition;
}

// ─── Deterministic Hash (FNV-1a) ──────────────────────────────────────────

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function deterministicHash(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ─── Internal Helpers ─────────────────────────────────────────────────────

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") +
    "}"
  );
}

function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(val);
  }
  return result;
}

/** Industry packs write {{restaurant_name}} / {{practice_name}} / etc. — all of
 *  which mean "this business". Without these aliases the agent literally said
 *  "Thank you for calling {{restaurant_name}}" out loud on live calls. */
const BUSINESS_NAME_ALIASES = [
  "business_name",
  "businessName",
  "restaurant_name",
  "practice_name",
  "clinic_name",
  "agency_name",
  "brokerage_name",
  "company_name",
] as const;

const PHONE_ALIASES = ["business_phone", "phone", "contact_phone"] as const;

/** Readable stand-ins for descriptor slots, so a missing answer never leaves
 *  a hole like "a  restaurant" in a spoken sentence. */
const DESCRIPTOR_FALLBACKS: Record<string, string> = {
  cuisine_type: "neighborhood",
  practice_type: "general",
  specialty: "general",
  property_type: "residential",
};

function buildTemplateVariables(
  tenant: TenantConfig,
  onboardingAnswers: Record<string, unknown> = {},
): Record<string, string> {
  const vars: Record<string, string> = {
    businessName: tenant.businessName,
    businessPhone: tenant.businessPhone,
    timezone: tenant.timezone,
    locale: tenant.locale,
    tenantId: tenant.tenantId,
    industryId: tenant.industryId,
  };

  // Anything the owner answered during onboarding is addressable by its key.
  for (const [key, value] of Object.entries(onboardingAnswers)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const str = String(value).trim();
      if (str) vars[key] = str;
    }
  }

  for (const alias of BUSINESS_NAME_ALIASES) {
    if (!vars[alias]) vars[alias] = tenant.businessName;
  }
  for (const alias of PHONE_ALIASES) {
    if (!vars[alias]) vars[alias] = tenant.businessPhone;
  }
  for (const [key, fallback] of Object.entries(DESCRIPTOR_FALLBACKS)) {
    if (!vars[key]) vars[key] = fallback;
  }

  return vars;
}

/**
 * Last line of defence: no `{{placeholder}}` may ever reach the caller's ear.
 * Anything still unresolved is dropped and the surrounding punctuation and
 * whitespace tidied, so the sentence still reads cleanly when spoken.
 */
function stripUnresolvedPlaceholders(text: string): string {
  return text
    .replace(/\{\{\s*[\w.]+\s*\}\}/g, "")
    .replace(/\ba\s+,/g, "a,")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.!?;:])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function evaluateFragmentCondition(
  fragment: PromptFragment,
  features: Record<string, boolean>,
): boolean {
  if (!fragment.conditional) return true;
  const { field, operator, value } = fragment.conditional;
  const actual = features[field];

  switch (operator) {
    case "eq":
      return actual === value;
    case "neq":
      return actual !== value;
    case "exists":
      return field in features;
    case "in":
      if (Array.isArray(value)) {
        return value.includes(String(actual));
      }
      return false;
    default:
      return true;
  }
}

function buildSystemPrompt(
  pack: IndustryPack,
  tenant: TenantConfig,
  onboardingAnswers: Record<string, unknown> = {},
): string {
  const vars = buildTemplateVariables(tenant, onboardingAnswers);
  const fragments = pack.promptFragments;

  const activeFragments = fragments.fragments
    .filter((f) => evaluateFragmentCondition(f, tenant.features))
    .sort((a, b) => {
      const roleOrder: Record<string, number> = {
        system: 0,
        context: 1,
        instruction: 2,
        guardrail: 3,
        closing: 4,
      };
      const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
      if (roleDiff !== 0) return roleDiff;
      return b.priority - a.priority;
    });

  const parts: string[] = [
    interpolateTemplate(fragments.systemPreamble, vars),
    // The speaking rules come immediately after "who you are" and before any
    // industry instruction, because they govern HOW every later instruction
    // is delivered out loud.
    VOICE_CONVERSATION_RULES,
    interpolateTemplate(fragments.industryContext, vars),
    ...activeFragments.map((f) => interpolateTemplate(f.content, vars)),
    interpolateTemplate(fragments.closingInstructions, vars),
  ];

  return stripUnresolvedPlaceholders(parts.filter(Boolean).join("\n\n"));
}

function mergeVoiceConfig(
  defaults: VoiceConfig,
  overrides?: Partial<VoiceConfig>,
): VoiceConfig {
  if (!overrides) return { ...defaults };
  return { ...defaults, ...overrides };
}

function mergeCallConfig(
  defaults: CallConfig,
  overrides?: Partial<CallConfig>,
): CallConfig {
  if (!overrides) return { ...defaults };
  return { ...defaults, ...overrides };
}

function filterIntentsByFeatures(
  intents: IntentDefinition[],
  features: Record<string, boolean>,
): IntentDefinition[] {
  return intents.filter((intent) => {
    const featureKey = `intent_${intent.id}`;
    if (featureKey in features) {
      return features[featureKey];
    }
    const categoryKey = `category_${intent.category}`;
    if (categoryKey in features) {
      return features[categoryKey];
    }
    return true;
  });
}

function filterToolsByIntents(
  tools: ToolBinding[],
  activeIntentIds: Set<string>,
): ToolBinding[] {
  return tools.filter((tool) =>
    tool.intentIds.some((id) => activeIntentIds.has(id)),
  );
}

function filterPoliciesByIntents(
  policies: PolicyDefinition[],
  activeIntents: IntentDefinition[],
): PolicyDefinition[] {
  const requiredPolicyIds = new Set<string>();
  for (const intent of activeIntents) {
    for (const policyId of intent.requiredPolicies) {
      requiredPolicyIds.add(policyId);
    }
  }
  return policies.filter((p) => requiredPolicyIds.has(p.id));
}

function resolveGreeting(
  pack: IndustryPack,
  tenant: TenantConfig,
  onboardingAnswers: Record<string, unknown> = {},
): string {
  const vars = buildTemplateVariables(tenant, onboardingAnswers);
  if (tenant.overrides.greeting) {
    return stripUnresolvedPlaceholders(interpolateTemplate(tenant.overrides.greeting, vars));
  }
  const defaultTemplate = pack.defaults.greetingTemplates[0];
  if (!defaultTemplate) return `Thank you for calling ${tenant.businessName}.`;
  return stripUnresolvedPlaceholders(interpolateTemplate(defaultTemplate.template, vars));
}

// ─── Compiler ─────────────────────────────────────────────────────────────

export function compileAgent(
  tenantConfig: TenantConfig,
  pack: IndustryPack,
  onboardingAnswers: Record<string, unknown>,
): CompiledAgentConfig {
  // 1. Compute deterministic input hash
  const inputPayload = stableStringify({
    tenant: tenantConfig,
    packId: pack.id,
    packVersion: pack.version,
    onboarding: onboardingAnswers,
  });
  const inputHash = deterministicHash(inputPayload);

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(pack, tenantConfig, onboardingAnswers);

  // 3. Merge voice/call config
  const voice = mergeVoiceConfig(pack.defaults.voice, tenantConfig.overrides.voice);
  const call = mergeCallConfig(pack.defaults.call, tenantConfig.overrides.call);

  // 4. Filter intents by features
  const activeIntents = filterIntentsByFeatures(
    pack.intentCatalog,
    tenantConfig.features,
  );

  // 5. Filter tools based on active intents
  const activeIntentIds = new Set(activeIntents.map((i) => i.id));
  const activeTools = filterToolsByIntents(pack.tools, activeIntentIds);

  // 6. Filter policies based on active intents
  const activePolicies = filterPoliciesByIntents(pack.policyPack, activeIntents);

  // 7. Resolve greeting
  const greeting = resolveGreeting(pack, tenantConfig, onboardingAnswers);

  // 8. Deterministic compiledAt from input hash
  const hashNum = parseInt(inputHash, 16);
  const baseTimestamp = 1700000000000;
  const compiledAt = new Date(baseTimestamp + (hashNum % 1000000)).toISOString();

  // 9. Build the compiled config (without final hash)
  const configWithoutHash: Omit<CompiledAgentConfig, "hash"> = {
    inputHash,
    compiledAt,
    tenantId: tenantConfig.tenantId,
    industryId: tenantConfig.industryId,
    systemPrompt,
    voice,
    call,
    activeIntents,
    activeTools,
    activePolicies,
    escalationRules: pack.escalationRules,
    greeting,
    knowledgeConfig: pack.knowledgeSchema,
    analyticsConfig: pack.analyticsDefinition,
  };

  // 10. Compute final output hash from compiled config
  const hash = deterministicHash(stableStringify(configWithoutHash));

  return { hash, ...configWithoutHash };
}

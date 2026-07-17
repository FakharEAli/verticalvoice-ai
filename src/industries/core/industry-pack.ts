import { z } from "zod/v4";

// ─── Industry Identifiers ────────────────────────────────────────────────────

export type IndustryId = "healthcare" | "restaurant" | "real_estate";

// ─── Onboarding Schema ──────────────────────────────────────────────────────

export type OnboardingFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multi_select"
  | "phone"
  | "email"
  | "url"
  | "time"
  | "date"
  | "time_range"
  | "file";

export interface OnboardingFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface OnboardingFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface OnboardingField {
  id: string;
  label: string;
  type: OnboardingFieldType;
  description?: string;
  placeholder?: string;
  options?: OnboardingFieldOption[];
  validation: OnboardingFieldValidation;
  defaultValue?: string | number | boolean | string[];
  dependsOn?: {
    fieldId: string;
    operator: "eq" | "neq" | "in" | "not_in";
    value: string | string[];
  };
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  fields: OnboardingField[];
}

export interface OnboardingSchema {
  steps: OnboardingStep[];
  zodSchema: z.ZodType;
}

// ─── Industry Defaults ──────────────────────────────────────────────────────

export interface VoiceConfig {
  provider: "elevenlabs" | "deepgram" | "openai";
  voiceId: string;
  speed: number;
  pitch: number;
  stability: number;
  language: string;
}

export interface CallConfig {
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
  interruptionThresholdMs: number;
  recordByDefault: boolean;
  transcribeByDefault: boolean;
  maxTransfersPerCall: number;
}

export interface GreetingTemplate {
  id: string;
  label: string;
  template: string;
  variables: string[];
}

export interface IndustryDefaults {
  voice: VoiceConfig;
  call: CallConfig;
  greetingTemplates: GreetingTemplate[];
  timezone: string;
  locale: string;
  currency: string;
}

// ─── Intent Catalog ─────────────────────────────────────────────────────────

export interface SlotDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "time" | "datetime" | "phone" | "email" | "enum";
  required: boolean;
  description: string;
  enumValues?: string[];
  extractionHint?: string;
  confirmationRequired?: boolean;
}

export interface IntentExample {
  text: string;
  slots?: Record<string, string | number | boolean>;
}

export interface IntentDefinition {
  id: string;
  name: string;
  description: string;
  category: "scheduling" | "inquiry" | "transaction" | "support" | "emergency" | "transfer";
  priority: number;
  slots: SlotDefinition[];
  examples: IntentExample[];
  requiredPolicies: string[];
  followUpIntents?: string[];
  maxTurns?: number;
}

// ─── Outcome Schemas ────────────────────────────────────────────────────────

export interface OutcomeFieldDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "time" | "datetime" | "object" | "array";
  required: boolean;
  description: string;
}

export interface OutcomeSchema {
  intentId: string;
  successFields: OutcomeFieldDefinition[];
  failureReasons: string[];
  webhookPayloadSchema?: z.ZodType;
}

// ─── Tool Bindings ──────────────────────────────────────────────────────────

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  schema?: z.ZodType;
}

export interface ToolBinding {
  id: string;
  name: string;
  description: string;
  intentIds: string[];
  parameters: ToolParameter[];
  returnType: string;
  requiresAuth: boolean;
  rateLimit?: {
    maxCalls: number;
    windowSeconds: number;
  };
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}

// ─── Knowledge Schema ───────────────────────────────────────────────────────

export interface KnowledgeFieldDefinition {
  name: string;
  type: "text" | "structured" | "faq" | "table";
  description: string;
  required: boolean;
  maxTokens?: number;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  fields: KnowledgeFieldDefinition[];
}

export interface KnowledgeSchema {
  categories: KnowledgeCategory[];
  maxTotalTokens: number;
  embeddingModel: string;
  chunkStrategy: "paragraph" | "sentence" | "fixed_size";
  chunkOverlap: number;
}

// ─── Policy Definitions ─────────────────────────────────────────────────────

export type PolicySeverity = "block" | "warn" | "log";

export interface PolicyCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "exists" | "not_exists" | "matches";
  value: string | number | boolean | string[];
}

export interface PolicyDefinition {
  id: string;
  name: string;
  description: string;
  category: "compliance" | "safety" | "privacy" | "business" | "operational";
  severity: PolicySeverity;
  conditions: PolicyCondition[];
  action: "allow" | "deny" | "escalate" | "modify";
  reason: string;
  regulation?: string;
  overridable: boolean;
}

// ─── Escalation Rules ───────────────────────────────────────────────────────

export type EscalationTrigger =
  | "keyword_detected"
  | "sentiment_negative"
  | "max_turns_exceeded"
  | "policy_violation"
  | "caller_request"
  | "emergency_detected"
  | "confidence_low"
  | "slot_collection_failed";

export interface EscalationRule {
  id: string;
  name: string;
  trigger: EscalationTrigger;
  triggerConfig: Record<string, string | number | boolean | string[]>;
  priority: number;
  action: "transfer_human" | "transfer_department" | "end_call" | "send_notification" | "log_alert";
  department?: string;
  message?: string;
  cooldownSeconds?: number;
}

// ─── Analytics Definition ───────────────────────────────────────────────────

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: "counter" | "gauge" | "histogram" | "rate";
  unit: string;
  aggregation: "sum" | "avg" | "min" | "max" | "count" | "p50" | "p95" | "p99";
}

export interface AnalyticsDefinition {
  metrics: MetricDefinition[];
  dimensions: string[];
  retentionDays: number;
  sampleRate: number;
}

// ─── Dashboard Module Definitions ───────────────────────────────────────────

export type WidgetType =
  | "stat_card"
  | "line_chart"
  | "bar_chart"
  | "pie_chart"
  | "table"
  | "heatmap"
  | "funnel"
  | "list";

export interface WidgetDefinition {
  id: string;
  type: WidgetType;
  title: string;
  metricIds: string[];
  dimensions?: string[];
  span: { cols: number; rows: number };
}

export interface DashboardModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  widgets: WidgetDefinition[];
}

// ─── Evaluation Suite ───────────────────────────────────────────────────────

export type EvaluationDimension =
  | "intent_accuracy"
  | "slot_capture"
  | "tool_correctness"
  | "policy_compliance"
  | "safety"
  | "hallucination"
  | "tone"
  | "latency"
  | "task_completion"
  | "escalation_accuracy";

export interface EvaluationTurn {
  role: "caller" | "agent";
  text: string;
  expectedIntent?: string;
  expectedSlots?: Record<string, string | number | boolean>;
  expectedToolCall?: string;
  expectedPolicyCheck?: string;
}

export interface EvaluationAssertion {
  dimension: EvaluationDimension;
  check: "equals" | "contains" | "not_contains" | "gt" | "lt" | "matches";
  target: string;
  value: string | number;
  weight: number;
}

export interface EvaluationScenario {
  id: string;
  name: string;
  description: string;
  intentId: string;
  tags: string[];
  turns: EvaluationTurn[];
  assertions: EvaluationAssertion[];
  expectedOutcome: "success" | "escalation" | "failure";
}

// ─── Demo Fixtures ──────────────────────────────────────────────────────────

export interface DemoCallerProfile {
  id: string;
  name: string;
  phone: string;
  persona: string;
  history?: Record<string, string | number | boolean>[];
}

export interface DemoBusinessProfile {
  name: string;
  phone: string;
  address: string;
  timezone: string;
  data: Record<string, unknown>;
}

export interface DemoConversation {
  id: string;
  title: string;
  description: string;
  callerId: string;
  intentFlow: string[];
  turns: EvaluationTurn[];
}

export interface DemoFixtureSet {
  business: DemoBusinessProfile;
  callers: DemoCallerProfile[];
  conversations: DemoConversation[];
  knowledgeBase: Record<string, unknown>;
}

// ─── Prompt Fragments ───────────────────────────────────────────────────────

export interface PromptFragment {
  id: string;
  role: "system" | "context" | "instruction" | "guardrail" | "closing";
  content: string;
  priority: number;
  conditional?: {
    field: string;
    operator: "eq" | "neq" | "in" | "exists";
    value: string | string[] | boolean;
  };
}

export interface PromptFragmentSet {
  systemPreamble: string;
  industryContext: string;
  fragments: PromptFragment[];
  closingInstructions: string;
  maxPromptTokens: number;
}

// ─── Outbound Call Types ────────────────────────────────────────────────────
// The inbound intent catalog above describes what the agent handles when a
// caller reaches out. Outbound call types describe the reverse: calls the
// business's agent places on its own initiative — reminders, confirmations,
// alerts, and outreach — each with its own scripted purpose and required
// context rather than open-ended intent handling.

export type OutboundCallCategory = "reminder" | "confirmation" | "alert" | "outreach" | "campaign";

export interface OutboundCallVariable {
  name: string;
  label: string;
  type: "string" | "number" | "date" | "time" | "phone" | "currency";
  required: boolean;
  description: string;
}

export interface OutboundCallTypeDefinition {
  id: string;
  name: string;
  description: string;
  category: OutboundCallCategory;
  /** System-prompt template with {{variableName}} placeholders, filled from `variables` at call time. */
  promptTemplate: string;
  variables: OutboundCallVariable[];
  /** Marketing/promotional calls typically require prior opt-in; reminders/confirmations about an existing transaction don't. */
  requiresConsent: boolean;
  maxAttempts?: number;
}

// ─── The IndustryPack Interface ─────────────────────────────────────────────

export interface IndustryPack {
  id: IndustryId;
  version: string;
  displayName: string;
  description: string;
  onboardingSchema: OnboardingSchema;
  defaults: IndustryDefaults;
  intentCatalog: IntentDefinition[];
  outcomeSchemas: OutcomeSchema[];
  tools: ToolBinding[];
  knowledgeSchema: KnowledgeSchema;
  policyPack: PolicyDefinition[];
  escalationRules: EscalationRule[];
  analyticsDefinition: AnalyticsDefinition;
  dashboardModules: DashboardModuleDefinition[];
  evaluationSuite: EvaluationScenario[];
  demoFixtures: DemoFixtureSet;
  promptFragments: PromptFragmentSet;
  outboundCallTypes: OutboundCallTypeDefinition[];
}

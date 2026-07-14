-- VerticalVoice AI — Foundation Schema
-- Phase 1: Identity, tenancy, configuration, and shared infrastructure

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. IDENTITY & TENANCY
-- =============================================================================

create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  industry text not null check (industry in ('healthcare', 'restaurant', 'real_estate')),
  plan text not null default 'free' check (plan in ('free', 'starter', 'professional', 'enterprise')),
  status text not null default 'onboarding' check (status in ('onboarding', 'active', 'suspended', 'cancelled')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

create table public.locations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  country text not null default 'US',
  timezone text not null default 'America/New_York',
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references public.users(id),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 2. CONFIGURATION
-- =============================================================================

create table public.business_profiles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade unique,
  business_name text not null,
  website_url text,
  country text not null default 'US',
  timezone text not null default 'America/New_York',
  main_phone text,
  address text,
  primary_contact_name text,
  contact_email text,
  preferred_language text not null default 'en',
  secondary_language text,
  num_locations integer not null default 1,
  business_size text check (business_size in ('solo', 'small', 'medium', 'large')),
  industry_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_config_versions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'compiled', 'testing', 'active', 'archived')),
  industry_pack_id text not null,
  industry_pack_version text not null,
  onboarding_answers jsonb not null default '{}',
  compiled_config jsonb,
  input_hash text,
  output_hash text,
  compiler_version text,
  compiled_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, version)
);

create table public.voice_profiles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade unique,
  voice_id text not null default 'default',
  tone text not null default 'professional' check (tone in ('warm', 'professional', 'energetic', 'calm')),
  speaking_pace text not null default 'natural' check (speaking_pace in ('slower', 'natural', 'faster')),
  greeting_style text not null default 'friendly' check (greeting_style in ('formal', 'friendly', 'minimal')),
  ai_disclosure_required boolean not null default true,
  ai_disclosure_text text,
  human_transfer_number text,
  after_hours_behavior text not null default 'voicemail' check (after_hours_behavior in ('voicemail', 'message', 'transfer', 'inform')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operating_hours (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.holiday_hours (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  date date not null,
  name text not null,
  is_closed boolean not null default true,
  open_time time,
  close_time time,
  created_at timestamptz not null default now()
);

create table public.escalation_rules (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  trigger_type text not null,
  priority integer not null default 0,
  action text not null check (action in ('transfer', 'message', 'callback', 'alert')),
  target text,
  conditions jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.policy_settings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade unique,
  recording_enabled boolean not null default false,
  recording_consent_mode text not null default 'one_party' check (recording_consent_mode in ('one_party', 'two_party', 'none')),
  transcript_retention_days integer not null default 90,
  outbound_enabled boolean not null default false,
  outbound_consent_required boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  max_call_duration_seconds integer not null default 900,
  max_concurrent_calls integer not null default 1,
  monthly_minute_cap integer,
  daily_outbound_cap integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- 3. KNOWLEDGE
-- =============================================================================

create table public.knowledge_sources (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('website', 'document', 'manual', 'api', 'extraction')),
  url text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed', 'stale')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_facts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete set null,
  category text not null,
  key text not null,
  value text not null,
  confidence numeric(3,2) not null default 1.0,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete set null,
  title text not null,
  content text not null,
  content_type text not null default 'text',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- 4. INTEGRATIONS
-- =============================================================================

create table public.integration_connections (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  connection_type text not null check (connection_type in ('calendar', 'pos', 'crm', 'ehr', 'reservation', 'messaging', 'webhook')),
  status text not null default 'pending' check (status in ('pending', 'connected', 'error', 'disconnected')),
  config jsonb not null default '{}',
  last_health_check timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- 5. TELEPHONY & VOICE
-- =============================================================================

create table public.phone_numbers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number text not null unique,
  provider text not null check (provider in ('twilio', 'telnyx', 'plivo')),
  provider_sid text,
  capabilities text[] not null default '{"voice"}',
  status text not null default 'provisioning' check (status in ('provisioning', 'active', 'suspended', 'released')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_call_id text,
  phone_number_id uuid references public.phone_numbers(id),
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'ringing' check (status in ('ringing', 'in_progress', 'completed', 'failed', 'missed', 'transferred')),
  caller_number text,
  caller_name text,
  duration_seconds integer,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  agent_config_version_id uuid references public.agent_config_versions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.call_transcripts (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  messages jsonb not null default '[]',
  full_text text,
  created_at timestamptz not null default now()
);

create table public.call_summaries (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  summary text not null,
  key_points text[] not null default '{}',
  action_items text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.call_outcomes (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  primary_intent text not null,
  secondary_intents text[] not null default '{}',
  resolution text not null check (resolution in ('resolved', 'transferred', 'callback', 'voicemail', 'abandoned', 'failed')),
  captured_fields jsonb not null default '{}',
  tools_used text[] not null default '{}',
  policy_events jsonb not null default '[]',
  evaluation_score numeric(3,2),
  created_at timestamptz not null default now()
);

create table public.call_recordings (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  storage_path text not null,
  duration_seconds integer,
  consent_obtained boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- =============================================================================
-- 6. CONSENT
-- =============================================================================

create table public.consent_records (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone_number text not null,
  consent_type text not null check (consent_type in ('recording', 'outbound', 'sms', 'email')),
  status text not null default 'granted' check (status in ('granted', 'revoked', 'expired')),
  source text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.suppression_entries (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone_number text not null,
  reason text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique(tenant_id, phone_number)
);

-- =============================================================================
-- 7. HEALTHCARE
-- =============================================================================

create table public.healthcare_providers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  title text,
  specialty text,
  is_accepting_new_patients boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_types (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 30,
  description text,
  requires_referral boolean not null default false,
  new_patient_eligible boolean not null default true,
  preparation_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  provider_id uuid references public.healthcare_providers(id),
  appointment_type_id uuid references public.appointment_types(id),
  location_id uuid references public.locations(id),
  patient_name text not null,
  patient_phone text,
  patient_email text,
  patient_dob date,
  is_new_patient boolean not null default false,
  scheduled_at timestamptz not null,
  duration_minutes integer not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  notes text,
  confirmation_sent boolean not null default false,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waitlist_entries (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_name text not null,
  patient_phone text not null,
  appointment_type_id uuid references public.appointment_types(id),
  provider_id uuid references public.healthcare_providers(id),
  preferred_dates text[],
  priority integer not null default 0,
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'booked', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refill_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  patient_name text not null,
  patient_phone text,
  medication_name text not null,
  pharmacy text,
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'sent_to_provider', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- 8. RESTAURANT
-- =============================================================================

create table public.restaurant_menus (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null default 'Main Menu',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  menu_id uuid not null references public.restaurant_menus(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  sizes jsonb,
  is_available boolean not null default true,
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  preparation_time_minutes integer,
  calories integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_modifier_groups (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  min_selections integer not null default 0,
  max_selections integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.menu_modifiers (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.menu_modifier_groups(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  price_adjustment numeric(10,2) not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  location_id uuid references public.locations(id),
  guest_name text not null,
  guest_phone text,
  guest_email text,
  party_size integer not null,
  reserved_at timestamptz not null,
  duration_minutes integer not null default 90,
  seating_preference text,
  special_requests text,
  status text not null default 'confirmed' check (status in ('confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  location_id uuid references public.locations(id),
  customer_name text not null,
  customer_phone text,
  order_type text not null check (order_type in ('pickup', 'delivery', 'dine_in')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  estimated_ready_minutes integer,
  delivery_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  modifiers jsonb not null default '[]',
  special_instructions text,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 9. REAL ESTATE
-- =============================================================================

create table public.re_agents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id),
  name text not null,
  email text,
  phone text,
  specialties text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_id uuid references public.re_agents(id),
  address text not null,
  city text,
  state text,
  zip text,
  property_type text not null check (property_type in ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial')),
  listing_type text not null check (listing_type in ('sale', 'rent')),
  price numeric(12,2),
  bedrooms integer,
  bathrooms numeric(3,1),
  square_feet integer,
  description text,
  status text not null default 'active' check (status in ('active', 'pending', 'sold', 'withdrawn', 'expired')),
  amenities text[] not null default '{}',
  pet_policy text,
  parking text,
  hoa_fee numeric(10,2),
  open_house_times jsonb,
  listing_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.real_estate_leads (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  assigned_agent_id uuid references public.re_agents(id),
  lead_type text not null check (lead_type in ('buyer', 'seller', 'tenant', 'landlord', 'general')),
  name text not null,
  phone text,
  email text,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'nurturing', 'closed_won', 'closed_lost')),
  qualification_data jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.showings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  listing_id uuid references public.listings(id),
  lead_id uuid references public.real_estate_leads(id),
  agent_id uuid references public.re_agents(id),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  property_address text not null,
  tenant_name text not null,
  tenant_phone text,
  issue_description text not null,
  is_emergency boolean not null default false,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'emergency')),
  permission_to_enter boolean,
  availability text,
  status text not null default 'open' check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- 10. AUDIT & OPERATIONS
-- =============================================================================

create table public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  flag_name text not null,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, flag_name)
);

create table public.usage_ledger (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_id uuid references public.calls(id),
  usage_type text not null check (usage_type in ('voice_minute', 'sms', 'recording_minute', 'api_call')),
  quantity numeric(10,4) not null,
  unit_cost numeric(10,6),
  provider text,
  created_at timestamptz not null default now()
);

create table public.idempotency_keys (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  response jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

-- =============================================================================
-- 11. INDEXES
-- =============================================================================

create index idx_tenant_members_user on public.tenant_members(user_id);
create index idx_tenant_members_tenant on public.tenant_members(tenant_id);
create index idx_locations_tenant on public.locations(tenant_id);
create index idx_calls_tenant on public.calls(tenant_id);
create index idx_calls_started on public.calls(started_at);
create index idx_calls_status on public.calls(tenant_id, status);
create index idx_appointments_tenant on public.appointments(tenant_id);
create index idx_appointments_scheduled on public.appointments(scheduled_at);
create index idx_reservations_tenant on public.reservations(tenant_id);
create index idx_reservations_time on public.reservations(reserved_at);
create index idx_orders_tenant on public.orders(tenant_id);
create index idx_re_leads_tenant on public.real_estate_leads(tenant_id);
create index idx_showings_tenant on public.showings(tenant_id);
create index idx_audit_events_tenant on public.audit_events(tenant_id);
create index idx_audit_events_created on public.audit_events(created_at);
create index idx_knowledge_facts_tenant on public.knowledge_facts(tenant_id);
create index idx_usage_ledger_tenant on public.usage_ledger(tenant_id);
create index idx_consent_records_phone on public.consent_records(tenant_id, phone_number);
create index idx_idempotency_keys_expires on public.idempotency_keys(expires_at);

-- =============================================================================
-- 12. ROW LEVEL SECURITY
-- =============================================================================

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_members enable row level security;
alter table public.locations enable row level security;
alter table public.invitations enable row level security;
alter table public.business_profiles enable row level security;
alter table public.agent_config_versions enable row level security;
alter table public.voice_profiles enable row level security;
alter table public.operating_hours enable row level security;
alter table public.holiday_hours enable row level security;
alter table public.escalation_rules enable row level security;
alter table public.policy_settings enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_facts enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.integration_connections enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.calls enable row level security;
alter table public.call_transcripts enable row level security;
alter table public.call_summaries enable row level security;
alter table public.call_outcomes enable row level security;
alter table public.call_recordings enable row level security;
alter table public.consent_records enable row level security;
alter table public.suppression_entries enable row level security;
alter table public.healthcare_providers enable row level security;
alter table public.appointment_types enable row level security;
alter table public.appointments enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.refill_requests enable row level security;
alter table public.restaurant_menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_modifier_groups enable row level security;
alter table public.menu_modifiers enable row level security;
alter table public.reservations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.re_agents enable row level security;
alter table public.listings enable row level security;
alter table public.real_estate_leads enable row level security;
alter table public.showings enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.audit_events enable row level security;
alter table public.feature_flags enable row level security;
alter table public.usage_ledger enable row level security;

-- Helper: get tenant IDs the current user belongs to
create or replace function public.get_user_tenant_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid()
$$;

-- Users table
create policy "Users can view own profile" on public.users for select using (id = auth.uid());
create policy "Users can update own profile" on public.users for update using (id = auth.uid());
create policy "Users can insert own profile" on public.users for insert with check (id = auth.uid());

-- Tenants
create policy "Members can view tenants" on public.tenants for select using (id in (select public.get_user_tenant_ids()));
create policy "Admins can update tenants" on public.tenants for update using (
  id in (select tenant_id from public.tenant_members where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- Tenant members
create policy "Members can view team" on public.tenant_members for select using (tenant_id in (select public.get_user_tenant_ids()));
create policy "Admins can manage members" on public.tenant_members for all using (
  tenant_id in (select tenant_id from public.tenant_members where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- Generic tenant-scoped policies for all other tables
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'locations', 'invitations', 'business_profiles', 'agent_config_versions',
      'voice_profiles', 'operating_hours', 'holiday_hours', 'escalation_rules',
      'policy_settings', 'knowledge_sources', 'knowledge_facts', 'knowledge_documents',
      'integration_connections', 'phone_numbers', 'calls', 'call_transcripts',
      'call_summaries', 'call_outcomes', 'call_recordings', 'consent_records',
      'suppression_entries', 'healthcare_providers', 'appointment_types', 'appointments',
      'waitlist_entries', 'refill_requests', 'restaurant_menus', 'menu_categories',
      'menu_items', 'menu_modifier_groups', 'menu_modifiers', 'reservations',
      'orders', 'order_items', 're_agents', 'listings', 'real_estate_leads',
      'showings', 'maintenance_requests', 'audit_events', 'feature_flags', 'usage_ledger'
    ])
  loop
    execute format(
      'create policy "Tenant isolation read" on public.%I for select using (tenant_id in (select public.get_user_tenant_ids()))',
      tbl
    );
    execute format(
      'create policy "Tenant isolation write" on public.%I for insert with check (tenant_id in (select public.get_user_tenant_ids()))',
      tbl
    );
    execute format(
      'create policy "Tenant isolation update" on public.%I for update using (tenant_id in (select public.get_user_tenant_ids()))',
      tbl
    );
    execute format(
      'create policy "Tenant isolation delete" on public.%I for delete using (tenant_id in (select public.get_user_tenant_ids()))',
      tbl
    );
  end loop;
end $$;

-- =============================================================================
-- 13. TRIGGERS: auto-update updated_at
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'tenants', 'users', 'tenant_members', 'locations', 'business_profiles',
      'agent_config_versions', 'voice_profiles', 'escalation_rules', 'policy_settings',
      'knowledge_sources', 'knowledge_facts', 'knowledge_documents', 'integration_connections',
      'phone_numbers', 'calls', 'healthcare_providers', 'appointment_types', 'appointments',
      'waitlist_entries', 'refill_requests', 'restaurant_menus', 'menu_items',
      'reservations', 'orders', 're_agents', 'listings', 'real_estate_leads',
      'showings', 'maintenance_requests', 'feature_flags'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.handle_updated_at()',
      tbl
    );
  end loop;
end $$;

-- =============================================================================
-- 14. AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

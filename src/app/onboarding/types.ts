export type Industry = 'healthcare' | 'restaurant' | 'real_estate';

export interface OnboardingData {
  // Step 1
  industry: Industry | null;

  // Step 2
  businessName: string;
  websiteUrl: string;
  country: string;
  timezone: string;
  mainPhone: string;
  businessAddress: string;
  contactName: string;
  contactEmail: string;
  preferredLanguage: string;
  secondaryLanguage: string;
  numberOfLocations: number;
  businessSize: string;

  // Step 3 - Smart import
  smartImportUrl: string;
  importedData: Record<
    string,
    {
      value: string;
      source: string;
      confidence: number;
      needsReview: boolean;
    }
  >;

  // Step 4 - Industry-specific (dynamic)
  industryConfig: Record<string, unknown>;

  // Step 5 - Agent personality
  voiceId: string;
  tone: 'warm' | 'professional' | 'energetic' | 'calm';
  speakingPace: 'slower' | 'natural' | 'faster';
  greetingStyle: 'formal' | 'friendly' | 'minimal';
  aiDisclosure: boolean;
  transferNumber: string;
  afterHoursBehavior: string;

  // Step 4 - Tools (per-industry). Holds the ids of pack tools the operator
  // turned OFF; everything not listed stays enabled (the pack default).
  disabledToolIds: string[];

  // Phone number for the agent. 'demo' provisions a working fictional number at
  // finalize so the test call works immediately; 'buy' purchases the chosen
  // real Twilio number after the tenant exists.
  phoneProvisionMode: 'demo' | 'buy';
  phoneNumberToBuy: string;

  // Step 6 - Integration
  integration: string | null;
  integrationConfig: Record<string, unknown>;

  // Step 7 - Review (read-only, no data)

  // Step 8 - Preflight results
  preflightPassed: boolean;
  preflightResults: Array<{
    check: string;
    passed: boolean;
    message: string;
  }>;

  // Step 9 - Test call
  testCallCompleted: boolean;

  // Step 10 - Activation
  activationChecklist: Record<string, boolean>;
}

export interface StepProps {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export interface StepMeta {
  title: string;
  subtitle: string;
  skippable: boolean;
  validate: (data: OnboardingData) => boolean;
}

export const initialOnboardingData: OnboardingData = {
  industry: null,
  businessName: '',
  websiteUrl: '',
  country: '',
  timezone: '',
  mainPhone: '',
  businessAddress: '',
  contactName: '',
  contactEmail: '',
  preferredLanguage: 'en',
  secondaryLanguage: '',
  numberOfLocations: 1,
  businessSize: '',
  smartImportUrl: '',
  importedData: {},
  industryConfig: {},
  voiceId: '',
  disabledToolIds: [],
  phoneProvisionMode: 'demo',
  phoneNumberToBuy: '',
  tone: 'professional',
  speakingPace: 'natural',
  greetingStyle: 'friendly',
  aiDisclosure: true,
  transferNumber: '',
  afterHoursBehavior: 'voicemail',
  integration: null,
  integrationConfig: {},
  preflightPassed: false,
  preflightResults: [],
  testCallCompleted: false,
  activationChecklist: {},
};

export const stepsMeta: StepMeta[] = [
  {
    title: 'Choose Your Industry',
    subtitle: 'Select the vertical your business operates in',
    skippable: false,
    validate: (d) => d.industry !== null,
  },
  {
    title: 'Business Details',
    subtitle: 'Tell us about your business',
    skippable: false,
    validate: (d) =>
      d.businessName.trim().length > 0 &&
      d.contactName.trim().length > 0 &&
      d.contactEmail.trim().length > 0,
  },
  {
    title: 'Smart Import',
    subtitle: 'Import existing data from your website or files',
    skippable: true,
    validate: () => true,
  },
  {
    title: 'Industry Configuration',
    subtitle: 'Set up industry-specific settings',
    skippable: false,
    validate: () => true,
  },
  {
    title: 'Agent Personality',
    subtitle: 'Define how your AI agent sounds and behaves',
    skippable: false,
    validate: (d) => d.voiceId.length > 0,
  },
  {
    title: 'Integrations',
    subtitle: 'Connect your existing tools',
    skippable: true,
    validate: () => true,
  },
  {
    title: 'Phone Number',
    subtitle: 'Choose the number your agent will use for calls',
    skippable: false,
    // A demo number is always provisioned at finalize, so this can't be blocked.
    validate: () => true,
  },
  {
    title: 'Review Configuration',
    subtitle: 'Review everything before going live',
    skippable: false,
    validate: () => true,
  },
  {
    title: 'Preflight Check',
    subtitle: 'Verify your setup is ready',
    skippable: false,
    validate: (d) => d.preflightPassed,
  },
  {
    title: 'Test Your Agent',
    subtitle: 'Make a test call to hear your agent in action',
    skippable: true,
    validate: () => true,
  },
  {
    title: 'Go Live',
    subtitle: 'Activate your AI agent',
    skippable: false,
    validate: () => true,
  },
];

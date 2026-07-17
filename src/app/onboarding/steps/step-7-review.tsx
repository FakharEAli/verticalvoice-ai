'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Pencil } from 'lucide-react';
import type { StepProps } from '../types';

const businessSizeLabels: Record<string, string> = {
  solo: 'Solo (1 person)',
  small: 'Small (2-10)',
  medium: 'Medium (11-50)',
  large: 'Large (51-200)',
  enterprise: 'Enterprise (200+)',
};

const voiceLabels: Record<string, string> = {
  sophia: 'Sophia',
  james: 'James',
  luna: 'Luna',
  marcus: 'Marcus',
  aria: 'Aria',
  noah: 'Noah',
};

const afterHoursLabels: Record<string, string> = {
  voicemail: 'Take a voicemail',
  transfer: 'Transfer to on-call',
  schedule: 'Offer to schedule callback',
  info_only: 'Provide info only',
};

const integrationLabels: Record<string, string> = {
  google_calendar: 'Google Calendar',
  twilio: 'Twilio',
  salesforce: 'Salesforce CRM',
  hubspot: 'HubSpot',
  slack: 'Slack',
  stripe: 'Stripe',
  ehr: 'EHR / Practice Management',
  opentable: 'OpenTable',
  mls: 'MLS Integration',
};

// A handful of Step 4 (industry config) fields store a short coded value
// (e.g. "30", "24h", "15min") whose human label lives only in that step's
// Select options. Map the known ones here so the review step doesn't show
// raw codes for these specific keys.
const configValueLabels: Record<string, Record<string, string>> = {
  appointmentDuration: {
    '15': '15 minutes',
    '20': '20 minutes',
    '30': '30 minutes',
    '45': '45 minutes',
    '60': '60 minutes',
    '90': '90 minutes',
  },
  bookingLeadTime: {
    '1h': '1 hour',
    '4h': '4 hours',
    '24h': '24 hours',
    '48h': '48 hours',
    '72h': '72 hours',
  },
  leadResponseTime: {
    '5min': '5 minutes',
    '15min': '15 minutes',
    '30min': '30 minutes',
    '1h': '1 hour',
    '4h': '4 hours',
  },
};

function formatBusinessSize(size: string): string {
  if (!size) return size;
  return businessSizeLabels[size] ?? size;
}

function formatTimezone(tz: string): string {
  if (!tz) return tz;
  return tz.replace(/_/g, ' ');
}

function formatVoice(voiceId: string): string {
  if (!voiceId) return 'Not selected';
  return voiceLabels[voiceId] ?? voiceId;
}

function formatAfterHours(value: string): string {
  if (!value) return value;
  return afterHoursLabels[value] ?? value;
}

function formatIntegration(id: string | null): string {
  if (!id) return 'None (demo mode)';
  return integrationLabels[id] ?? id;
}

function formatConfigValue(key: string, val: unknown): string {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return (val as string[]).join(', ');
  const str = String(val ?? '');
  return configValueLabels[key]?.[str] ?? str;
}

interface ReviewSectionProps {
  title: string;
  step: number;
  items: { label: string; value: string; warning?: boolean }[];
  onEdit: (step: number) => void;
}

function ReviewSection({ title, step, items, onEdit }: ReviewSectionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => onEdit(step)}>
          <Pencil className="mr-1 size-3" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="text-right font-medium">
                {item.value || (
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertTriangle className="size-3" />
                    Not set
                  </span>
                )}
                {item.warning && item.value && (
                  <Badge variant="outline" className="ml-2 text-xs text-amber-500">
                    Review recommended
                  </Badge>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function Step7Review({
  data,
  onJumpToStep,
}: StepProps & { onJumpToStep?: (step: number) => void }) {
  const jumpTo = onJumpToStep ?? (() => {});

  const industryLabel =
    data.industry === 'healthcare'
      ? 'Healthcare'
      : data.industry === 'restaurant'
        ? 'Restaurant'
        : data.industry === 'real_estate'
          ? 'Real Estate'
          : 'Not selected';

  const toneLabel = data.tone.charAt(0).toUpperCase() + data.tone.slice(1);
  const paceLabel =
    data.speakingPace.charAt(0).toUpperCase() + data.speakingPace.slice(1);
  const greetLabel =
    data.greetingStyle.charAt(0).toUpperCase() + data.greetingStyle.slice(1);

  return (
    <div className="space-y-6">
      <ReviewSection
        title="Business Information"
        step={1}
        onEdit={jumpTo}
        items={[
          { label: 'Industry', value: industryLabel },
          { label: 'Business Name', value: data.businessName },
          { label: 'Website', value: data.websiteUrl },
          { label: 'Phone', value: data.mainPhone },
          { label: 'Address', value: data.businessAddress },
          { label: 'Country', value: data.country },
          { label: 'Timezone', value: formatTimezone(data.timezone) },
          { label: 'Contact', value: data.contactName },
          { label: 'Email', value: data.contactEmail },
          { label: 'Business Size', value: formatBusinessSize(data.businessSize) },
          {
            label: 'Locations',
            value: String(data.numberOfLocations),
          },
        ]}
      />

      <ReviewSection
        title="Industry Configuration"
        step={3}
        onEdit={jumpTo}
        items={Object.entries(data.industryConfig).map(([key, val]) => ({
          label: key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase()),
          value: formatConfigValue(key, val),
        }))}
      />

      <ReviewSection
        title="Agent Personality"
        step={4}
        onEdit={jumpTo}
        items={[
          { label: 'Voice', value: formatVoice(data.voiceId) },
          { label: 'Tone', value: toneLabel },
          { label: 'Speaking Pace', value: paceLabel },
          { label: 'Greeting Style', value: greetLabel },
          {
            label: 'AI Disclosure',
            value: data.aiDisclosure ? 'Enabled' : 'Disabled',
          },
          { label: 'Transfer Number', value: data.transferNumber },
          { label: 'After Hours', value: formatAfterHours(data.afterHoursBehavior) },
        ]}
      />

      <ReviewSection
        title="Integrations"
        step={5}
        onEdit={jumpTo}
        items={[
          {
            label: 'Connected Integration',
            value: formatIntegration(data.integration),
          },
        ]}
      />

      <Separator />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Review your configuration
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Make sure everything looks correct before proceeding to the
              preflight check. You can click &quot;Edit&quot; on any section to
              go back and make changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          { label: 'Timezone', value: data.timezone },
          { label: 'Contact', value: data.contactName },
          { label: 'Email', value: data.contactEmail },
          { label: 'Business Size', value: data.businessSize },
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
          value: Array.isArray(val)
            ? (val as string[]).join(', ')
            : String(val ?? ''),
        }))}
      />

      <ReviewSection
        title="Agent Personality"
        step={4}
        onEdit={jumpTo}
        items={[
          { label: 'Voice', value: data.voiceId || 'Not selected' },
          { label: 'Tone', value: toneLabel },
          { label: 'Speaking Pace', value: paceLabel },
          { label: 'Greeting Style', value: greetLabel },
          {
            label: 'AI Disclosure',
            value: data.aiDisclosure ? 'Enabled' : 'Disabled',
          },
          { label: 'Transfer Number', value: data.transferNumber },
          { label: 'After Hours', value: data.afterHoursBehavior },
        ]}
      />

      <ReviewSection
        title="Integrations"
        step={5}
        onEdit={jumpTo}
        items={[
          {
            label: 'Connected Integration',
            value: data.integration ?? 'None (demo mode)',
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

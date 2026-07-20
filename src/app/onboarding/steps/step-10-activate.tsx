'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveCallOrb } from '@/components/shared/live-call-orb';
import type { StepProps } from '../types';

const checklistItems = [
  {
    id: 'review_config',
    label: 'I have reviewed my agent configuration',
    description: 'All settings have been checked and are correct',
  },
  {
    id: 'test_complete',
    label: 'I have completed a test call',
    description: 'The test call results were satisfactory',
  },
  {
    id: 'phone_ready',
    label: 'Phone number is ready to receive calls',
    description: 'The phone line is active and connected',
  },
  {
    id: 'team_notified',
    label: 'My team has been notified',
    description: 'Staff knows an AI agent will be handling calls',
  },
  {
    id: 'terms_accepted',
    label: 'I accept the terms of service',
    description: 'I have read and agree to the service terms',
  },
];

export function Step10Activate({ data, updateData }: StepProps) {
  const router = useRouter();
  const [activated, setActivated] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklist = data.activationChecklist;
  const allChecked = checklistItems.every((item) => checklist[item.id]);

  const toggleItem = (id: string) => {
    updateData({
      activationChecklist: {
        ...checklist,
        [id]: !checklist[id],
      },
    });
  };

  const handleActivate = async () => {
    setActivating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/onboarding/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: data.industry,
          businessName: data.businessName,
          websiteUrl: data.websiteUrl,
          country: data.country,
          timezone: data.timezone,
          mainPhone: data.mainPhone,
          businessAddress: data.businessAddress,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          preferredLanguage: data.preferredLanguage,
          secondaryLanguage: data.secondaryLanguage,
          numberOfLocations: data.numberOfLocations,
          businessSize: data.businessSize,
          industryConfig: data.industryConfig,
          voiceId: data.voiceId,
          tone: data.tone,
          speakingPace: data.speakingPace,
          greetingStyle: data.greetingStyle,
          aiDisclosure: data.aiDisclosure,
          transferNumber: data.transferNumber,
          afterHoursBehavior: data.afterHoursBehavior,
          disabledToolIds: data.disabledToolIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate your agent');
      }

      window.localStorage.removeItem('verticalvoice_onboarding_state');
      setActivated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate your agent');
    } finally {
      setActivating(false);
    }
  };

  if (activated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {/* Restrained brass celebration: the equalizer goes live */}
        <LiveCallOrb size="lg" state="live" showTimer={false} className="mb-8" />
        <h2 className="font-display text-4xl leading-tight text-foreground">
          Your agent is live
        </h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          Your AI calling agent is now active and ready to handle calls for{' '}
          {data.businessName || 'your business'}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => router.push('/dashboard/overview')}>
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/calls')}
          >
            View Call Logs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-accent text-brand">
            <Rocket className="size-8" />
          </div>
          <CardTitle className="text-xl">Ready to go live?</CardTitle>
          <CardDescription>
            Complete the checklist below to activate your AI agent.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {checklistItems.map((item) => {
          const checked = Boolean(checklist[item.id]);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-pressed={checked}
              onClick={() => toggleItem(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleItem(item.id);
                }
              }}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                checked
                  ? 'border-success/40 bg-success/10'
                  : 'hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleItem(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  {checked && (
                    <CheckCircle2 className="size-4 text-success" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          disabled={!allChecked || activating}
          onClick={handleActivate}
          className="px-12"
        >
          {activating ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Rocket className="mr-2 size-4" />
          )}
          {activating ? 'Activating...' : 'Activate Agent'}
        </Button>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </div>

      {!allChecked && !error && (
        <p className="text-center text-xs text-muted-foreground">
          Complete all checklist items to activate your agent
        </p>
      )}
    </div>
  );
}

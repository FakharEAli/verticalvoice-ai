'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Rocket, CheckCircle2, PartyPopper } from 'lucide-react';
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
  const [activated, setActivated] = useState(false);

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

  const handleActivate = () => {
    setActivated(true);
  };

  if (activated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <PartyPopper className="size-12 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold">Your Agent is Live!</h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          Congratulations! Your AI calling agent is now active and ready to
          handle calls for {data.businessName || 'your business'}.
        </p>
        <div className="mt-8 flex gap-3">
          <Button size="lg">Go to Dashboard</Button>
          <Button variant="outline" size="lg">
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
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-muted">
            <Rocket className="size-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Ready to Go Live?</CardTitle>
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
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                checked
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => toggleItem(item.id)}
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
                    <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
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

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!allChecked}
          onClick={handleActivate}
          className="px-12"
        >
          <Rocket className="mr-2 size-4" />
          Activate Agent
        </Button>
      </div>

      {!allChecked && (
        <p className="text-center text-xs text-muted-foreground">
          Complete all checklist items to activate your agent
        </p>
      )}
    </div>
  );
}

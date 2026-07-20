'use client';

import type { CSSProperties } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accentVar } from '../accent';
import type { StepProps } from '../types';

/**
 * The number people call to reach the agent, and the number outbound calls come
 * from. A demo number is provisioned at finalize either way, so the agent can
 * be tested the instant onboarding ends; choosing "real number" simply points
 * the operator at the Phone Numbers page to buy one after setup, where the full
 * Twilio search-and-buy flow lives.
 */
export function StepPhone({ data, updateData }: StepProps) {
  const accent = accentVar(data.industry);
  const selectedStyle: CSSProperties = {
    borderColor: accent,
    backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)`,
    boxShadow: `0 0 0 1px ${accent}`,
  };

  const options: {
    mode: 'demo' | 'buy';
    icon: typeof Phone;
    title: string;
    desc: string;
    tag: string;
  }[] = [
    {
      mode: 'demo',
      icon: Sparkles,
      title: 'Start with a demo number',
      desc: "We'll set up a working number instantly so you can test your agent the moment setup finishes. Perfect for trying everything out.",
      tag: 'Recommended',
    },
    {
      mode: 'buy',
      icon: Phone,
      title: 'Get a real number after setup',
      desc: 'Finish setup with a demo number, then buy a real number by area code from the Phone Numbers page — that is the number real customers will call.',
      tag: 'Do it later',
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your agent needs a phone number — it is what people call to reach it, and
        the number your outbound calls come from. You can start with a demo
        number now and add a real one whenever you are ready.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = data.phoneProvisionMode === opt.mode;
          const Icon = opt.icon;
          return (
            <Card
              key={opt.mode}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => updateData({ phoneProvisionMode: opt.mode })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  updateData({ phoneProvisionMode: opt.mode });
                }
              }}
              className={cn(
                'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
                !selected && 'hover:border-foreground/20'
              )}
              style={selected ? selectedStyle : undefined}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full',
                      !selected && 'bg-muted text-muted-foreground'
                    )}
                    style={
                      selected
                        ? {
                            backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
                            color: accent,
                          }
                        : undefined
                    }
                  >
                    <Icon className="size-5" />
                  </div>
                  {selected ? (
                    <Badge
                      className="gap-1 border-transparent"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                        color: accent,
                      }}
                    >
                      <Check className="size-3" />
                      Selected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {opt.tag}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3 text-base">{opt.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{opt.desc}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        Either way, your agent gets a working number now so you can test it right
        after setup. Manage numbers — add real ones, keep several, set a default —
        anytime from <span className="font-medium text-foreground">Phone Numbers</span> in the dashboard.
      </p>
    </div>
  );
}

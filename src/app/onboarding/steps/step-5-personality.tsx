'use client';

import type { CSSProperties } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { VoicePicker } from '@/components/shared/voice-picker';
import { accentVar } from '../accent';
import type { StepProps } from '../types';

export function Step5Personality({ data, updateData }: StepProps) {
  const isHealthcare = data.industry === 'healthcare';
  const accent = accentVar(data.industry);

  const selectedStyle: CSSProperties = {
    borderColor: accent,
    backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)`,
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Choose a Voice
        </h3>
        <p className="text-sm text-muted-foreground">
          Browse the full voice catalog and press play to hear a real sample.
          The voice you pick is the one your agent will use on calls.
        </p>
        <VoicePicker
          value={data.voiceId ? data.voiceId : null}
          onChange={(id) => updateData({ voiceId: id })}
          accent={accent}
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Tone
        </h3>
        <RadioGroup
          value={data.tone}
          onValueChange={(v) =>
            updateData({
              tone: (v ?? 'professional') as typeof data.tone,
            })
          }
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          {(
            [
              { value: 'warm', label: 'Warm' },
              { value: 'professional', label: 'Professional' },
              { value: 'energetic', label: 'Energetic' },
              { value: 'calm', label: 'Calm' },
            ] as const
          ).map((t) => {
            const on = data.tone === t.value;
            return (
              <label
                key={t.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  !on && 'hover:bg-muted/50'
                )}
                style={on ? selectedStyle : undefined}
              >
                <RadioGroupItem value={t.value} />
                <span className="text-sm font-medium">{t.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Speaking Pace
        </h3>
        <RadioGroup
          value={data.speakingPace}
          onValueChange={(v) =>
            updateData({
              speakingPace: (v ?? 'natural') as typeof data.speakingPace,
            })
          }
          className="grid grid-cols-3 gap-3"
        >
          {(
            [
              { value: 'slower', label: 'Slower' },
              { value: 'natural', label: 'Natural' },
              { value: 'faster', label: 'Faster' },
            ] as const
          ).map((p) => {
            const on = data.speakingPace === p.value;
            return (
              <label
                key={p.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  !on && 'hover:bg-muted/50'
                )}
                style={on ? selectedStyle : undefined}
              >
                <RadioGroupItem value={p.value} />
                <span className="text-sm font-medium">{p.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Greeting Style
        </h3>
        <RadioGroup
          value={data.greetingStyle}
          onValueChange={(v) =>
            updateData({
              greetingStyle: (v ?? 'friendly') as typeof data.greetingStyle,
            })
          }
          className="grid grid-cols-3 gap-3"
        >
          {(
            [
              { value: 'formal', label: 'Formal' },
              { value: 'friendly', label: 'Friendly' },
              { value: 'minimal', label: 'Minimal' },
            ] as const
          ).map((g) => {
            const on = data.greetingStyle === g.value;
            return (
              <label
                key={g.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                  !on && 'hover:bg-muted/50'
                )}
                style={on ? selectedStyle : undefined}
              >
                <RadioGroupItem value={g.value} />
                <span className="text-sm font-medium">{g.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      </section>

      <Separator />

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">AI Disclosure</p>
          <p className="text-xs text-muted-foreground">
            Inform callers they are speaking with an AI agent
            {isHealthcare && ' (required for healthcare)'}
          </p>
        </div>
        <Switch
          checked={data.aiDisclosure}
          onCheckedChange={(v) => updateData({ aiDisclosure: v })}
          disabled={isHealthcare}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transferNumber">Transfer Number</Label>
          <Input
            id="transferNumber"
            value={data.transferNumber}
            onChange={(e) => updateData({ transferNumber: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label>After-Hours Behavior</Label>
          <Select
            value={data.afterHoursBehavior}
            onValueChange={(v) =>
              updateData({ afterHoursBehavior: v ?? 'voicemail' })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                { v: 'voicemail', l: 'Take a voicemail' },
                { v: 'transfer', l: 'Transfer to on-call' },
                { v: 'schedule', l: 'Offer to schedule callback' },
                { v: 'info_only', l: 'Provide info only' },
              ].map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

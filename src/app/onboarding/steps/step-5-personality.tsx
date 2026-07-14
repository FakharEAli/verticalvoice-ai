'use client';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Mic } from 'lucide-react';
import type { StepProps } from '../types';

const voices = [
  {
    id: 'sophia',
    name: 'Sophia',
    desc: 'Warm and conversational, great for patient care',
    tags: ['Female', 'Warm'],
  },
  {
    id: 'james',
    name: 'James',
    desc: 'Confident and professional, ideal for business calls',
    tags: ['Male', 'Professional'],
  },
  {
    id: 'luna',
    name: 'Luna',
    desc: 'Friendly and upbeat, perfect for hospitality',
    tags: ['Female', 'Energetic'],
  },
  {
    id: 'marcus',
    name: 'Marcus',
    desc: 'Calm and reassuring, suitable for sensitive calls',
    tags: ['Male', 'Calm'],
  },
  {
    id: 'aria',
    name: 'Aria',
    desc: 'Polished and articulate, excellent for real estate',
    tags: ['Female', 'Professional'],
  },
  {
    id: 'noah',
    name: 'Noah',
    desc: 'Natural and approachable, versatile for any vertical',
    tags: ['Male', 'Natural'],
  },
];

export function Step5Personality({ data, updateData }: StepProps) {
  const isHealthcare = data.industry === 'healthcare';

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Choose a Voice</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice) => {
            const selected = data.voiceId === voice.id;
            return (
              <Card
                key={voice.id}
                className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                  selected ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => updateData({ voiceId: voice.id })}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-full ${
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Mic className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{voice.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-2">
                    {voice.desc}
                  </CardDescription>
                  <div className="flex gap-1">
                    {voice.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Tone</h3>
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
          ).map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                data.tone === t.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value={t.value} />
              <span className="text-sm font-medium">{t.label}</span>
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Speaking Pace</h3>
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
          ).map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                data.speakingPace === p.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value={p.value} />
              <span className="text-sm font-medium">{p.label}</span>
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Greeting Style</h3>
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
          ).map((g) => (
            <label
              key={g.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                data.greetingStyle === g.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value={g.value} />
              <span className="text-sm font-medium">{g.label}</span>
            </label>
          ))}
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

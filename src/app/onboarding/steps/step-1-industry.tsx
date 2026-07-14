'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, UtensilsCrossed, Building2 } from 'lucide-react';
import type { StepProps, Industry } from '../types';

const industries: {
  id: Industry;
  label: string;
  icon: React.ReactNode;
  tasks: string[];
  setupTime: string;
  compliance: string | null;
}[] = [
  {
    id: 'healthcare',
    label: 'Healthcare',
    icon: <Stethoscope className="size-8" />,
    tasks: [
      'Appointment scheduling & reminders',
      'Insurance verification calls',
      'Patient intake & follow-ups',
      'Prescription refill requests',
    ],
    setupTime: '~15 minutes',
    compliance: 'HIPAA-compliant voice handling',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: <UtensilsCrossed className="size-8" />,
    tasks: [
      'Reservation management',
      'Takeout & delivery orders',
      'Menu inquiries & allergen info',
      'Event & party bookings',
    ],
    setupTime: '~10 minutes',
    compliance: null,
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    icon: <Building2 className="size-8" />,
    tasks: [
      'Property inquiry handling',
      'Showing scheduling',
      'Lead qualification & follow-up',
      'Open house coordination',
    ],
    setupTime: '~12 minutes',
    compliance: 'Fair Housing Act compliant',
  },
];

export function Step1Industry({ data, updateData }: StepProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {industries.map((ind) => {
        const selected = data.industry === ind.id;
        return (
          <Card
            key={ind.id}
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
              selected ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => updateData({ industry: ind.id })}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div
                  className={`flex size-12 items-center justify-center rounded-xl ${
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {ind.icon}
                </div>
                {selected && <Badge>Selected</Badge>}
              </div>
              <CardTitle className="text-xl">{ind.label}</CardTitle>
              <CardDescription>
                Setup time: {ind.setupTime}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Typical tasks:
              </p>
              <ul className="space-y-2">
                {ind.tasks.map((task) => (
                  <li
                    key={task}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="mt-1 block size-1.5 shrink-0 rounded-full bg-primary" />
                    {task}
                  </li>
                ))}
              </ul>
              {ind.compliance && (
                <div className="mt-4">
                  <Badge variant="outline" className="text-xs">
                    {ind.compliance}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

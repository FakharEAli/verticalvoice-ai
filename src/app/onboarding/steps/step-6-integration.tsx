'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Phone,
  Database,
  MessageSquare,
  CreditCard,
  FileText,
  Check,
} from 'lucide-react';
import type { StepProps, Industry } from '../types';

interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  industries: Industry[];
}

const integrations: IntegrationOption[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync appointments and availability in real time',
    icon: <Calendar className="size-6" />,
    industries: ['healthcare', 'restaurant', 'real_estate'],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Professional phone system with call routing',
    icon: <Phone className="size-6" />,
    industries: ['healthcare', 'restaurant', 'real_estate'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce CRM',
    description: 'Log calls and manage leads automatically',
    icon: <Database className="size-6" />,
    industries: ['real_estate'],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM integration for contact and deal management',
    icon: <Database className="size-6" />,
    industries: ['healthcare', 'real_estate'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications for calls and appointments',
    icon: <MessageSquare className="size-6" />,
    industries: ['healthcare', 'restaurant', 'real_estate'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and deposits over the phone',
    icon: <CreditCard className="size-6" />,
    industries: ['restaurant', 'real_estate'],
  },
  {
    id: 'ehr',
    name: 'EHR / Practice Management',
    description: 'Connect to your electronic health records system',
    icon: <FileText className="size-6" />,
    industries: ['healthcare'],
  },
  {
    id: 'opentable',
    name: 'OpenTable',
    description: 'Manage reservations through OpenTable',
    icon: <Calendar className="size-6" />,
    industries: ['restaurant'],
  },
  {
    id: 'mls',
    name: 'MLS Integration',
    description: 'Pull listings and property data from MLS',
    icon: <Database className="size-6" />,
    industries: ['real_estate'],
  },
];

export function Step6Integration({ data, updateData }: StepProps) {
  const available = integrations.filter(
    (i) => !data.industry || i.industries.includes(data.industry)
  );
  const selected = data.integration;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {available.map((integ) => {
          const isSelected = selected === integ.id;
          return (
            <Card
              key={integ.id}
              className={`transition-all ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {integ.icon}
                  </div>
                  {isSelected && (
                    <Badge>
                      <Check className="mr-1 size-3" />
                      Connected
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{integ.name}</CardTitle>
                <CardDescription>{integ.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant={isSelected ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() =>
                    updateData({
                      integration: isSelected ? null : integ.id,
                    })
                  }
                >
                  {isSelected ? 'Disconnect' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-6 text-center">
          <p className="text-sm font-medium">Not ready to connect?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Skip for now and use demo mode. You can connect integrations later
            from the dashboard.
          </p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() =>
              updateData({ integration: null, integrationConfig: {} })
            }
          >
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

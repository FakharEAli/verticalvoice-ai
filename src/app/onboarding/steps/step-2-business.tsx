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
import { Separator } from '@/components/ui/separator';
import type { Industry, StepProps } from '../types';

const countries = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Other',
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
];

const businessNamePlaceholders: Record<Industry, string> = {
  healthcare: 'Acme Health Clinic',
  restaurant: "Bella's Italian Kitchen",
  real_estate: 'Metro Realty Group',
};

function getBusinessNamePlaceholder(industry: Industry | null): string {
  return industry
    ? businessNamePlaceholders[industry]
    : businessNamePlaceholders.healthcare;
}

const businessSizes = [
  { value: 'solo', label: 'Solo (1 person)' },
  { value: 'small', label: 'Small (2-10)' },
  { value: 'medium', label: 'Medium (11-50)' },
  { value: 'large', label: 'Large (51-200)' },
  { value: 'enterprise', label: 'Enterprise (200+)' },
];

export function Step2Business({ data, updateData }: StepProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Business Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              placeholder={getBusinessNamePlaceholder(data.industry)}
              value={data.businessName}
              onChange={(e) =>
                updateData({ businessName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              placeholder="https://example.com"
              value={data.websiteUrl}
              onChange={(e) => updateData({ websiteUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mainPhone">Main Phone Number</Label>
            <Input
              id="mainPhone"
              placeholder="+1 (555) 000-0000"
              value={data.mainPhone}
              onChange={(e) => updateData({ mainPhone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address</Label>
            <Input
              id="businessAddress"
              placeholder="123 Main St, City, State"
              value={data.businessAddress}
              onChange={(e) =>
                updateData({ businessAddress: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={data.country}
              onValueChange={(val) => updateData({ country: val ?? "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={data.timezone}
              onValueChange={(val) => updateData({ timezone: val ?? "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Business Size</Label>
            <Select
              value={data.businessSize}
              onValueChange={(val) => updateData({ businessSize: val ?? "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {businessSizes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfLocations">Number of Locations</Label>
            <Input
              id="numberOfLocations"
              type="number"
              min={1}
              value={data.numberOfLocations}
              onChange={(e) =>
                updateData({
                  numberOfLocations: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Contact Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactName">
              Contact Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactName"
              placeholder="Jane Smith"
              value={data.contactName}
              onChange={(e) =>
                updateData({ contactName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">
              Contact Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="jane@example.com"
              value={data.contactEmail}
              onChange={(e) =>
                updateData({ contactEmail: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Language Preferences</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Primary Language</Label>
            <Select
              value={data.preferredLanguage}
              onValueChange={(val) =>
                updateData({ preferredLanguage: val ?? "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Secondary Language (optional)</Label>
            <Select
              value={data.secondaryLanguage}
              onValueChange={(val) =>
                updateData({ secondaryLanguage: val ?? "" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {languages.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </div>
  );
}

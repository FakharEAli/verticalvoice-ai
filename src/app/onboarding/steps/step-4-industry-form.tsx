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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { getIndustryToolCatalog } from '@/industries/core/tool-catalog';
import type { StepProps } from '../types';

function getConfig<T>(data: StepProps['data'], key: string, fallback: T): T {
  return (data.industryConfig[key] as T) ?? fallback;
}

function HealthcareForm({ data, updateData }: StepProps) {
  const set = (key: string, value: unknown) =>
    updateData({ industryConfig: { ...data.industryConfig, [key]: value } });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clinicName">Clinic / Practice Name</Label>
          <Input
            id="clinicName"
            value={getConfig(data, 'clinicName', '')}
            onChange={(e) => set('clinicName', e.target.value)}
            placeholder="City Health Clinic"
          />
        </div>
        <div className="space-y-2">
          <Label>Specialty</Label>
          <Select
            value={getConfig(data, 'specialty', '')}
            onValueChange={(v) => set('specialty', v ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select specialty" />
            </SelectTrigger>
            <SelectContent>
              {[
                'General Practice',
                'Dentistry',
                'Dermatology',
                'Cardiology',
                'Orthopedics',
                'Pediatrics',
                'Psychiatry',
                'OB/GYN',
                'Ophthalmology',
                'Other',
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appointmentTypes">
          Appointment Types (comma-separated)
        </Label>
        <Input
          id="appointmentTypes"
          value={getConfig(data, 'appointmentTypes', '')}
          onChange={(e) => set('appointmentTypes', e.target.value)}
          placeholder="New patient, Follow-up, Urgent, Telehealth"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Default Appointment Duration</Label>
          <Select
            value={getConfig(data, 'appointmentDuration', '30')}
            onValueChange={(v) => set('appointmentDuration', v ?? '30')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['15', '20', '30', '45', '60', '90'].map((m) => (
                <SelectItem key={m} value={m}>
                  {m} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Booking Lead Time</Label>
          <Select
            value={getConfig(data, 'bookingLeadTime', '24h')}
            onValueChange={(v) => set('bookingLeadTime', v ?? '24h')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                { v: '1h', l: '1 hour' },
                { v: '4h', l: '4 hours' },
                { v: '24h', l: '24 hours' },
                { v: '48h', l: '48 hours' },
                { v: '72h', l: '72 hours' },
              ].map((o) => (
                <SelectItem key={o.v} value={o.v}>
                  {o.l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="providers">Providers (comma-separated)</Label>
        <Input
          id="providers"
          value={getConfig(data, 'providers', '')}
          onChange={(e) => set('providers', e.target.value)}
          placeholder="Dr. Smith, Dr. Johnson, NP Williams"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Accepting New Patients</p>
          <p className="text-xs text-muted-foreground">
            Allow AI agent to book new patient appointments
          </p>
        </div>
        <Switch
          checked={getConfig(data, 'acceptNewPatients', true)}
          onCheckedChange={(v) => set('acceptNewPatients', v)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyInstruction">Emergency Instruction</Label>
        <Textarea
          id="emergencyInstruction"
          value={getConfig(data, 'emergencyInstruction', '')}
          onChange={(e) => set('emergencyInstruction', e.target.value)}
          placeholder="For emergencies, please call 911 or go to the nearest emergency room."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hcTransferNumber">Transfer Number</Label>
        <Input
          id="hcTransferNumber"
          value={getConfig(data, 'hcTransferNumber', '')}
          onChange={(e) => set('hcTransferNumber', e.target.value)}
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
        <Textarea
          id="cancellationPolicy"
          value={getConfig(data, 'cancellationPolicy', '')}
          onChange={(e) => set('cancellationPolicy', e.target.value)}
          placeholder="24-hour cancellation notice required..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="insuranceList">
          Accepted Insurance (comma-separated)
        </Label>
        <Input
          id="insuranceList"
          value={getConfig(data, 'insuranceList', '')}
          onChange={(e) => set('insuranceList', e.target.value)}
          placeholder="Aetna, BlueCross, Cigna, UnitedHealth"
        />
      </div>

      <div className="space-y-2">
        <Label>Confirmation Channels</Label>
        <div className="flex flex-wrap gap-4 pt-1">
          {['SMS', 'Email', 'Phone'].map((ch) => {
            const channels: string[] = getConfig(
              data,
              'confirmationChannels',
              ['SMS', 'Email']
            );
            return (
              <label key={ch} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={channels.includes(ch)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...channels, ch]
                      : channels.filter((c) => c !== ch);
                    set('confirmationChannels', next);
                  }}
                />
                {ch}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RestaurantForm({ data, updateData }: StepProps) {
  const set = (key: string, value: unknown) =>
    updateData({ industryConfig: { ...data.industryConfig, [key]: value } });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Cuisine Type</Label>
          <Select
            value={getConfig(data, 'cuisineType', '')}
            onValueChange={(v) => set('cuisineType', v ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select cuisine" />
            </SelectTrigger>
            <SelectContent>
              {[
                'American',
                'Italian',
                'Mexican',
                'Chinese',
                'Japanese',
                'Indian',
                'Thai',
                'Mediterranean',
                'French',
                'Fusion',
                'Other',
              ].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="seatingCapacity">Seating Capacity</Label>
          <Input
            id="seatingCapacity"
            type="number"
            value={getConfig(data, 'seatingCapacity', '')}
            onChange={(e) => set('seatingCapacity', e.target.value)}
            placeholder="80"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reservation System</Label>
        <Select
          value={getConfig(data, 'reservationSystem', '')}
          onValueChange={(v) => set('reservationSystem', v ?? '')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select system" />
          </SelectTrigger>
          <SelectContent>
            {[
              'OpenTable',
              'Resy',
              'Yelp Reservations',
              'SevenRooms',
              'Built-in / None',
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-8 text-center">
        <p className="text-sm font-medium">Upload Menu (PDF or image)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag & drop or click to browse
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="operatingHours">Operating Hours</Label>
        <Input
          id="operatingHours"
          value={getConfig(data, 'operatingHours', '')}
          onChange={(e) => set('operatingHours', e.target.value)}
          placeholder="Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Delivery Available</p>
            <p className="text-xs text-muted-foreground">
              Can customers order delivery?
            </p>
          </div>
          <Switch
            checked={getConfig(data, 'deliveryAvailable', false)}
            onCheckedChange={(v) => set('deliveryAvailable', v)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Takeout Available</p>
            <p className="text-xs text-muted-foreground">
              Can customers order takeout?
            </p>
          </div>
          <Switch
            checked={getConfig(data, 'takeoutAvailable', false)}
            onCheckedChange={(v) => set('takeoutAvailable', v)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="largePartyThreshold">
            Large Party Threshold (guests)
          </Label>
          <Input
            id="largePartyThreshold"
            type="number"
            value={getConfig(data, 'largePartyThreshold', '8')}
            onChange={(e) => set('largePartyThreshold', e.target.value)}
            placeholder="8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergenPolicy">Allergen Policy</Label>
        <Textarea
          id="allergenPolicy"
          value={getConfig(data, 'allergenPolicy', '')}
          onChange={(e) => set('allergenPolicy', e.target.value)}
          placeholder="We accommodate common food allergies. Please inform your server..."
        />
      </div>
    </div>
  );
}

function RealEstateForm({ data, updateData }: StepProps) {
  const set = (key: string, value: unknown) =>
    updateData({ industryConfig: { ...data.industryConfig, [key]: value } });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agencyName">Agency Name</Label>
          <Input
            id="agencyName"
            value={getConfig(data, 'agencyName', '')}
            onChange={(e) => set('agencyName', e.target.value)}
            placeholder="Premier Realty Group"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            value={getConfig(data, 'licenseNumber', '')}
            onChange={(e) => set('licenseNumber', e.target.value)}
            placeholder="DRE#01234567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceAreas">Service Areas (comma-separated)</Label>
        <Input
          id="serviceAreas"
          value={getConfig(data, 'serviceAreas', '')}
          onChange={(e) => set('serviceAreas', e.target.value)}
          placeholder="Downtown, Westside, North Hills, Lakefront"
        />
      </div>

      <div className="space-y-2">
        <Label>Property Types</Label>
        <div className="flex flex-wrap gap-4 pt-1">
          {[
            'Single Family',
            'Condo',
            'Townhouse',
            'Multi-Family',
            'Commercial',
            'Land',
          ].map((pt) => {
            const types: string[] = getConfig(data, 'propertyTypes', []);
            return (
              <label key={pt} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={types.includes(pt)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...types, pt]
                      : types.filter((t) => t !== pt);
                    set('propertyTypes', next);
                  }}
                />
                {pt}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Listing Sources</Label>
        <Select
          value={getConfig(data, 'listingSources', '')}
          onValueChange={(v) => set('listingSources', v ?? '')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select primary source" />
          </SelectTrigger>
          <SelectContent>
            {['MLS', 'Zillow', 'Realtor.com', 'Redfin', 'Custom Website'].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="showingAvailability">Showing Availability</Label>
        <Input
          id="showingAvailability"
          value={getConfig(data, 'showingAvailability', '')}
          onChange={(e) => set('showingAvailability', e.target.value)}
          placeholder="Mon-Sat 9am-6pm, Sun by appointment"
        />
      </div>

      <div className="space-y-2">
        <Label>Lead Response Time</Label>
        <Select
          value={getConfig(data, 'leadResponseTime', '15min')}
          onValueChange={(v) => set('leadResponseTime', v ?? '15min')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              { v: '5min', l: '5 minutes' },
              { v: '15min', l: '15 minutes' },
              { v: '30min', l: '30 minutes' },
              { v: '1h', l: '1 hour' },
              { v: '4h', l: '4 hours' },
            ].map((o) => (
              <SelectItem key={o.v} value={o.v}>
                {o.l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AgentToolsChecklist({ data, updateData }: StepProps) {
  if (!data.industry) return null;

  const catalog = getIndustryToolCatalog(data.industry);
  if (catalog.length === 0) return null;

  const disabled = data.disabledToolIds ?? [];

  const setEnabled = (toolId: string, enabled: boolean) => {
    const next = enabled
      ? disabled.filter((id) => id !== toolId)
      : disabled.includes(toolId)
        ? disabled
        : [...disabled, toolId];
    updateData({ disabledToolIds: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">What your agent can do</p>
        <p className="text-xs text-muted-foreground">
          These are the actions your agent can take on a call. Turn off anything
          you don&apos;t want it doing.
        </p>
      </div>

      <div className="space-y-3">
        {catalog.map((tool) => {
          const enabled = !disabled.includes(tool.id);
          return (
            <div
              key={tool.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.summary}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => setEnabled(tool.id, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Step4IndustryForm({ data, updateData }: StepProps) {
  if (!data.industry) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          Please go back and select an industry first.
        </p>
      </div>
    );
  }

  return (
    <div>
      {data.industry === 'healthcare' && (
        <>
          <Separator className="mb-6" />
          <HealthcareForm data={data} updateData={updateData} />
        </>
      )}
      {data.industry === 'restaurant' && (
        <>
          <Separator className="mb-6" />
          <RestaurantForm data={data} updateData={updateData} />
        </>
      )}
      {data.industry === 'real_estate' && (
        <>
          <Separator className="mb-6" />
          <RealEstateForm data={data} updateData={updateData} />
        </>
      )}

      <Separator className="my-6" />
      <AgentToolsChecklist data={data} updateData={updateData} />
    </div>
  );
}

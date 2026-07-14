import Link from 'next/link';
import type { Metadata } from 'next';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: `Real Estate AI Voice Agent | ${brand.name}`,
  description:
    'AI voice agent for real estate. Speed-to-lead in under 30 seconds, qualify buyers, book showings, and nurture prospects 24/7. Convert 3x more leads.',
};

const capabilities = [
  {
    title: 'Speed-to-Lead',
    description:
      'Respond to property inquiries in under 30 seconds -- day or night. The first agent to respond wins the lead.',
    icon: ZapIcon,
  },
  {
    title: 'Lead Qualification',
    description:
      'Asks the right questions to qualify buyers: budget, timeline, pre-approval status, and property preferences.',
    icon: FilterIcon,
  },
  {
    title: 'Showing Booking',
    description:
      'Schedules property showings based on listing agent availability. Sends confirmation and reminders to both parties.',
    icon: CalendarIcon,
  },
  {
    title: 'Property Inquiry Handling',
    description:
      'Answers questions about listings -- price, square footage, bedrooms, neighborhood details -- from your property database.',
    icon: HomeIcon,
  },
  {
    title: 'Follow-Up Nurturing',
    description:
      'Automatically follows up with leads on a customizable cadence. Re-engages cold leads with new listings that match their criteria.',
    icon: RepeatIcon,
  },
  {
    title: '24/7 Availability',
    description:
      'Property seekers call at all hours. Your agent never sleeps, never takes a day off, and never sends a call to voicemail.',
    icon: ClockIcon,
  },
];

const pipelineStats = [
  { value: '3x', label: 'More leads converted', description: 'Compared to agents using voicemail' },
  { value: '<30s', label: 'Response time', description: 'Industry avg is 12+ hours' },
  { value: '100%', label: 'Inquiry coverage', description: 'No call goes unanswered' },
  { value: '24/7', label: 'Availability', description: 'Nights, weekends, holidays' },
];

const fairHousingPrinciples = [
  {
    title: 'Non-Discriminatory Language',
    description:
      'The AI is trained to describe properties using objective features only -- square footage, amenities, school districts -- never demographics of neighborhoods.',
  },
  {
    title: 'Equal Treatment Protocol',
    description:
      'Every caller receives the same quality of service regardless of accent, name, or background. Consistent scripts ensure equal information access.',
  },
  {
    title: 'Protected Class Awareness',
    description:
      'The agent never asks about or steers based on race, color, religion, sex, national origin, familial status, or disability.',
  },
  {
    title: 'Audit Trail',
    description:
      'Complete transcripts of every interaction are logged for compliance review, providing evidence of fair treatment.',
  },
];

const crmIntegrations = [
  'Follow Up Boss',
  'kvCORE',
  'BoomTown',
  'LionDesk',
  'Salesforce',
  'HubSpot',
];

export default function RealEstatePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-teal-500/5 to-transparent" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <BuildingIcon className="mr-1.5 h-3.5 w-3.5" />
              Real Estate
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Respond first,{' '}
              <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
                close more
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              In real estate, the first responder wins the deal. Your AI agent
              answers property inquiries in under 30 seconds, qualifies leads,
              and books showings -- around the clock.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start your real estate agent
                </Button>
              </Link>
              <Link href="/industries">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  View all industries
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Stats */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {pipelineStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm font-semibold">{stat.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for real estate workflows
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From first contact to closed deal, your AI agent drives the pipeline
            forward.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => (
            <Card
              key={item.title}
              className="relative overflow-hidden transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <item.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Speed-to-Lead Visualization */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Speed Wins Deals</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                The 30-second advantage
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Studies show that responding to a lead within 5 minutes makes
                you 21x more likely to qualify them. Your AI agent responds in
                under 30 seconds.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Instant response to Zillow, Realtor.com, and website leads',
                  'After-hours inquiries answered immediately',
                  'Warm transfer to agents for hot prospects',
                  'Automatic lead scoring and CRM updates',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Response time comparison */}
            <div className="space-y-6">
              <div className="text-sm font-medium">Average lead response time</div>
              {[
                { label: brand.name, time: '30 seconds', pct: 2, color: 'bg-gradient-to-r from-blue-500 to-teal-500' },
                { label: 'Top-performing agents', time: '5 minutes', pct: 15, color: 'bg-blue-300' },
                { label: 'Average agents', time: '2 hours', pct: 50, color: 'bg-gray-300' },
                { label: 'Industry average', time: '12+ hours', pct: 100, color: 'bg-gray-200' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.time}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.pct}%`, minWidth: '2rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fair Housing Compliance */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
            <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Fair housing compliance built in
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Our AI agent is trained to uphold fair housing principles in every
            interaction, helping protect your brokerage from compliance risks.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {fairHousingPrinciples.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border bg-background p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-500" />
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              <p className="mt-3 pl-8 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CRM Integration */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Integration diagram */}
            <div className="flex items-center justify-center">
              <div className="relative h-64 w-64">
                <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-lg">
                  <BuildingIcon className="h-10 w-10" />
                </div>
                {[
                  { x: -90, y: -70, label: 'CRM' },
                  { x: 90, y: -70, label: 'MLS' },
                  { x: -110, y: 40, label: 'Zillow' },
                  { x: 110, y: 40, label: 'Calendar' },
                  { x: 0, y: 100, label: 'Phone' },
                ].map((node) => (
                  <div
                    key={node.label}
                    className="absolute flex h-14 w-14 items-center justify-center rounded-xl border bg-background text-xs font-medium shadow-sm"
                    style={{
                      left: `calc(50% + ${node.x}px - 28px)`,
                      top: `calc(50% + ${node.y}px - 28px)`,
                    }}
                  >
                    {node.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                CRM integration ready
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Leads flow directly into your CRM with qualification data,
                property preferences, and interaction history. No manual data
                entry.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {crmIntegrations.map((name) => (
                  <Badge key={name} variant="outline" className="px-4 py-2 text-sm">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start your real estate agent
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Respond to every inquiry in seconds, qualify leads automatically,
            and close more deals. Setup takes under 10 minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
              >
                {brand.copy.ctaButton}
              </Button>
            </Link>
            <Link href={`mailto:${brand.support.email}`}>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/20 px-8 text-base text-white hover:bg-white/10"
              >
                Talk to sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Inline SVG Icons

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

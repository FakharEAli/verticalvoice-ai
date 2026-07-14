import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Real Estate AI Calling Agent',
  description: 'AI voice agent for real estate. Respond to leads in seconds, qualify prospects, and book showings 24/7.',
};

const capabilities = [
  {
    title: 'Speed-to-Lead',
    description: 'Respond to every inquiry in under 30 seconds -- day or night. The fastest response wins the listing.',
    icon: ZapIcon,
  },
  {
    title: 'Lead Qualification',
    description: 'Ask the right questions about budget, timeline, pre-approval status, and preferences to qualify leads automatically.',
    icon: FilterIcon,
  },
  {
    title: 'Showing Scheduling',
    description: 'Book property viewings directly from phone calls, coordinating with agent calendars in real time.',
    icon: CalendarIcon,
  },
  {
    title: 'Property Inquiries',
    description: 'Answer questions about listings, pricing, square footage, amenities, and neighborhood details from your knowledge base.',
    icon: HomeIcon,
  },
  {
    title: 'Follow-up Nurturing',
    description: 'Automated follow-up calls to keep leads warm, check in after showings, and move prospects through your pipeline.',
    icon: RefreshIcon,
  },
  {
    title: 'Fair Housing Compliance',
    description: 'AI trained to avoid discriminatory language and ensure every caller receives equal treatment regardless of background.',
    icon: ShieldIcon,
  },
];

const stats = [
  { value: '<30s', label: 'Response time' },
  { value: '3x', label: 'More conversions' },
  { value: '24/7', label: 'Lead capture' },
  { value: '96%', label: 'Qualification accuracy' },
];

export default function RealEstatePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Real Estate</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Every Lead Answered in Seconds
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              In real estate, speed wins. Your AI agent qualifies leads, books showings, and
              nurtures prospects 24/7 -- so you never lose a deal to a slow response.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start your real estate agent
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Try a demo call
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-sky-600">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for How Real Estate Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pre-trained on real estate workflows, qualification frameworks, and compliance requirements.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <Card key={cap.title}>
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                  <cap.icon className="h-5 w-5 text-sky-600" />
                </div>
                <CardTitle className="text-base">{cap.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{cap.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Fair Housing */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="outline" className="mb-4">Compliance</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Fair Housing Built In
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our AI agent is trained to comply with Fair Housing Act requirements. It treats
                every caller equally, avoids discriminatory language, and never steers prospects
                based on protected characteristics.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Equal treatment for all callers',
                  'No steering based on protected characteristics',
                  'Compliant language in all responses',
                  'Audit trail for every interaction',
                  'Regular compliance updates',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-background p-6 shadow-lg">
              <h3 className="text-sm font-semibold text-muted-foreground">Lead Pipeline Value</h3>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">New leads (this week)</span>
                  <span className="text-lg font-bold text-sky-600">34</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Qualified</span>
                  <span className="text-lg font-bold text-green-600">28</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Showings booked</span>
                  <span className="text-lg font-bold text-amber-600">19</span>
                </div>
                <div className="rounded-lg bg-sky-500/10 p-4 text-center">
                  <p className="text-3xl font-bold text-sky-600">$4.2M</p>
                  <p className="text-sm text-muted-foreground">Pipeline value from AI-captured leads</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CRM Integration */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Connects With Your CRM
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every lead captured, qualified, and synced to your existing tools automatically.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {['CRM Systems', 'MLS Platforms', 'Calendar Apps', 'Lead Sources'].map((name) => (
            <div key={name} className="flex items-center gap-3 rounded-lg border bg-background p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">Integration ready</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-8 py-16 text-center text-white sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stop losing leads to voicemail
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Deploy your real estate AI agent and start converting more leads today.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                  Start your real estate agent
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// --- Icons ---
function ZapIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>);
}
function FilterIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>);
}
function CalendarIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>);
}
function HomeIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>);
}
function RefreshIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>);
}
function ShieldIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
}
function CheckIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>);
}
function LinkIcon({ className }: { className?: string }) {
  return (<svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);
}

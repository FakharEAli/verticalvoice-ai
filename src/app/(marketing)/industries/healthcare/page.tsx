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
  title: `Healthcare AI Voice Agent | ${brand.name}`,
  description:
    'HIPAA-ready AI voice agent for healthcare. Automate appointment scheduling, patient reminders, prescription refills, and insurance verification. Setup in under 10 minutes.',
};

const capabilities = [
  {
    title: 'Appointment Scheduling',
    description:
      'Patients book, reschedule, or cancel appointments through natural conversation. Syncs with your calendar in real time.',
    icon: CalendarIcon,
  },
  {
    title: 'Patient Reminders',
    description:
      'Automated call and text reminders reduce no-shows. Supports multi-day and same-day reminder sequences.',
    icon: BellIcon,
  },
  {
    title: 'Prescription Refill Routing',
    description:
      'Captures refill requests, verifies patient identity, and routes to your pharmacy team for approval.',
    icon: PillIcon,
  },
  {
    title: 'Emergency Escalation',
    description:
      'Detects urgent symptoms and immediately transfers to on-call staff or directs patients to emergency services.',
    icon: AlertIcon,
  },
  {
    title: 'Insurance Verification',
    description:
      'Collects insurance details before visits, reducing front-desk workload and speeding up check-in.',
    icon: ShieldCheckIcon,
  },
];

const complianceItems = [
  {
    title: 'HIPAA-Ready Architecture',
    description:
      'End-to-end encryption for all voice data. No patient information is stored on third-party servers without BAA coverage.',
  },
  {
    title: 'Encrypted Calls',
    description:
      'Every call is encrypted in transit and at rest. TLS 1.3 for all data transmission.',
  },
  {
    title: 'Audit Logging',
    description:
      'Complete audit trail of every interaction. Exportable logs for compliance reviews and incident response.',
  },
  {
    title: 'Synthetic Demo Mode',
    description:
      'Test your agent with synthetic patient data -- no real PHI needed during setup or training.',
  },
];

const stats = [
  { value: '35%', label: 'Reduction in no-shows', description: 'Through automated multi-touch reminders' },
  { value: '80%', label: 'Routine calls handled', description: 'Without human intervention' },
  { value: '<10 min', label: 'Setup time', description: 'From signup to live agent' },
];

const integrations = [
  'Epic',
  'Cerner',
  'Athenahealth',
  'DrChrono',
  'Practice Fusion',
  'AdvancedMD',
];

export default function HealthcarePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <HeartPulseIcon className="mr-1.5 h-3.5 w-3.5" />
              Healthcare
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your front desk,{' '}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                always on
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              An AI voice agent trained for healthcare workflows. Handles
              scheduling, reminders, refills, and insurance questions -- so your
              staff can focus on patient care.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start your healthcare agent
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

      {/* Key Stats */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
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
            Key capabilities
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every feature your practice needs, built into one intelligent voice
            agent.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => (
            <Card
              key={item.title}
              className="relative overflow-hidden transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                  <item.icon className="h-6 w-6 text-violet-600" />
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

      {/* Dashboard Preview Mockup */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Monitor everything from your dashboard
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Real-time analytics, call transcripts, and patient interaction
              summaries -- all in one place.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl">
              {/* Title bar */}
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="ml-4 flex-1 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                  dashboard.verticalvoice.ai/healthcare
                </div>
              </div>
              {/* Dashboard content */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Calls Today', value: '47', color: 'from-violet-500 to-purple-500' },
                    { label: 'Appointments Booked', value: '23', color: 'from-blue-500 to-cyan-500' },
                    { label: 'Avg. Call Duration', value: '2:34', color: 'from-emerald-500 to-green-500' },
                    { label: 'Patient Satisfaction', value: '4.8/5', color: 'from-amber-500 to-orange-500' },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border p-4">
                      <div className="text-xs text-muted-foreground">
                        {card.label}
                      </div>
                      <div
                        className={`mt-1 bg-gradient-to-r ${card.color} bg-clip-text text-2xl font-bold text-transparent`}
                      >
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border p-4 lg:col-span-2">
                    <div className="mb-4 text-sm font-medium">
                      Call volume (last 7 days)
                    </div>
                    <div className="flex h-32 items-end gap-2">
                      {[40, 65, 55, 80, 70, 90, 47].map((h, i) => (
                        <div key={i} className="flex-1">
                          <div
                            className="rounded-t bg-gradient-to-t from-violet-500 to-purple-400"
                            style={{ height: `${(h / 90) * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="mb-4 text-sm font-medium">
                      Call outcomes
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Scheduled', pct: 49, color: 'bg-violet-500' },
                        { label: 'Info provided', pct: 31, color: 'bg-blue-500' },
                        { label: 'Escalated', pct: 12, color: 'bg-amber-500' },
                        { label: 'Voicemail', pct: 8, color: 'bg-gray-400' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">{item.pct}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${item.color}`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
            <ShieldCheckIcon className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for compliance
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Healthcare demands the highest standards. Our architecture is
            designed from the ground up for regulatory compliance.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {complianceItems.map((item) => (
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

      {/* Integrations */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Connects to the systems you already use
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our healthcare agent integrates with major EHR and practice
                management platforms. Appointment data flows both ways --
                no double entry.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {integrations.map((name) => (
                  <Badge key={name} variant="outline" className="px-4 py-2 text-sm">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
            {/* Integration diagram mockup */}
            <div className="flex items-center justify-center">
              <div className="relative h-64 w-64">
                <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                  <HeartPulseIcon className="h-10 w-10" />
                </div>
                {[
                  { x: -80, y: -80, label: 'EHR' },
                  { x: 80, y: -80, label: 'Calendar' },
                  { x: -100, y: 40, label: 'Pharmacy' },
                  { x: 100, y: 40, label: 'Billing' },
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
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start your healthcare agent
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Reduce no-shows, reclaim staff time, and give every patient a
            world-class phone experience. Setup takes under 10 minutes.
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

function HeartPulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
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

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
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

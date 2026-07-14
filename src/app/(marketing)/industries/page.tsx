import Link from 'next/link';
import type { Metadata } from 'next';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: `Industries | ${brand.name}`,
  description:
    'AI voice agents built for Healthcare, Restaurants, and Real Estate. Pre-trained on industry workflows, compliance, and terminology.',
};

const industries = [
  {
    title: 'Healthcare',
    href: '/industries/healthcare',
    icon: HeartPulseIcon,
    description:
      'Automate appointment scheduling, patient reminders, prescription refill routing, and insurance verification -- all HIPAA-ready.',
    stats: [
      { value: '35%', label: 'Fewer no-shows' },
      { value: '80%', label: 'Routine calls handled' },
      { value: '<10 min', label: 'Setup time' },
    ],
    features: [
      'Appointment scheduling',
      'Patient reminders',
      'Prescription refill routing',
      'Emergency escalation',
      'Insurance verification',
    ],
    gradient: 'from-violet-500/20 via-purple-500/10 to-transparent',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Restaurant',
    href: '/industries/restaurant',
    icon: UtensilsIcon,
    description:
      'Handle reservations, takeout orders, menu inquiries, and allergen safety protocols -- even during peak hours.',
    stats: [
      { value: '$2,400', label: 'Monthly revenue recovered' },
      { value: '40%', label: 'Fewer missed calls' },
      { value: '24/7', label: 'Availability' },
    ],
    features: [
      'Reservation booking',
      'Takeout orders',
      'Menu & allergen info',
      'Wait-list management',
      'Feedback collection',
    ],
    gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600',
  },
  {
    title: 'Real Estate',
    href: '/industries/real-estate',
    icon: BuildingIcon,
    description:
      'Respond to property inquiries in under 30 seconds, qualify leads, book showings, and nurture prospects around the clock.',
    stats: [
      { value: '3x', label: 'More leads converted' },
      { value: '<30s', label: 'Response time' },
      { value: '100%', label: 'Inquiry coverage' },
    ],
    features: [
      'Speed-to-lead response',
      'Lead qualification',
      'Showing scheduling',
      'Property inquiries',
      'Follow-up nurturing',
    ],
    gradient: 'from-blue-500/20 via-teal-500/10 to-transparent',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
  },
];

const comparisons = [
  {
    feature: 'Industry terminology',
    generic: 'Generic scripts',
    vertical: 'Pre-trained on real workflows',
  },
  {
    feature: 'Compliance',
    generic: 'Not addressed',
    vertical: 'Built-in (HIPAA, fair housing, food safety)',
  },
  {
    feature: 'Setup time',
    generic: 'Weeks of configuration',
    vertical: 'Under 10 minutes',
  },
  {
    feature: 'Call routing',
    generic: 'Basic IVR menus',
    vertical: 'Intelligent escalation & context handoff',
  },
  {
    feature: 'Integrations',
    generic: 'Custom development needed',
    vertical: 'Pre-built for EHR, POS, CRM',
  },
];

export default function IndustriesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              3 Verticals Available
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              AI Agents Built for{' '}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                Your Industry
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Generic chatbots waste your time. Our AI voice agents are
              pre-trained on the terminology, workflows, and compliance
              requirements of your specific vertical.
            </p>
          </div>
        </div>
      </section>

      {/* Industry Cards */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {industries.map((industry) => (
            <Card
              key={industry.title}
              className="relative overflow-hidden transition-shadow hover:shadow-xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${industry.gradient}`}
              />
              <div className="relative grid gap-8 p-8 lg:grid-cols-2 lg:p-12">
                {/* Left: Info */}
                <div>
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${industry.iconBg}`}
                    >
                      <industry.icon
                        className={`h-7 w-7 ${industry.iconColor}`}
                      />
                    </div>
                    <h2 className="text-2xl font-bold sm:text-3xl">
                      {industry.title}
                    </h2>
                  </div>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    {industry.description}
                  </p>

                  {/* Features */}
                  <ul className="mt-6 space-y-2.5">
                    {industry.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Link href={industry.href}>
                      <Button size="lg" className="h-12 px-8 text-base">
                        Learn more
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="flex flex-col justify-center">
                  <div className="grid grid-cols-3 gap-4">
                    {industry.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border bg-background/80 p-5 text-center backdrop-blur-sm"
                      >
                        <div className="text-2xl font-bold text-primary sm:text-3xl">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison: Vertical vs Generic */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How vertical AI differs from generic chatbots
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built agents outperform one-size-fits-all solutions in
              every metric that matters.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-4xl overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-4 pr-4 text-sm font-semibold">Feature</th>
                  <th className="pb-4 pr-4 text-sm font-semibold text-muted-foreground">
                    Generic Chatbot
                  </th>
                  <th className="pb-4 text-sm font-semibold text-primary">
                    {brand.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr key={row.feature} className="border-b last:border-0">
                    <td className="py-4 pr-4 text-sm font-medium">
                      {row.feature}
                    </td>
                    <td className="py-4 pr-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircleIcon className="h-4 w-4 shrink-0 text-red-400" />
                        {row.generic}
                      </div>
                    </td>
                    <td className="py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                        {row.vertical}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to deploy your industry agent?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Pick your vertical, answer a few questions, and go live in under 10
            minutes. No developers required.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
              >
                {brand.copy.ctaButton}
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

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

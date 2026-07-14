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
  title: `Restaurant AI Voice Agent | ${brand.name}`,
  description:
    'AI voice agent for restaurants. Handle reservations, takeout orders, menu inquiries, and allergen safety -- even during peak hours. Recover $2,400/month in missed calls.',
};

const capabilities = [
  {
    title: 'Reservation Booking',
    description:
      'Guests book tables through natural conversation. Handles party size, time preferences, and special requests automatically.',
    icon: CalendarIcon,
  },
  {
    title: 'Takeout Orders',
    description:
      'Captures complete orders with modifications, add-ons, and pickup times. Reads back orders for confirmation.',
    icon: ShoppingBagIcon,
  },
  {
    title: 'Menu & Allergen Inquiries',
    description:
      'Answers detailed questions about ingredients, allergens, dietary options, and daily specials with zero wait time.',
    icon: MenuIcon,
  },
  {
    title: 'Wait-List Management',
    description:
      'Adds guests to the wait-list, provides estimated wait times, and sends automated notifications when their table is ready.',
    icon: ClockIcon,
  },
  {
    title: 'Hours & Directions',
    description:
      'Provides location details, parking information, operating hours, and holiday schedules instantly.',
    icon: MapPinIcon,
  },
  {
    title: 'Feedback Collection',
    description:
      'Follows up after dining to collect ratings and feedback. Routes negative experiences to managers immediately.',
    icon: StarIcon,
  },
];

const revenueItems = [
  {
    label: 'Missed calls per week (industry avg)',
    value: '62',
  },
  {
    label: 'Average order value',
    value: '$38',
  },
  {
    label: 'Calls converted to orders',
    value: '25%',
  },
  {
    label: 'Monthly revenue recovered',
    value: '$2,400+',
    highlight: true,
  },
];

const posIntegrations = [
  'Toast',
  'Square',
  'Clover',
  'Revel',
  'TouchBistro',
  'Lightspeed',
];

export default function RestaurantPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <UtensilsIcon className="mr-1.5 h-3.5 w-3.5" />
              Restaurant
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Never miss a{' '}
              <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                reservation again
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              An AI voice agent that handles reservations, orders, and menu
              questions -- even during the dinner rush. Every call answered,
              every order captured.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start your restaurant agent
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

      {/* Revenue Recovery */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Recover{' '}
                <span className="text-orange-600">$2,400/month</span>{' '}
                in missed calls
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The average restaurant misses 62 calls per week. Each missed
                call is a lost reservation or takeout order. Our agent picks up
                every single one.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {revenueItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border p-5 ${
                    item.highlight
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'bg-background'
                  }`}
                >
                  <div
                    className={`text-2xl font-bold sm:text-3xl ${
                      item.highlight ? 'text-orange-600' : ''
                    }`}
                  >
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your phone line needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From reservation booking to post-meal feedback, your AI agent
            handles it all.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => (
            <Card
              key={item.title}
              className="relative overflow-hidden transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <item.icon className="h-6 w-6 text-orange-600" />
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

      {/* Peak Mode */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Visualization */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-lg">
                <div className="border-b bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <PhoneIcon className="h-5 w-5" />
                    <span className="font-semibold">Peak Mode Active</span>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    Friday 6:30 PM -- High call volume detected
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  {[
                    { time: '6:31 PM', action: 'Reservation booked -- party of 4, 7:30 PM', status: 'done' },
                    { time: '6:32 PM', action: 'Takeout order -- 2 entrees, pickup 7:00 PM', status: 'done' },
                    { time: '6:33 PM', action: 'Wait-list -- party of 6, est. 25 min', status: 'done' },
                    { time: '6:34 PM', action: 'Menu inquiry -- gluten-free options', status: 'active' },
                    { time: '6:34 PM', action: 'Incoming call -- holding', status: 'pending' },
                  ].map((item) => (
                    <div key={item.time + item.action} className="flex items-start gap-3">
                      <div className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                        {item.time}
                      </div>
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.status === 'done'
                            ? 'bg-green-500'
                            : item.status === 'active'
                            ? 'animate-pulse bg-orange-500'
                            : 'bg-gray-300'
                        }`}
                      />
                      <div className="text-sm">{item.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Description */}
            <div>
              <Badge variant="secondary" className="mb-4">Rush Hour Ready</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Peak mode handles the overflow
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                When call volume spikes during lunch and dinner rushes, your AI
                agent scales instantly. No hold times, no missed calls, no
                frustrated guests.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Handles multiple calls simultaneously',
                  'Prioritizes reservations over general inquiries',
                  'Auto-escalates VIP guests and large parties',
                  'Real-time dashboard during peak periods',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* POS Integration */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              POS integration ready
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Orders taken by the AI agent flow directly into your point-of-sale
              system. No manual re-entry, no errors, no delays.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {posIntegrations.map((name) => (
                <Badge key={name} variant="outline" className="px-4 py-2 text-sm">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
          {/* Flow diagram */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              {[
                { label: 'Phone Call', color: 'from-orange-500 to-amber-500' },
                { label: 'AI Agent', color: 'from-violet-500 to-purple-500' },
                { label: 'POS System', color: 'from-emerald-500 to-green-500' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-4 sm:gap-6">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-center text-xs font-semibold text-white shadow-lg sm:h-24 sm:w-24`}
                  >
                    {step.label}
                  </div>
                  {i < 2 && (
                    <ArrowRightIcon className="hidden h-5 w-5 text-muted-foreground sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Turn every visit into feedback
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Your agent follows up with guests to collect ratings and reviews.
              Negative feedback is routed to managers instantly -- before it hits
              social media.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="overflow-hidden rounded-2xl border bg-background shadow-lg">
              <div className="border-b px-6 py-4">
                <div className="text-sm font-medium">Recent feedback</div>
              </div>
              <div className="divide-y">
                {[
                  { name: 'Sarah M.', rating: 5, comment: 'Amazing experience! Will be back.', time: '2h ago' },
                  { name: 'James R.', rating: 4, comment: 'Great food, slightly long wait.', time: '3h ago' },
                  { name: 'Alex T.', rating: 2, comment: 'Order was incorrect.', time: '4h ago', flagged: true },
                ].map((fb) => (
                  <div key={fb.name} className="flex items-start justify-between px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{fb.name}</span>
                        {fb.flagged && (
                          <Badge variant="destructive" className="text-xs">
                            Escalated
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarFilledIcon
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < fb.rating
                                ? 'text-amber-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {fb.comment}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">
                      {fb.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start your restaurant agent
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Stop losing revenue to missed calls. Set up your AI agent in under
            10 minutes and let every call drive your business forward.
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

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
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

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h16" />
      <path d="M4 16h16" />
      <path d="M4 12h16" />
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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tiers = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'For small businesses getting started with AI calling.',
    calls: '100 calls/mo',
    features: [
      '1 AI agent',
      '100 calls per month',
      'Email support',
      'Basic analytics dashboard',
      'Call transcripts',
      'Business hours routing',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$149',
    period: '/mo',
    description: 'For growing businesses that need more capacity and insight.',
    calls: '500 calls/mo',
    features: [
      '3 AI agents',
      '500 calls per month',
      'Priority support',
      'Advanced analytics & reports',
      'Custom greetings & scripts',
      'Call recordings',
      'CRM integrations',
      'A/B response testing',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced security and scale needs.',
    calls: 'Unlimited calls',
    features: [
      'Unlimited AI agents',
      'Unlimited calls',
      'Dedicated account manager',
      'Custom SLA',
      'Custom integrations',
      'HIPAA BAA available',
      'SSO / SAML',
      'Priority onboarding',
      'Custom AI training',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const comparisonFeatures = [
  { name: 'AI agents', starter: '1', growth: '3', enterprise: 'Unlimited' },
  { name: 'Monthly calls', starter: '100', growth: '500', enterprise: 'Unlimited' },
  { name: 'Call transcripts', starter: true, growth: true, enterprise: true },
  { name: 'Basic analytics', starter: true, growth: true, enterprise: true },
  { name: 'Advanced analytics', starter: false, growth: true, enterprise: true },
  { name: 'Custom greetings', starter: false, growth: true, enterprise: true },
  { name: 'Call recordings', starter: false, growth: true, enterprise: true },
  { name: 'CRM integrations', starter: false, growth: true, enterprise: true },
  { name: 'A/B response testing', starter: false, growth: true, enterprise: true },
  { name: 'Priority support', starter: false, growth: true, enterprise: true },
  { name: 'Dedicated account manager', starter: false, growth: false, enterprise: true },
  { name: 'Custom SLA', starter: false, growth: false, enterprise: true },
  { name: 'HIPAA BAA', starter: false, growth: false, enterprise: true },
  { name: 'SSO / SAML', starter: false, growth: false, enterprise: true },
  { name: 'Custom AI training', starter: false, growth: false, enterprise: true },
];

const billingFaqs = [
  {
    question: 'Is there a free trial?',
    answer:
      'Yes! Every plan starts with a 14-day free trial. No credit card required to get started. You can upgrade, downgrade, or cancel at any time during or after the trial.',
  },
  {
    question: 'What counts as a "call"?',
    answer:
      'A call is any inbound or outbound phone conversation handled by your AI agent. Test calls made during setup do not count toward your monthly limit.',
  },
  {
    question: 'What happens if I exceed my monthly call limit?',
    answer:
      'You will receive a notification when you reach 80% of your limit. Additional calls beyond your plan are billed at $0.75 per call. You can upgrade your plan at any time to avoid overage charges.',
  },
  {
    question: 'Can I change plans mid-cycle?',
    answer:
      'Absolutely. Upgrades take effect immediately and you are charged a prorated amount. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    question: 'Do you offer annual billing?',
    answer:
      'Yes. Annual plans come with a 20% discount compared to monthly billing. Contact our sales team or switch to annual billing from your account settings.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express) and ACH bank transfers for annual Enterprise plans. All payments are processed securely via Stripe.',
  },
  {
    question: 'Is there a setup fee?',
    answer:
      'No. There are no setup fees, no hidden charges, and no long-term contracts. You pay only for your plan and any call overages.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      'If you are not satisfied within the first 30 days of a paid plan, we offer a full refund -- no questions asked. Contact support@verticalvoice.ai to request one.',
  },
];

export default function PricingPage() {
  const [callVolume, setCallVolume] = useState<string>('250');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const calls = parseInt(callVolume, 10) || 0;

  const calculateCost = (
    baseCost: number,
    includedCalls: number,
    overageRate: number
  ) => {
    if (includedCalls === Infinity) return baseCost;
    const overage = Math.max(0, calls - includedCalls);
    return baseCost + overage * overageRate;
  };

  const estimates = [
    {
      tier: 'Starter',
      base: 49,
      included: 100,
      overage: 0.75,
    },
    {
      tier: 'Growth',
      base: 149,
      included: 500,
      overage: 0.75,
    },
    {
      tier: 'Enterprise',
      base: null,
      included: Infinity,
      overage: 0,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Start free, scale as you grow. No hidden fees, no long-term
              contracts.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.highlighted
                  ? 'border-primary shadow-lg ring-1 ring-primary'
                  : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <p className="pt-1 text-sm text-muted-foreground">
                  {tier.calls}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="pt-8">
                  <Link
                    href={tier.name === 'Enterprise' ? '/contact' : '/signup'}
                  >
                    <Button
                      className="w-full"
                      variant={tier.highlighted ? 'default' : 'outline'}
                      size="lg"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Feature comparison
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See exactly what is included in each plan.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-4 pr-4 text-left font-semibold">
                    Feature
                  </th>
                  <th className="pb-4 px-4 text-center font-semibold">
                    Starter
                  </th>
                  <th className="pb-4 px-4 text-center font-semibold">
                    Growth
                  </th>
                  <th className="pb-4 pl-4 text-center font-semibold">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="border-b last:border-0">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <FeatureCell value={row.growth} />
                    </td>
                    <td className="py-3 pl-4 text-center">
                      <FeatureCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cost Calculator */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Estimate your monthly cost
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter your expected call volume to see what each plan would cost.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <label
              htmlFor="call-volume"
              className="text-sm font-medium whitespace-nowrap"
            >
              Expected monthly calls:
            </label>
            <input
              id="call-volume"
              type="number"
              min="0"
              max="100000"
              value={callVolume}
              onChange={(e) => setCallVolume(e.target.value)}
              className="w-32 rounded-lg border bg-background px-4 py-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {estimates.map((est) => {
              const cost = est.base
                ? calculateCost(est.base, est.included, est.overage)
                : null;
              return (
                <Card key={est.tier} className="text-center">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{est.tier}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cost !== null ? (
                      <>
                        <p className="text-3xl font-bold">
                          ${cost.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          per month
                        </p>
                        {calls > est.included && (
                          <p className="mt-2 text-xs text-amber-600">
                            Includes {calls - est.included} overage calls at
                            $0.75/call
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold">Custom</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Contact sales for pricing
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Billing questions
            </h2>
          </div>
          <div className="mx-auto mt-12 max-w-3xl space-y-3">
            {billingFaqs.map((faq, index) => (
              <div key={faq.question} className="rounded-lg border bg-background">
                <button
                  onClick={() =>
                    setOpenFaqIndex(openFaqIndex === index ? null : index)
                  }
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold pr-4">{faq.question}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start your free trial
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            14 days free on any plan. No credit card required.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="font-medium">{value}</span>;
  }
  return value ? (
    <CheckIcon className="mx-auto h-4 w-4 text-green-500" />
  ) : (
    <XIcon className="mx-auto h-4 w-4 text-muted-foreground/30" />
  );
}

// Inline SVG icons

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

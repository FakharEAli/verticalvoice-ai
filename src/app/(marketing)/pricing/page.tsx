'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ChevronDown } from 'lucide-react';
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
    cta: 'Start free trial',
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
      'Advanced analytics and reports',
      'Custom greetings and scripts',
      'Call recordings',
      'CRM integrations',
      'A/B response testing',
    ],
    cta: 'Start free trial',
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
      'SSO and SAML',
      'Priority onboarding',
      'Custom AI training',
    ],
    cta: 'Contact sales',
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
  { name: 'SSO and SAML', starter: false, growth: false, enterprise: true },
  { name: 'Custom AI training', starter: false, growth: false, enterprise: true },
];

const billingFaqs = [
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. Every plan starts with a 14-day free trial. No credit card required to get started. You can upgrade, downgrade, or cancel at any time during or after the trial.',
  },
  {
    question: 'What counts as a call?',
    answer:
      'A call is any inbound or outbound phone conversation handled by your AI agent. Test calls made during setup do not count toward your monthly limit.',
  },
  {
    question: 'What happens if I exceed my monthly call limit?',
    answer:
      'You get a notification when you reach 80% of your limit. Additional calls beyond your plan are billed at $0.75 per call. You can upgrade at any time to avoid overage charges.',
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
      'If you are not satisfied within the first 30 days of a paid plan, we offer a full refund, no questions asked. Contact support@verticalvoice.ai to request one.',
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
    { tier: 'Starter', base: 49, included: 100, overage: 0.75 },
    { tier: 'Growth', base: 149, included: 500, overage: 0.75 },
    { tier: 'Enterprise', base: null, included: Infinity, overage: 0 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Start free, scale as you grow. No hidden fees, no long-term
              contracts.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.highlighted ? 'overflow-visible ring-2 ring-brand' : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="border-transparent bg-brand px-3 py-1 text-brand-foreground">
                    Most popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4">
                  <span className="font-display text-4xl">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <p className="pt-1 font-mono text-sm text-muted-foreground">
                  {tier.calls}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-brand"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="pt-8">
                  <Link href={tier.name === 'Enterprise' ? '/contact' : '/signup'}>
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

      {/* Feature comparison */}
      <section className="border-y bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Feature comparison
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See exactly what is included in each plan.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 text-center font-medium">Starter</th>
                  <th className="px-4 py-3 text-center font-medium">Growth</th>
                  <th className="px-4 py-3 text-center font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="border-b last:border-0">
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.growth} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cost calculator */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
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
              Expected monthly calls
            </label>
            <input
              id="call-volume"
              type="number"
              min="0"
              max="100000"
              value={callVolume}
              onChange={(e) => setCallVolume(e.target.value)}
              className="h-11 w-36 rounded-lg border bg-card px-4 text-center font-mono text-lg font-semibold tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
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
                        <p className="font-display text-4xl tabular-nums text-brand">
                          ${cost.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          per month
                        </p>
                        {calls > est.included && (
                          <p className="mt-2 text-xs text-warning">
                            Includes {calls - est.included} overage calls at
                            $0.75 each
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-display text-4xl text-brand">Custom</p>
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
      <section className="border-t bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Billing questions
            </h2>
          </div>
          <div className="mx-auto mt-12 max-w-3xl space-y-3">
            {billingFaqs.map((faq, index) => (
              <div key={faq.question} className="rounded-lg border bg-card">
                <button
                  onClick={() =>
                    setOpenFaqIndex(openFaqIndex === index ? null : index)
                  }
                  aria-expanded={openFaqIndex === index}
                  className="flex min-h-11 w-full items-center justify-between p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="pr-4 font-semibold">{faq.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                    aria-hidden
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
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Start your free trial
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            14 days free on any plan. No credit card required.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                Start free trial
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
    return <span className="font-medium tabular-nums">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto size-4 text-brand" aria-label="Included" />
  ) : (
    <X className="mx-auto size-4 text-muted-foreground/30" aria-label="Not included" />
  );
}

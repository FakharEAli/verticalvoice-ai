import type { Metadata } from 'next';
import Link from 'next/link';
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
  title: 'How It Works | VerticalVoice AI',
  description:
    'From signup to live calls in under 10 minutes. Learn how VerticalVoice AI sets up your industry-specific voice agent step by step.',
};

const detailedSteps = [
  {
    step: 1,
    title: 'Choose Your Industry',
    subtitle: 'Start with a foundation built for your vertical',
    description:
      'Select Healthcare, Restaurant, or Real Estate. Each template comes pre-loaded with industry-specific intents, terminology, and compliance guardrails so your agent sounds like an expert from day one.',
    details: [
      'Pre-trained on thousands of real industry conversations',
      'Built-in compliance rules (HIPAA for healthcare, etc.)',
      'Industry-specific vocabulary and phrasing',
      'Optimized call flows for common scenarios',
    ],
    gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    accentColor: 'bg-indigo-500',
  },
  {
    step: 2,
    title: 'Configure Your Agent',
    subtitle: 'Customize every detail without writing code',
    description:
      'Answer a short questionnaire about your business -- operating hours, services offered, frequently asked questions, booking rules -- and the AI configures itself around your answers.',
    details: [
      'Business hours and holiday schedule setup',
      'Services, pricing, and availability configuration',
      'Custom FAQ responses for your common questions',
      'Escalation rules (when to transfer to a human)',
    ],
    gradient: 'from-sky-500/20 via-cyan-500/10 to-transparent',
    accentColor: 'bg-sky-500',
  },
  {
    step: 3,
    title: 'Test Your Agent',
    subtitle: 'Make real test calls before going live',
    description:
      'Call your agent, review transcripts, and fine-tune responses. The testing sandbox lets you simulate every scenario -- peak hours, edge cases, difficult callers -- until you are confident.',
    details: [
      'Make unlimited test calls from your browser',
      'Review full transcripts with intent annotations',
      'A/B test different response styles',
      'Simulate caller scenarios (angry, confused, in a hurry)',
    ],
    gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
    accentColor: 'bg-emerald-500',
  },
  {
    step: 4,
    title: 'Go Live',
    subtitle: 'Connect your number and start handling calls',
    description:
      'Forward your business phone number (or get a new one from us) and your AI agent begins answering calls immediately. Monitor performance from a real-time dashboard.',
    details: [
      'Port your existing number or provision a new one',
      'Real-time call monitoring dashboard',
      'Automatic performance reports and analytics',
      'Continuous learning from every conversation',
    ],
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    accentColor: 'bg-amber-500',
  },
];

const behindTheScenes = [
  {
    title: 'AI Training',
    description:
      'Your agent is fine-tuned on thousands of real industry conversations, learning the nuances of tone, timing, and terminology that make callers feel heard.',
    icon: BrainIcon,
  },
  {
    title: 'Intent Recognition',
    description:
      'Advanced NLU models parse caller intent in real time -- distinguishing between a new appointment request, a reschedule, and a billing question within milliseconds.',
    icon: TargetIcon,
  },
  {
    title: 'Response Generation',
    description:
      'Context-aware responses are generated dynamically, blending your business rules with natural conversational flow so every reply sounds human and helpful.',
    icon: MessageSquareIcon,
  },
];

const faqs = [
  {
    question: 'Do I need any technical knowledge to set up?',
    answer:
      'Not at all. The setup is a guided questionnaire -- no code, no integrations, no IT department required. If you can fill out a form, you can launch an AI agent.',
  },
  {
    question: 'Can I change my agent after going live?',
    answer:
      'Absolutely. You can update responses, hours, services, and escalation rules at any time from your dashboard. Changes take effect immediately.',
  },
  {
    question: 'What happens if the AI cannot handle a call?',
    answer:
      'Your agent will gracefully transfer to a human team member based on the escalation rules you set up. You will also get a notification so nothing slips through the cracks.',
  },
  {
    question: 'How long does the whole setup actually take?',
    answer:
      'Most businesses complete setup in 5-10 minutes. Testing takes as long as you want -- some customers launch after a single test call, others spend a day fine-tuning. Either way, you are in control.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              4-step setup
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              From signup to live calls in under 10 minutes
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              No developers. No complex integrations. Just answer a few questions
              about your business and your AI calling agent is ready to go.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Steps */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="space-y-32">
          {detailedSteps.map((item, index) => (
            <div
              key={item.step}
              className={`flex flex-col gap-12 lg:flex-row lg:items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Content */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${item.accentColor} text-sm font-bold text-white`}
                  >
                    {item.step}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Step {item.step} of 4
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {item.title}
                </h2>
                <p className="text-lg text-muted-foreground">{item.subtitle}</p>
                <p className="leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                <ul className="space-y-3 pt-2">
                  {item.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-3 text-sm"
                    >
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual mockup placeholder */}
              <div className="flex-1">
                <div
                  className={`relative aspect-[4/3] overflow-hidden rounded-2xl border bg-gradient-to-br ${item.gradient}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="space-y-4 text-center">
                      <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${item.accentColor}/10`}
                      >
                        <span className="text-3xl font-bold text-foreground/20">
                          {item.step}
                        </span>
                      </div>
                      <div className="space-y-2 px-8">
                        <div className="mx-auto h-3 w-32 rounded-full bg-foreground/5" />
                        <div className="mx-auto h-3 w-48 rounded-full bg-foreground/5" />
                        <div className="mx-auto h-3 w-40 rounded-full bg-foreground/5" />
                      </div>
                      <div className="flex justify-center gap-2 pt-2">
                        <div className="h-8 w-20 rounded-lg bg-foreground/5" />
                        <div className="h-8 w-20 rounded-lg bg-foreground/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Behind the Scenes */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What happens behind the scenes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sophisticated AI working invisibly so every call feels natural.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {behindTheScenes.map((item) => (
              <Card key={item.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
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
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Common questions
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-3xl space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border p-6">
              <h3 className="font-semibold">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start your free setup
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Get your AI calling agent configured and tested in minutes. No credit
            card required.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
              >
                Start Free Setup
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Inline SVG icons

function CheckCircleIcon({ className }: { className?: string }) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
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
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M12 18v4" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  HeartPulse,
  UtensilsCrossed,
  Building2,
  Send,
  Clock,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* -------------------------------------------------------------------------
 * Intent classification logic (keyword-based, no API calls)
 * ----------------------------------------------------------------------- */

interface IntentResult {
  intent: string;
  confidence: number;
  category: string;
  response: string;
}

const intentRules: {
  keywords: string[];
  intent: string;
  confidence: number;
  category: string;
  response: string;
}[] = [
  {
    keywords: ['appointment', 'schedule', 'book', 'doctor', 'visit', 'checkup', 'check-up'],
    intent: 'Schedule Appointment',
    confidence: 0.96,
    category: 'Healthcare',
    response:
      'I would be happy to help you schedule an appointment. We have openings this week on Wednesday at 2:00 PM and Thursday at 10:30 AM. Which works better for you?',
  },
  {
    keywords: ['cancel', 'reschedule', 'move', 'change appointment'],
    intent: 'Modify Appointment',
    confidence: 0.93,
    category: 'Healthcare',
    response:
      'Of course, I can help you reschedule. Could you give me your name or appointment reference number so I can pull up your booking?',
  },
  {
    keywords: ['reservation', 'table', 'dinner', 'lunch', 'brunch', 'party'],
    intent: 'Make Reservation',
    confidence: 0.95,
    category: 'Restaurant',
    response:
      'I would love to help you make a reservation. How many guests will be joining, and what date and time were you thinking?',
  },
  {
    keywords: ['menu', 'specials', 'vegan', 'vegetarian', 'gluten', 'allergy', 'allergen'],
    intent: 'Menu Inquiry',
    confidence: 0.91,
    category: 'Restaurant',
    response:
      'Great question. We update our specials daily. Today we have a pan-seared salmon and a mushroom risotto. We also have vegan, vegetarian, and gluten-free options. Would you like me to go through them?',
  },
  {
    keywords: ['listing', 'property', 'house', 'home', 'condo', 'apartment', 'bedroom', 'bath'],
    intent: 'Property Inquiry',
    confidence: 0.94,
    category: 'Real Estate',
    response:
      'Thanks for your interest. Could you tell me a bit more about what you are looking for, number of bedrooms, preferred neighborhood, and your budget range? I will match you with our best available listings.',
  },
  {
    keywords: ['showing', 'tour', 'view', 'open house', 'visit property'],
    intent: 'Schedule Showing',
    confidence: 0.95,
    category: 'Real Estate',
    response:
      'I can schedule a showing for you. We have availability tomorrow afternoon and Saturday morning. Which property are you interested in seeing?',
  },
  {
    keywords: ['price', 'cost', 'how much', 'pricing', 'fee', 'charge', 'rate'],
    intent: 'Pricing Inquiry',
    confidence: 0.89,
    category: 'General',
    response:
      'I can help with pricing information. Could you let me know which service or product you are asking about so I can give you accurate details?',
  },
  {
    keywords: ['hours', 'open', 'close', 'when', 'time'],
    intent: 'Hours Inquiry',
    confidence: 0.92,
    category: 'General',
    response:
      'We are open Monday through Friday from 9 AM to 6 PM, and Saturday from 10 AM to 4 PM. We are closed on Sundays. Is there anything else I can help with?',
  },
  {
    keywords: ['insurance', 'coverage', 'copay', 'deductible'],
    intent: 'Insurance Question',
    confidence: 0.9,
    category: 'Healthcare',
    response:
      'We accept most major insurance plans including Blue Cross, Aetna, Cigna, and UnitedHealthcare. I can verify your specific coverage if you provide your insurance ID number.',
  },
  {
    keywords: ['wait', 'waitlist', 'full', 'no availability'],
    intent: 'Waitlist Request',
    confidence: 0.88,
    category: 'Restaurant',
    response:
      'I understand, we are quite popular tonight. I can add you to our waitlist. The estimated wait is about 25 minutes. Can I get your name and phone number?',
  },
];

function classifyIntent(input: string): IntentResult {
  const lower = input.toLowerCase();
  let bestMatch: (typeof intentRules)[number] | null = null;
  let bestScore = 0;

  for (const rule of intentRules) {
    const matches = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestMatch = rule;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      category: bestMatch.category,
      response: bestMatch.response,
    };
  }

  return {
    intent: 'General Inquiry',
    confidence: 0.72,
    category: 'General',
    response:
      'Thank you for calling. I want to make sure I help you with exactly what you need. Could you tell me a bit more about what you are looking for?',
  };
}

/* -------------------------------------------------------------------------
 * Industry switcher + scenarios
 * ----------------------------------------------------------------------- */

const BRAND = 'var(--brand)';
const ACCENTS: Record<string, string> = {
  All: BRAND,
  Healthcare: 'var(--vertical-healthcare)',
  Restaurant: 'var(--vertical-restaurant)',
  'Real Estate': 'var(--vertical-realestate)',
};

const industryTabs = [
  { key: 'All', icon: Sparkles },
  { key: 'Healthcare', icon: HeartPulse },
  { key: 'Restaurant', icon: UtensilsCrossed },
  { key: 'Real Estate', icon: Building2 },
] as const;

const scenarios = [
  {
    category: 'Healthcare',
    input: 'I need to schedule an appointment with Dr. Smith for a checkup next week',
    label: 'Book an appointment',
  },
  {
    category: 'Restaurant',
    input: 'I would like to make a reservation for 4 people this Saturday at 7 PM',
    label: 'Make a reservation',
  },
  {
    category: 'Real Estate',
    input: 'I am interested in the 3 bedroom listing on Oak Street',
    label: 'Ask about a listing',
  },
  {
    category: 'General',
    input: 'What are your hours today?',
    label: 'Check the hours',
  },
];

const stats = [
  { label: 'Avg. response time', value: '1.2s' },
  { label: 'Intent accuracy', value: '96%' },
  { label: 'Customer satisfaction', value: '4.8/5' },
];

const tint = (accent: string, pct: number) =>
  `color-mix(in oklab, ${accent} ${pct}%, transparent)`;

/* -------------------------------------------------------------------------
 * Reduced-motion hook
 * ----------------------------------------------------------------------- */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/* -------------------------------------------------------------------------
 * Streaming agent bubble (typewriter)
 * ----------------------------------------------------------------------- */

interface Message {
  id: number;
  role: 'caller' | 'agent';
  text: string;
  meta?: { category: string; intent: string; confidence: number };
}

function AgentBubble({
  message,
  onDone,
}: {
  message: Message;
  onDone?: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? message.text.length : 0);

  useEffect(() => {
    if (reduced) {
      // Defer to a fresh frame rather than setting state synchronously in
      // the effect body (React discourages it — see set-state-in-effect).
      const frame = requestAnimationFrame(() => {
        setShown(message.text.length);
        onDone?.();
      });
      return () => cancelAnimationFrame(frame);
    }
    let i = 0;
    const resetFrame = requestAnimationFrame(() => setShown(0));
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= message.text.length) {
        window.clearInterval(id);
        onDone?.();
      }
    }, 18);
    return () => {
      cancelAnimationFrame(resetFrame);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, reduced]);

  const typing = shown < message.text.length;
  const accent = ACCENTS[message.meta?.category ?? 'General'] ?? BRAND;

  return (
    <div className="flex flex-col items-start gap-2">
      {message.meta ? (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          <Badge
            variant="outline"
            className="text-[11px]"
            style={{ borderColor: tint(accent, 40), color: accent }}
          >
            {message.meta.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {message.meta.intent} ·{' '}
            <span className="font-mono tabular-nums">
              {(message.meta.confidence * 100).toFixed(0)}%
            </span>{' '}
            confidence
          </span>
        </div>
      ) : null}
      <span className="inline-block max-w-[85%] rounded-lg rounded-bl-sm border border-brand/20 bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-foreground">
        {message.text.slice(0, shown)}
        {typing ? (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-current align-middle"
          />
        ) : null}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Page
 * ----------------------------------------------------------------------- */

export default function DemoPage() {
  const [activeIndustry, setActiveIndustry] = useState<string>('All');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'agent',
      text: 'Thanks for calling. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;

    const callerMsg: Message = { id: idRef.current++, role: 'caller', text };
    setMessages((prev) => [...prev, callerMsg]);
    setInput('');
    setThinking(true);
    scrollToBottom();

    const result = classifyIntent(text);
    window.setTimeout(() => {
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: idRef.current++,
          role: 'agent',
          text: result.response,
          meta: {
            category: result.category,
            intent: result.intent,
            confidence: result.confidence,
          },
        },
      ]);
      scrollToBottom();
    }, 650);
  };

  const visibleScenarios = scenarios.filter(
    (s) => activeIndustry === 'All' || s.category === activeIndustry
  );

  const headerAccent = ACCENTS[activeIndustry] ?? BRAND;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6">
              Interactive demo
            </Badge>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl">
              Talk to the agent
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Type what a caller might say and watch the agent classify the
              intent and respond in real time. Switch industries to see how the
              same words land differently.
            </p>
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Industry tabs */}
        <div
          className="flex flex-wrap gap-1 border-b"
          role="tablist"
          aria-label="Industry"
        >
          {industryTabs.map((tab) => {
            const active = activeIndustry === tab.key;
            const accent = ACCENTS[tab.key];
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveIndustry(tab.key)}
                className="relative -mb-px flex min-h-11 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                style={{
                  color: active ? accent : 'var(--muted-foreground)',
                }}
              >
                <tab.icon className="size-4" aria-hidden />
                {tab.key}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Chat window */}
        <Card className="mt-6 overflow-hidden p-0">
          {/* Header bar */}
          <div className="flex items-center gap-3 border-b bg-secondary/40 px-5 py-3">
            <span className="relative inline-flex" style={{ color: headerAccent }}>
              <span
                aria-hidden
                className="absolute inline-flex size-2.5 rounded-full opacity-70 animate-vv-ping"
                style={{ backgroundColor: 'currentColor' }}
              />
              <span
                className="relative inline-flex size-2.5 rounded-full"
                style={{ backgroundColor: 'currentColor' }}
              />
            </span>
            <span className="text-sm font-medium">
              {activeIndustry === 'All' ? 'VerticalVoice' : activeIndustry} agent
            </span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              live
            </span>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex max-h-[26rem] min-h-[20rem] flex-col gap-4 overflow-y-auto p-5"
          >
            {messages.map((msg) =>
              msg.role === 'agent' ? (
                <AgentBubble key={msg.id} message={msg} onDone={scrollToBottom} />
              ) : (
                <div key={msg.id} className="flex justify-end">
                  <span className="inline-block max-w-[85%] rounded-lg rounded-br-sm bg-secondary px-4 py-2.5 text-sm leading-relaxed text-secondary-foreground">
                    {msg.text}
                  </span>
                </div>
              )
            )}
            {thinking ? (
              <div className="flex items-center gap-2 pl-1 text-muted-foreground">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-current animate-vv-eq"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
                <span className="text-xs">Agent is thinking</span>
              </div>
            ) : null}
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 border-t px-5 py-3">
            {visibleScenarios.map((scenario) => (
              <button
                key={scenario.label}
                onClick={() => send(scenario.input)}
                disabled={thinking}
                className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {scenario.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <label htmlFor="caller-input" className="sr-only">
                What the caller says
              </label>
              <input
                id="caller-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type what a caller might say..."
                className="h-11 flex-1 rounded-lg border bg-card px-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <Button
                type="submit"
                size="lg"
                className="h-11 gap-2"
                disabled={thinking || !input.trim()}
              >
                <Send className="size-4" aria-hidden />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </Card>
      </section>

      {/* Stats */}
      <section className="border-y bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl tabular-nums sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample outcome */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="size-4" aria-hidden />
            Call duration: 1m 42s
          </span>
          <span className="flex items-center gap-2">
            <Target className="size-4" aria-hidden />
            Intent: Schedule Appointment
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            Outcome: Booked
          </span>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Ready to try it with your own business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Set up your custom AI agent in minutes. No credit card required.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                {brand.copy.ctaButton}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

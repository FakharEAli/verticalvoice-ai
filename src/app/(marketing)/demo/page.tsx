'use client';

import { useState } from 'react';
import Link from 'next/link';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// --- Intent classification logic (keyword-based, no API calls) ---

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
      'Great question! We update our specials daily. Today we have a pan-seared salmon and a mushroom risotto. We also have vegan, vegetarian, and gluten-free options available. Would you like me to go through them?',
  },
  {
    keywords: ['listing', 'property', 'house', 'home', 'condo', 'apartment', 'bedroom', 'bath'],
    intent: 'Property Inquiry',
    confidence: 0.94,
    category: 'Real Estate',
    response:
      'Thanks for your interest! Could you tell me a bit more about what you are looking for -- number of bedrooms, preferred neighborhood, and your budget range? I will match you with our best available listings.',
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
      'I can help with pricing information. Could you let me know which specific service or product you are asking about so I can give you accurate details?',
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
    confidence: 0.90,
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
      'I understand -- we are quite popular tonight! I can add you to our waitlist. The estimated wait is about 25 minutes. Can I get your name and phone number?',
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

// --- Demo scenarios ---

const scenarios = [
  {
    label: 'Healthcare',
    icon: HeartPulseIcon,
    input: 'I need to schedule an appointment with Dr. Smith for a checkup next week',
  },
  {
    label: 'Restaurant',
    icon: UtensilsIcon,
    input: 'I would like to make a reservation for 4 people this Saturday at 7 PM',
  },
  {
    label: 'Real Estate',
    icon: BuildingIcon,
    input: 'I am interested in the 3 bedroom listing on Oak Street',
  },
];

// --- Sample transcript ---

const sampleTranscript = [
  {
    role: 'caller' as const,
    text: 'Hi, I need to schedule an appointment with Dr. Martinez.',
  },
  {
    role: 'agent' as const,
    text: 'Of course! I would be happy to help you schedule an appointment with Dr. Martinez. Are you a new patient or returning?',
  },
  {
    role: 'caller' as const,
    text: 'I am a returning patient. My name is Sarah Johnson.',
  },
  {
    role: 'agent' as const,
    text: 'Welcome back, Sarah! I found your file. Dr. Martinez has openings on Wednesday at 2:00 PM and Friday at 11:00 AM. Do either of those work for you?',
  },
  {
    role: 'caller' as const,
    text: 'Wednesday at 2 works perfectly.',
  },
  {
    role: 'agent' as const,
    text: 'You are all set for Wednesday at 2:00 PM with Dr. Martinez. I will send a confirmation to the email on file. Is there anything else I can help with?',
  },
  {
    role: 'caller' as const,
    text: 'No, that is great. Thank you!',
  },
  {
    role: 'agent' as const,
    text: 'You are welcome, Sarah! We will see you on Wednesday. Have a great day!',
  },
];

const stats = [
  { label: 'Avg. response time', value: '1.2s' },
  { label: 'Intent accuracy', value: '96%' },
  { label: 'Customer satisfaction', value: '4.8/5' },
];

export default function DemoPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<IntentResult | null>(null);

  const handleClassify = () => {
    if (!input.trim()) return;
    setResult(classifyIntent(input));
  };

  const handleScenario = (text: string) => {
    setInput(text);
    setResult(classifyIntent(text));
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              Interactive Demo
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              See {brand.name} in Action
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Try the intent classifier, explore demo scenarios, and see how a
              real AI-handled call looks from start to finish.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intent Simulator */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Try the intent classifier
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Type something a caller might say and see how the AI classifies
              intent and generates a response.
            </p>
          </div>

          {/* Scenario buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {scenarios.map((scenario) => (
              <Button
                key={scenario.label}
                variant="outline"
                size="sm"
                onClick={() => handleScenario(scenario.input)}
                className="gap-2"
              >
                <scenario.icon className="h-4 w-4" />
                {scenario.label}
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="mt-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClassify()}
                placeholder="Type what a caller might say..."
                className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={handleClassify} size="lg">
                Classify
              </Button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>{result.category}</Badge>
                  <Badge variant="outline">{result.intent}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {(result.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    AI Agent Response
                  </p>
                  <p className="text-sm leading-relaxed">{result.response}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Sample Transcript */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sample call transcript
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                A real conversation between a caller and a VerticalVoice AI
                healthcare agent.
              </p>
            </div>

            <div className="mt-12 space-y-4">
              {sampleTranscript.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === 'agent' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'agent'
                        ? 'rounded-bl-md bg-primary/10 text-foreground'
                        : 'rounded-br-md bg-primary text-primary-foreground'
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                      {msg.role === 'agent' ? 'AI Agent' : 'Caller'}
                    </p>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Call duration: 1m 42s
              </div>
              <div className="flex items-center gap-2">
                <TargetIcon className="h-4 w-4" />
                Intent: Schedule Appointment
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                Outcome: Booked
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to try it with your own business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Set up your custom AI agent in minutes. No credit card required.
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

function HeartPulseIcon({ className }: { className?: string }) {
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
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}

function UtensilsIcon({ className }: { className?: string }) {
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
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
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

function ClockIcon({ className }: { className?: string }) {
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
      <polyline points="12 6 12 12 16 14" />
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

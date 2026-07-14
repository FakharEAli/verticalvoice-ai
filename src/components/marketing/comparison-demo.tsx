'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/* ---------------------------------------------------------------------------
 * Data
 * --------------------------------------------------------------------------- */

const responses = [
  {
    industry: 'Healthcare',
    icon: HeartPulseIcon,
    response:
      '"Of course -- I can help you with a same-day appointment. Before I check availability, could you let me know the reason for your visit so I can match you with the right provider? And are you an existing patient with us?"',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    accent: 'border-emerald-500/30',
  },
  {
    industry: 'Restaurant',
    icon: UtensilsIcon,
    response:
      '"Absolutely! We\'d love to have you. How many guests will be joining, and do you have a preferred time? I should mention our chef\'s special tonight is a pan-seared halibut that\'s been getting rave reviews."',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    accent: 'border-amber-500/30',
  },
  {
    industry: 'Real Estate',
    icon: BuildingIcon,
    response:
      '"Great timing -- I have several properties available for showing today. To find the best match, could you tell me what area you\'re looking in, your budget range, and how many bedrooms you need?"',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    accent: 'border-blue-500/30',
  },
];

/* ---------------------------------------------------------------------------
 * Component
 * --------------------------------------------------------------------------- */

export function ComparisonDemo() {
  const [active, setActive] = useState(0);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Caller prompt */}
      <div className="mb-8 rounded-xl border bg-muted/50 p-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <PhoneIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Incoming call
          </span>
        </div>
        <p className="text-lg font-medium">
          &quot;I need to come in today.&quot;
        </p>
      </div>

      {/* Tab buttons */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {responses.map((item, idx) => (
          <button
            key={item.industry}
            onClick={() => setActive(idx)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              active === idx
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.industry}
          </button>
        ))}
      </div>

      {/* Response cards */}
      {responses.map((item, idx) => (
        <div
          key={item.industry}
          className={active === idx ? 'block' : 'hidden'}
        >
          <Card className={`border-2 ${item.accent}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {item.industry} Agent
                  </CardTitle>
                  <CardDescription>AI response</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm leading-relaxed italic">
                  {item.response}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Inline SVG icons (scoped to this client component)
 * --------------------------------------------------------------------------- */

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

function PhoneIcon({ className }: { className?: string }) {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

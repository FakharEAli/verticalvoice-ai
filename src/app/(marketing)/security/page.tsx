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

export const metadata: Metadata = {
  title: 'Security & Privacy | VerticalVoice AI',
  description:
    'Enterprise-grade security for every call. Learn about our encryption, compliance, and data handling practices.',
};

const securitySections = [
  {
    title: 'Encryption',
    subtitle: 'Your data is protected at every layer',
    icon: ShieldIcon,
    items: [
      {
        label: 'AES-256 at rest',
        description:
          'All stored data -- call recordings, transcripts, and configuration -- is encrypted with AES-256, the same standard used by governments and financial institutions.',
      },
      {
        label: 'TLS 1.3 in transit',
        description:
          'Every connection between your browser, our API, and our infrastructure is secured with TLS 1.3, preventing eavesdropping and tampering.',
      },
      {
        label: 'End-to-end call encryption',
        description:
          'Voice data is encrypted from the moment it enters our system to the moment it is stored or discarded, with keys rotated regularly.',
      },
    ],
  },
  {
    title: 'Access Control',
    subtitle: 'Granular permissions for every team member',
    icon: LockIcon,
    items: [
      {
        label: 'Row Level Security (RLS)',
        description:
          'Database-level isolation ensures each organization can only access its own data. No shared tables, no cross-tenant leaks.',
      },
      {
        label: 'Role-based access',
        description:
          'Assign Owner, Admin, or Member roles with different permission sets. Control who can configure agents, view transcripts, or manage billing.',
      },
      {
        label: 'Team permissions',
        description:
          'Create teams within your organization and scope access to specific agents, industries, or dashboard sections.',
      },
    ],
  },
  {
    title: 'Audit Logging',
    subtitle: 'Complete visibility into every action',
    icon: ClipboardListIcon,
    items: [
      {
        label: 'Comprehensive action logging',
        description:
          'Every login, configuration change, agent update, and data export is logged with timestamp, user, IP address, and action details.',
      },
      {
        label: 'Exportable audit trail',
        description:
          'Download your full audit log as CSV or JSON for compliance reviews, incident investigations, or internal governance.',
      },
      {
        label: 'Real-time alerts',
        description:
          'Set up notifications for sensitive actions -- bulk data exports, permission changes, or unusual login patterns.',
      },
    ],
  },
  {
    title: 'Healthcare Compliance',
    subtitle: 'Built for HIPAA from the ground up',
    icon: HeartIcon,
    items: [
      {
        label: 'HIPAA-ready architecture',
        description:
          'Our infrastructure is designed to meet HIPAA Security Rule requirements, including physical, technical, and administrative safeguards.',
      },
      {
        label: 'Business Associate Agreement (BAA)',
        description:
          'Enterprise customers handling PHI can execute a BAA with VerticalVoice AI, establishing our obligations under HIPAA.',
      },
      {
        label: 'PHI handling practices',
        description:
          'Protected Health Information is handled with minimum-necessary principles, access logging, and automatic de-identification where possible.',
      },
    ],
  },
  {
    title: 'Data Handling',
    subtitle: 'You control your data, always',
    icon: DatabaseIcon,
    items: [
      {
        label: 'Data retention policies',
        description:
          'Configure how long call recordings and transcripts are stored. Choose from 30, 90, 180 days, or custom retention periods.',
      },
      {
        label: 'Right to deletion',
        description:
          'Request complete deletion of your data at any time. We process deletion requests within 72 hours and provide written confirmation.',
      },
      {
        label: 'Data portability',
        description:
          'Export all your data -- recordings, transcripts, analytics, configurations -- in standard formats (JSON, CSV, WAV) at any time.',
      },
    ],
  },
  {
    title: 'Infrastructure',
    subtitle: 'Enterprise-grade reliability and testing',
    icon: ServerIcon,
    items: [
      {
        label: 'SOC 2 Type II readiness',
        description:
          'Our controls and processes are designed to meet SOC 2 Type II requirements for security, availability, and confidentiality.',
      },
      {
        label: 'Regular penetration testing',
        description:
          'We engage independent security firms for quarterly penetration tests and continuous vulnerability scanning.',
      },
      {
        label: '99.9% uptime SLA',
        description:
          'Enterprise customers receive a 99.9% uptime guarantee backed by service credits. Our multi-region architecture ensures high availability.',
      },
    ],
  },
];

const complianceBadges = [
  {
    label: 'SOC 2',
    sublabel: 'Type II Ready',
    gradient: 'from-blue-600 to-blue-400',
  },
  {
    label: 'HIPAA',
    sublabel: 'Compliant',
    gradient: 'from-emerald-600 to-emerald-400',
  },
  {
    label: 'GDPR',
    sublabel: 'Compliant',
    gradient: 'from-purple-600 to-purple-400',
  },
  {
    label: 'TLS 1.3',
    sublabel: 'Encrypted',
    gradient: 'from-amber-600 to-amber-400',
  },
];

export default function SecurityPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldIcon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Enterprise-grade security for every call
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Your callers trust you with their information. We take that
              responsibility seriously with encryption, compliance, and
              transparency at every level.
            </p>
          </div>
        </div>
      </section>

      {/* Security Sections */}
      {securitySections.map((section, sectionIndex) => (
        <section
          key={section.title}
          className={sectionIndex % 2 === 1 ? 'border-y bg-muted/30' : ''}
        >
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
              {/* Section header */}
              <div className="lg:w-1/3 lg:sticky lg:top-24">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {section.title}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {section.subtitle}
                </p>
              </div>

              {/* Section items */}
              <div className="flex-1 space-y-6">
                {section.items.map((item) => (
                  <Card key={item.label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        {item.label}
                      </CardTitle>
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
          </div>
        </section>
      ))}

      {/* Compliance Badges */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Compliance and certifications
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We hold ourselves to the highest security standards.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {complianceBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${badge.gradient} text-white shadow-lg`}
                >
                  <span className="text-lg font-bold">{badge.label}</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {badge.sublabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Talk to our security team
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Have questions about compliance, data handling, or custom security
            requirements? Our team is ready to help.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={`mailto:${brand.support.email}`}>
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
              >
                Contact Security Team
              </Button>
            </Link>
            <Link href={brand.support.docs}>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-primary-foreground/20 px-8 text-base text-primary-foreground hover:bg-primary-foreground/10"
              >
                Read Security Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Inline SVG icons

function ShieldIcon({ className }: { className?: string }) {
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
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
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
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
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
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
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
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
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
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
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

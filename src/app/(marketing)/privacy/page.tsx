import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy | VerticalVoice AI',
  description: 'How VerticalVoice AI collects, uses, and protects data.',
};

const sections = [
  {
    title: 'Draft status',
    body: 'This is a draft privacy policy published for a final-year-project demonstration. It has not been reviewed by legal counsel and is not a binding commitment. Before any real commercial launch, this document will be replaced with a policy reviewed by a qualified privacy/data-protection lawyer, particularly given the multi-vertical (healthcare, restaurant, real estate) and multi-jurisdiction nature of the product.',
  },
  {
    title: 'Who this covers',
    body: 'VerticalVoice AI operates the platform. Each business ("tenant") using VerticalVoice AI is the data controller for their own end-customers’ data (callers, patients, diners, leads) — VerticalVoice AI acts as a data processor on the tenant’s behalf for call data.',
  },
  {
    title: 'What data is collected',
    body: 'Account and tenant data (business profiles, team member emails and names); call data (caller/called phone numbers, duration, recording, transcript); industry-specific data captured during calls (e.g. appointment details for healthcare, order/reservation details for restaurants, lead details for real estate); and usage/billing and audit-log data.',
  },
  {
    title: 'How data is collected',
    body: 'Directly from tenant admins during signup and setup; from end-customers via phone calls handled by the AI agent; and from telephony/voice providers (Twilio, Ultravox) via authenticated webhooks.',
  },
  {
    title: 'Recording and consent',
    body: 'Call recording consent requirements vary by jurisdiction (including two-party-consent states). Recording behavior is configurable per tenant. Businesses using this platform are responsible for complying with applicable consent laws in their jurisdiction.',
  },
  {
    title: 'Data retention and deletion',
    body: 'Tenant data is retained for the life of the account. Account owners can request data export or deletion through their dashboard settings or by contacting support.',
  },
  {
    title: 'Healthcare data (PHI)',
    body: 'Real protected health information (PHI) is not supported in the current deployment. Healthcare features operate in a synthetic/demo data mode only, pending the vendor agreements (including signed Business Associate Agreements) and security review required before handling real patient data.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy can be sent to support@verticalvoice.ai.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <div className="mt-10 space-y-6">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { brand } from '@/config/brand';

const productLinks = [
  { label: 'Industries', href: '/industries' },
  { label: 'How it Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Demo', href: '/demo' },
];

const industryLinks = [
  { label: 'Healthcare', href: '/industries/healthcare' },
  { label: 'Restaurant', href: '/industries/restaurant' },
  { label: 'Real Estate', href: '/industries/real-estate' },
];

const companyLinks = [
  { label: 'Security', href: '/security' },
  { label: 'Support', href: `mailto:${brand.support.email}` },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

const linkColumns = [
  { heading: 'Product', links: productLinks },
  { heading: 'Industries', links: industryLinks },
  { heading: 'Company', links: companyLinks },
  { heading: 'Legal', links: legalLinks },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-brand/20 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-4">
            <Link href="/" className="inline-flex min-h-11 items-center" aria-label={brand.name}>
              <Image
                src="/logo/full.svg"
                alt={brand.logoAlt}
                width={161}
                height={30}
                className="h-7 w-auto dark:hidden"
              />
              <Image
                src="/logo/full-reversed.svg"
                alt={brand.logoAlt}
                width={161}
                height={30}
                className="hidden h-7 w-auto dark:block"
              />
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              {brand.tagline}
            </p>
            <p className="text-sm text-muted-foreground/70">
              Built for your industry. Ready in minutes.
            </p>
            <div className="flex gap-4 pt-1">
              <a
                href={brand.social.linkedin}
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label="LinkedIn"
              >
                <LinkedInIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {linkColumns.map((column) => (
              <div key={column.heading}>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {column.heading}
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-11 items-center transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <p>{brand.copy.footerText}</p>
          <p>{brand.domain}</p>
        </div>
      </div>
    </footer>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

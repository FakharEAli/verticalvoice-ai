'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/button';

const navLinks = [
  {
    label: 'Industries',
    href: '/industries',
    children: [
      { label: 'Healthcare', href: '/industries/healthcare' },
      { label: 'Restaurant', href: '/industries/restaurant' },
      { label: 'Real Estate', href: '/industries/real-estate' },
    ],
  },
  { label: 'How it Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'Demo', href: '/demo' },
];

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center"
          aria-label={brand.name}
        >
          <Image
            src="/logo/full.svg"
            alt={brand.logoAlt}
            width={161}
            height={30}
            priority
            className="h-7 w-auto dark:hidden"
          />
          <Image
            src="/logo/full-reversed.svg"
            alt={brand.logoAlt}
            width={161}
            height={30}
            priority
            className="hidden h-7 w-auto dark:block"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) =>
            link.children ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setIndustriesOpen(true)}
                onMouseLeave={() => setIndustriesOpen(false)}
              >
                <Link
                  href={link.href}
                  className="group relative inline-flex min-h-11 items-center gap-1 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  aria-haspopup="true"
                  aria-expanded={industriesOpen}
                >
                  {link.label}
                  <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-brand transition-transform duration-150 ease-out group-hover:scale-x-100"
                  />
                </Link>
                {industriesOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="group relative inline-flex min-h-11 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-brand transition-transform duration-150 ease-out group-hover:scale-x-100"
                />
              </Link>
            )
          )}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login">
            <Button variant="ghost" className="min-h-11 px-4">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="min-h-11 px-5">{brand.copy.ctaButton}</Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile nav */}
      {mobileMenuOpen && (
        <div id="mobile-nav" className="border-t border-border px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <div key={link.label}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="ml-4">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground/70 hover:text-foreground"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="min-h-11 w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup" className="flex-1">
                <Button className="min-h-11 w-full">
                  {brand.copy.ctaButton}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
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

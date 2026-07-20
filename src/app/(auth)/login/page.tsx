'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/database/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { GoogleButton, OrDivider, PasswordField } from '@/components/auth/auth-ui';

type AuthMode = 'password' | 'magic-link';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by the signup page after it creates an auto-confirmed account: there is
  // no verification email, so signup sends the user here to sign in.
  const justRegistered = searchParams.get('registered') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('password');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const supabase = createClient();

  function validateEmail() {
    if (!email) return setEmailError('Email is required'), false;
    if (!EMAIL_RE.test(email)) return setEmailError('Enter a valid email address'), false;
    setEmailError('');
    return true;
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Signed in successfully');
    router.push('/dashboard');
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setLoading(false);
    toast.success('Magic link sent! Check your email.');
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  if (magicLinkSent) {
    return (
      <AuthSplitShell>
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <MailIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a magic link to <strong className="text-foreground">{email}</strong>.
            Click the link in the email to sign in.
          </p>
          <Button
            variant="ghost"
            className="mt-6 h-11"
            onClick={() => {
              setMagicLinkSent(false);
              setMode('password');
            }}
          >
            Back to sign in
          </Button>
        </div>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell>
      <div>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {justRegistered ? 'Your account is ready' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {justRegistered
              ? 'Sign in with the email and password you just chose to finish setting up.'
              : 'Sign in to your account to continue.'}
          </p>
        </header>

        <GoogleButton onClick={handleGoogle} loading={loading} />

        <div className="my-6">
          <OrDivider />
        </div>

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                required
                autoComplete="email"
              />
              {emailError ? (
                <p id="email-error" className="text-xs text-destructive">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-brand"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordField
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() =>
                  setPasswordError(password ? '' : 'Password is required')
                }
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
                required
                autoComplete="current-password"
              />
              {passwordError ? (
                <p id="password-error" className="text-xs text-destructive">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'magic-email-error' : undefined}
                required
                autoComplete="email"
              />
              {emailError ? (
                <p id="magic-email-error" className="text-xs text-destructive">
                  {emailError}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                We&apos;ll email you a one-time sign-in link.
              </p>
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send magic link'}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() =>
            setMode(mode === 'password' ? 'magic-link' : 'password')
          }
          className="mt-4 w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-brand"
        >
          {mode === 'password'
            ? 'Email me a magic link instead'
            : 'Sign in with password instead'}
        </button>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link
            href="/signup"
            className="font-medium text-foreground transition-colors hover:text-brand"
          >
            Start free trial
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

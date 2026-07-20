'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/database/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { PasswordField, PasswordStrengthMeter } from '@/components/auth/auth-ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Email verification is disabled (accounts are auto-confirmed), so there is
    // no link to wait for — the old "check your email" screen was a dead end.
    // Auto-confirm also signs the user straight in; clear that session so the
    // next screen is a real sign-in, as requested, rather than a silent skip.
    if (data.session) {
      await supabase.auth.signOut();
    }
    window.location.assign('/login?registered=1');
  }

  return (
    <AuthSplitShell>
      <div>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start free. Deploy AI calling agents in minutes.
          </p>
        </header>

        <form onSubmit={handleSignup} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() =>
                setNameError(fullName.trim() ? '' : 'Name is required')
              }
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
              required
              autoComplete="name"
            />
            {nameError ? (
              <p id="name-error" className="text-xs text-destructive">
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() =>
                setEmailError(
                  !email
                    ? 'Email is required'
                    : EMAIL_RE.test(email)
                      ? ''
                      : 'Enter a valid email address',
                )
              }
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
            <Label htmlFor="password">Password</Label>
            <PasswordField
              id="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() =>
                setPasswordError(
                  password.length >= 8
                    ? ''
                    : 'Use at least 8 characters',
                )
              }
              aria-invalid={!!passwordError}
              aria-describedby="password-hint password-error"
              required
              minLength={8}
              autoComplete="new-password"
            />
            {password ? <PasswordStrengthMeter password={password} /> : null}
            {passwordError ? (
              <p id="password-error" className="text-xs text-destructive">
                {passwordError}
              </p>
            ) : (
              <p id="password-hint" className="text-xs text-muted-foreground">
                Must be at least 8 characters.
              </p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="terms"
              className="text-xs font-normal leading-relaxed text-muted-foreground"
            >
              I agree to the{' '}
              <Link href="/terms" className="font-medium text-foreground hover:text-brand">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium text-foreground hover:text-brand">
                Privacy Policy
              </Link>
              .
            </Label>
          </div>

          <Button
            type="submit"
            className="h-11 w-full"
            disabled={loading || !agreed}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground transition-colors hover:text-brand"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}


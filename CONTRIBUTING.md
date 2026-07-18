# Contributing to VerticalVoice AI

VerticalVoice AI is a Final Year Project from the **Business Analytics &
Programming** program at **DHA Suffa University**, built by Fakhar Ali
(Group Leader), Muhammad Aman, Saad Hasan, and Ahmed Peerani, under the
supervision of Dr. Arif Imtiaz and Dr. Huma Jamshaid. It is also a real,
deployed product (https://verticalvoice.alphaos.tech), and we treat
contributions with the same rigor a production codebase deserves.

This guide gets you from a fresh clone to a running app and a passing PR.

## Prerequisites

- **Node.js 20** (matches `.github/workflows/ci.yml`)
- **npm** (repo ships a `package-lock.json` — don't switch package managers)
- **Supabase CLI** (`brew install supabase/tap/supabase` or see
  [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)) and
  **Docker**, to run a local Supabase stack
- No telephony or voice-AI accounts are required to develop locally — see
  below.

## Local setup

```bash
git clone https://github.com/alifakhar816/verticalvoice-ai.git
cd verticalvoice-ai
npm install
cp .env.example .env.local     # fill in Supabase keys after supabase start
supabase start                 # starts local Supabase (Docker required)
npm run dev
```

Open http://localhost:3000. For the full walkthrough — seeding demo data
and authenticating as the demo user — see
[`docs/architecture/DEPLOYMENT.md`](docs/architecture/DEPLOYMENT.md).

### You do not need carrier credentials to contribute

`.env.example` defaults to:

```
VOICE_PROVIDER=mock
TELEPHONY_PROVIDER=mock
```

With both set to `mock`, the app runs end-to-end — calls, transcripts,
tool-calling, the Test Center — without a Twilio, Telnyx, or Ultravox
account. Only switch to `twilio` / `telnyx` / `ultravox` / `retell` if
you're specifically working on a provider adapter
(`src/providers/telephony/`, `src/providers/voice/`) and have your own
sandbox credentials for it.

## Before you open a PR

Run the same checks CI runs (`.github/workflows/ci.yml`):

```bash
npx tsc --noEmit     # type check — must be clean, strict mode
npx eslint .          # lint (same as: npm run lint)
npm run build         # production build
npx vitest run        # unit tests (same as: npm test)
```

All four must pass. CI also runs on every push/PR to `master`; a red CI
check will block review.

## Project structure

A quick map so you know where to look/add code:

```
src/domain/         Core business logic per concept (agents, calls, consent,
                     scheduling, tenants, usage, users, privacy...) —
                     provider-agnostic, no HTTP/Twilio/Supabase-client leakage.
src/industries/      Vertical packs (healthcare, restaurant, real-estate) that
                     configure intents, tools, and policies on top of
                     src/domain — this is where industry-specific behavior lives.
src/providers/       Swappable infrastructure adapters: telephony/
                     (twilio, telnyx, mock) and voice/ (ultravox, retell, mock).
                     All implement a shared interface — see providers/telephony/types.ts.
src/integrations/    Third-party systems: calendars, CRM (HubSpot), EHR,
                     messaging, POS (Square), reservations.
src/lib/             Cross-cutting infrastructure: auth, security, encryption,
                     idempotency, observability, telephony tokens, tools
                     gateway, validation, webhooks.
src/workers/         Background/async jobs: call-normalizer, evaluations,
                     outbound calling, website-import.
```

If you're adding new vertical-specific behavior, it almost always belongs
in `src/industries/<vertical>`, calling down into `src/domain`. If you're
adding a new telephony/voice backend, implement the interface in
`src/providers/`.

## Commit messages

**Going forward, use [Conventional Commits](https://www.conventionalcommits.org/):**

```
feat: add outbound consent capture to onboarding wizard
fix: telnyx webhook signature verification returns false negatives
docs: clarify mock provider setup in CONTRIBUTING
```

Note: the existing git history mixes Conventional Commits (`feat:`, `fix:`)
with plain descriptive messages from earlier in the project. That's a known
inconsistency from before this convention was standardized — please use
Conventional Commits for all new commits so the history is consistent from
here forward.

## Branch naming

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

Branch from `master`, keep branches scoped to one change.

## Pull request process

1. Open a PR against `master` — the template will prompt you for lint/type/
   test status, migrations, feature flags, docs, and tenant-isolation impact.
2. Make sure CI is green.
3. If you touched anything security- or tenant-isolation-relevant (RLS
   policies, `src/lib/security/`, `src/lib/telephony/tool-token.ts`,
   `src/providers/telephony/*/adapter.ts` webhook validation), call that out
   explicitly in the PR description — see [SECURITY.md](SECURITY.md) for
   the security model these changes interact with.
4. Squash-friendly PRs are preferred (keep the commit history readable).

## Reporting bugs / requesting features

Use the issue forms under **New Issue** (`.github/ISSUE_TEMPLATE/`) — they
ask for the vertical (healthcare/restaurant/real-estate), provider mode
(mock vs. live), and call ID where relevant, which is usually enough to
reproduce voice/telephony issues without back-and-forth.

## Using Claude Code

This repo includes `.claude/CLAUDE.md` / `.claude/AGENTS.md` with project context for AI
coding agents. If you're using Claude Code, it will pick this up
automatically — it's worth reading before diving into `src/domain` and
`src/industries`, since the vertical-pack pattern isn't obvious from file
names alone.

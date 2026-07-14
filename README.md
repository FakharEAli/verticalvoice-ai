# VerticalVoice AI

Multi-tenant, multi-vertical AI voice agent platform — one core engine,
industry-specific packs (healthcare, restaurant, real estate) that plug in
intents, tools, policies, and compliance guardrails for each vertical.

[![CI](https://github.com/alifakhar816/verticalvoice-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/alifakhar816/verticalvoice-ai/actions)

## Tech stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security, email/password + magic link + Google OAuth)
- **Voice runtime**: Ultravox (primary), Retell (fallback), mock provider for local dev
- **Telephony**: Twilio (primary), Telnyx (cost-optimized), mock provider for local dev
- **Styling/UI**: Tailwind CSS 4 + shadcn/ui
- **Validation**: Zod
- **Integrations**: Google Calendar, Square (restaurant POS), HubSpot (real estate CRM), Resend (email)

See `docs/architecture/INVENTORY.md` for the full technology and file-structure breakdown.

## Quickstart

```bash
git clone https://github.com/alifakhar816/verticalvoice-ai.git
cd verticalvoice-ai
npm install
cp .env.example .env.local   # fill in Supabase keys once `supabase start` is running
supabase start                # starts local Supabase (Docker required)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local dev runs with
`VOICE_PROVIDER=mock` and `TELEPHONY_PROVIDER=mock` by default, so no
external voice/telephony credentials are required to explore the app.

`supabase/seed.sql` creates demo tenant/agent data plus a demo user
(`demo@verticalvoice.ai`), but does not set a login password — that requires
a separate Supabase Admin API call. See
[`docs/architecture/DEPLOYMENT.md`](docs/architecture/DEPLOYMENT.md) for the
full local setup walkthrough, including how to seed and authenticate as the
demo user.

## Documentation

- [`docs/architecture/`](docs/architecture/) — system inventory, ADRs, deployment guide, feature flags
- [`docs/runbooks/`](docs/runbooks/) — operational runbooks
- [`docs/compliance/`](docs/compliance/) — PHI handling, outbound-calling compliance checklists

## License

MIT — see [LICENSE](LICENSE).

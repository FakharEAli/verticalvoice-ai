## Summary

<!-- What does this change do, and why? -->

## Checklist

- [ ] `npx tsc --noEmit` passes (strict TypeScript)
- [ ] `npx eslint .` passes
- [ ] `npx vitest run` passes (and I added/updated tests for the behavior I changed)
- [ ] `npm run build` succeeds
- [ ] Database migrations are included under `supabase/migrations/` if this PR changes the schema, and RLS policies were updated/reviewed accordingly
- [ ] A feature flag was added/used if this PR ships user-facing behavior that isn't ready for all tenants (see `docs/architecture/` for the feature-flag convention)
- [ ] Documentation was updated if this PR changes setup, environment variables, architecture, or user-facing behavior (`README.md`, `.claude/CLAUDE.md`/`.claude/AGENTS.md`, `docs/`)
- [ ] No secrets, API keys, or real tenant/patient/customer data are committed (check `.env`, fixtures, test data, and log output in this diff)
- [ ] Tenant-isolation impact considered — if this touches RLS policies, the tool gateway, webhook handlers, or any service-role code path, I've thought through whether it could leak data across tenants

## Tenant-isolation / security notes

<!--
If this PR touches src/lib/security/, src/lib/telephony/tool-token.ts,
RLS policies, or any provider webhook validation (src/providers/telephony/*/adapter.ts),
describe the change and its isolation impact here. Otherwise, write "N/A".
-->

## How to test

<!-- Steps to verify this change, ideally runnable with VOICE_PROVIDER=mock / TELEPHONY_PROVIDER=mock -->

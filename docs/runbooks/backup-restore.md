# Backup & Restore Runbook

How Supabase backups work for this project, and a step-by-step drill for
actually testing a restore (not just trusting that backups exist).

## How Supabase backups work

### Local development

Local Supabase (via the `supabase` CLI, config at `supabase/config.toml`)
has no automatic backup — it's a disposable Postgres container. To snapshot
the local database:

```bash
# Dump the full local database (schema + data) to a file
supabase db dump --local -f backup-$(date +%Y%m%d-%H%M%S).sql

# Schema-only dump (useful for diffing against migrations/)
supabase db dump --local --schema public -f schema-only.sql
```

To restore a local dump into a fresh local instance:

```bash
supabase db reset            # rebuilds local DB from supabase/migrations/
psql "$(supabase status -o json | jq -r '.DB_URL')" -f backup-YYYYMMDD-HHMMSS.sql
```

Local dumps are for developer convenience (e.g. capturing seed data changes)
— they are **not** a production backup strategy.

### Cloud (production Supabase project)

Supabase Cloud projects get automatic backups managed by Supabase:

- **Daily backups** — included on all paid plans; retention depends on
  plan tier (check the project's Settings → Database → Backups page for
  the actual retention window configured for this project).
- **Point-in-time recovery (PITR)** — available on Pro plan and above via
  WAL (write-ahead log) archiving. Lets you restore to any point within the
  retention window, not just daily snapshot boundaries. Verify PITR is
  actually enabled for the production project — it is not on by default on
  every plan tier.

Backups and PITR are managed entirely through the Supabase dashboard
(Project → Database → Backups) or the Supabase Management API — there is no
custom backup tooling in this repo. **Action item:** confirm which plan tier
and retention window production is actually on; this runbook assumes PITR
is available but that must be verified against the live project settings,
not assumed from this document.

### What's NOT backed up by Supabase's DB backups

- Any files in Supabase Storage (call recordings, uploaded documents) — these
  need their own backup/versioning strategy if used. Check whether
  `recording_url` / `logo_url` etc point at Supabase Storage or an external
  provider, and back that up separately if it's the former.
- Anything outside the database (env vars/secrets, external provider
  configuration like Twilio/Telnyx number provisioning) — those live in
  their respective provider dashboards and your secrets manager, not in a
  Supabase backup.

---

## Restore drill procedure

Run this drill periodically (recommended: quarterly, or after any major
schema change) to verify backups are actually restorable — an untested
backup is not a backup.

### 1. Pick a target point

Choose either:
- The most recent daily backup, or
- A specific point-in-time (if PITR is enabled) — e.g. "5 minutes before a
  known-bad migration was applied."

### 2. Restore into an isolated environment — never restore over production

Use a Supabase **branch** (if using Supabase branching) or a **separate
throwaway project**, not the production project itself, for the drill.

Via the dashboard:
1. Project → Database → Backups.
2. Select the backup/point-in-time to restore.
3. Restore **into a new project** (or a database branch), not in place.

### 3. Verify the restore

Once the restored copy is live:

```bash
# Point the CLI / a local .env at the restored project's connection string,
# then sanity-check row counts against what you expect for that point in time.
```

Checklist:
- [ ] `tenants` row count and a spot-checked tenant's `business_profiles`
      row match expectations for the restore point.
- [ ] `calls` / `call_transcripts` for a recently-active tenant are present
      and match `audit_events` timestamps around the restore point.
- [ ] `usage_ledger` totals for a known tenant/period roughly match what
      billing/usage dashboards showed at that time.
- [ ] Run `npx tsc --noEmit` and a smoke test of a few API routes against
      the restored DB's connection string to confirm the schema is
      compatible with the current app code (a restore from months ago may
      predate migrations the app now depends on — see
      `supabase/migrations/` for the current migration set).

### 4. Tear down

Delete the throwaway restored project/branch once verification is complete
— don't leave a second copy of tenant data sitting around indefinitely
(see `docs/compliance/known-limitations.md` on data retention).

### 5. Record the drill

Log the date, target restore point, who ran it, and pass/fail plus any
issues found (e.g. "PITR window was shorter than expected", "restore took
40 minutes", "schema drift found between backup and current migrations").
This repo does not yet have a dedicated place to log drill history — until
one exists, record it in your team's incident/ops log referenced from
`docs/runbooks/incident-response.md`.

---

## If you actually need to restore production (real incident)

1. Follow `docs/runbooks/incident-response.md` → "Database issue" first —
   stop writes / roll back the bad deploy before restoring, so you don't
   restore into a system that's still actively corrupting data.
2. Prefer PITR to the exact moment before the incident over a daily
   snapshot, if available — it minimizes data loss.
3. Restoring the actual production project (not a drill copy) is
   destructive to any writes made after the restore point. Get explicit
   sign-off before doing this outside of the drill procedure above.
4. After restoring, re-run the verification checklist from the drill
   procedure before declaring the incident resolved.

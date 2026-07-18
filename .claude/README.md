# `.claude/` — local development tooling configuration

This directory holds configuration for the AI-assisted development tooling
used while building VerticalVoice AI. **Nothing here affects the running
application.** It is not imported by `src/`, not bundled by Next.js, and has
no effect on a production build or deployment.

## Contents

| File | Purpose |
|---|---|
| `CLAUDE.md` | Entry point loaded automatically by Claude Code. Imports `AGENTS.md`. |
| `AGENTS.md` | Project-specific rules for AI coding agents working in this repo. |
| `launch.json` | Local dev-server launch configuration. |
| `state/` | Transient local agent state. Gitignored — never committed. |

## Why these files live here rather than at the repository root

`CLAUDE.md` and `AGENTS.md` were previously at the repository root. They were
moved here to keep the root directory focused on the project itself, while
keeping the tooling configuration versioned in the repository so that cloning
the repo preserves the development workflow.

This works because Claude Code discovers project memory at **both**
`<repo>/CLAUDE.md` and `<repo>/.claude/CLAUDE.md`, and because `@`-imports
inside a memory file resolve relative to the directory of the importing file
— so the `@AGENTS.md` reference in `.claude/CLAUDE.md` resolves to
`.claude/AGENTS.md`. Verified against Claude Code v2.1.193.

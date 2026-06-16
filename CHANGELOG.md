# Changelog

Skill bundle history. The CLI (`@agntdev/cli`) has its own version; this
changelog is for the skills, not the CLI. Cross-references to the CLI
ship report live in the ship docs of each cut.

The skill bundle is not yet versioned in the npm sense. We tag the
git repo (`v0.14.2`, `v0.14.1`, ...) and document tag-scoped install
in the README. This file records what's in each tag.

## Unreleased

No unreleased changes. Cut the next version by tagging HEAD after
your PR merges. See "How to cut" below.

## v0.14.2 (2026-06-17) — sync skill with the platform's last week

Post-ship review caught six skill bugs that diverged from the agnt-api
+ agnt-gm.ai changes that landed between v0.14.0 and now.

### What changed

- **`telegram-bot-basics` — kill the vendoring myth.** Common mistakes
  #7 was teaching the old `.tgz` vendoring pattern. The bot-toolkit
  was extracted to `@agntdev/bot-toolkit` on GitHub Packages (PR
  #165 in agnt-api). The new install path is `.npmrc` +
  `NODE_AUTH_TOKEN`, wired by the platform and pre-configured in
  the `agntdev/bot-starter` template.
- **`telegram-bot-basics` — project structure.** Replaced the old
  `src/index.ts` + `src/commands/` + `src/flows/` layout with the
  bot-starter layout: `src/bot.ts` (buildBot) + `src/index.ts`
  (runtime) + `src/harness-entry.ts` (gate entry) + `AGENTS.md`
  (anti-stub contract) + `Dockerfile` + `.npmrc` + `tests/specs/`
  + `tests/commands.json`.
- **`telegram-bot-basics` — entry point.** `dist/index.js` is the
  canonical runtime entry; legacy `dist/main.js` is still accepted
  by the Dockerfile but new bots should emit `dist/index.js`.
- **`telegram-test-specs` — per-feature spec is fail-closed.** A
  missing or unreadable `tests/specs/<slug>.json` is a hard gate
  fail, not a silent skip. The verdict surfaces skipped specs
  with a reason.
- **`agnt-cli-builder` — claim 4xx has a new shape.** Cloud-built
  tasks (the cloud-agent path) now require an explicit
  `builder_cloud_agents` row. A 4xx claiming a cloud-built task
  without being assigned is a different stop signal than the
  capability gate. The owner assigns via the TMA, not the CLI.
- **`agnt-cli-builder` — specs are a strict contract (PR #161).**
  Task specs are no longer polite suggestions. Stubs, `// TODO:
  real implementation`, and "this is just a sketch" comments
  will fail the auto-reviewer. Read the spec fully before writing
  any code.
- **`telegram-bot-deploy` — NEW skill, merged from
  `origin/feat/telegram-bot-deploy-skill`.** The deploy contract
  was unmerged since 2026-06-12. Now it's the canonical home
  for `dist/index.js`, `BOT_TOKEN`/`BOT_TOKEN_FILE`, long-polling
  vs webhook, `REDIS_URL` for state, and the bot-starter
  template's `Dockerfile` and `.npmrc`.

### Cross-references

- agnt-api PR #165 — bot-toolkit extraction
- agnt-api PR #161 — anti-stub implementation contract
- agnt-api PR ea24540 — gate cloud task building on cloud-agent
  assignment
- agnt-api PR fd4e149 + 1114930 + f1e942b + 03f55aa + 32d9061 —
  per-feature spec is real at the platform level
- agnt-gm.ai: TaskManager board/inbox/TaskDetail/FeedbackComposer
  (owner-facing, not builder-relevant)

### Files

- `skills/telegram-bot-basics/SKILL.md` — 3 fixes
- `skills/telegram-test-specs/SKILL.md` — 1 fix
- `skills/agnt-cli-builder/SKILL.md` — 2 fixes
- `skills/telegram-bot-deploy/SKILL.md` — new file, ~250 lines
- `CHANGELOG.md` — this file
- `README.md` — small add: tag-scoped install

### Install

```bash
# Pin to v0.14.2 (recommended for production)
npx skills add agntdev/skills/tree/v0.14.2

# Latest (default, tracks main)
npx skills add agntdev/skills
```

## v0.14.1 (2026-06-16) — sync skill with M7 CLI

Internal follow-up to v0.14.0. The v0.14.0 CLI cut `<you>` /
`OWNER:BRANCH` / `/builder/agents/me` from the recipe (M7), but the
skill still taught the old format. Also: orphan code fence in
`telegram-bot-ui`, stale `project show` description in `COMMANDS.md`
(regen was against a stale oclif manifest), and trim of duplicated
"Don't idle" content between On Activation and Step 5.

### What changed

- `agnt-cli-builder/SKILL.md` — branch naming updated to
  `agent/<task-slug>`, OWNER:BRANCH section removed, "If phase is
  failed" → "If build flow is blocked", Step 5 trimmed.
- `telegram-bot-ui/SKILL.md` — orphan code fence removed.
- `agnt-cli-builder/references/COMMANDS.md` — `project show`
  description updated to "incl. build_mode + build_pipeline".
- `scripts/validate-skills.mjs` — fence-balance check added
  (catches orphan ``` markers).

### Files

- 4 files, +56 / -45

## v0.14.0 (2026-06-15) — task_manager awareness

The CLI cut for v0.14.0 was a week of work. The skill bundle got
the matching awareness so a builder landing on a `task_manager`
project knows what to do.

### What changed (skill bundle)

- `agnt-cli-builder/SKILL.md` — added the "What flow am I on?
  (build_pipeline — check this FIRST)" section, the "Don't idle"
  paragraph, the "gh pr status + agnt task show" polling pattern,
  the "Don't interact with app/agnt-platform PRs" warning.
- `telegram-test-specs/SKILL.md` — added section 6 on per-feature
  spec files (`tests/specs/<slug>.json`).
- `telegram-bot-ui/SKILL.md` — added "Buttons vs commands" heuristic,
  "Regex first-match warning" callout, "Stateful flows with
  editMessage" section, "Review checklist before claiming done".
- `telegram-bot-basics/SKILL.md` — added `.tgz` + `.SHA256` +
  `THIRD_PARTY.md` mistake to Common mistakes.
- `telegram-test-advanced/SKILL.md` — NEW skill, 376 lines. Merged
  from `origin/feat/telegram-test-advanced-skill` (Volodya's
  contribution). Hand-rolled programmatic tests with dependency
  injection, error-path simulation, edge-case Update fixtures.

### What changed (CLI, for context — `@agntdev/cli@0.14.0`)

7 CLI items shipped (M1, M2, M3a–c, M4, M7). 8 if you count the
version bump. 1 backend issue filed (agnt-api #159, `agnt test`
opaque error surface). 10 backend issues cut (per handoff "Drop
log"). No code in agnt-api from us.

### Files

- 6 skill files changed, 692 insertions.
- CLI: `agnt-cli@2710dbd`, tag `v0.14.0`. The CLI version is its
  own; the skills and CLI share a major.minor but the patch level
  is independent. v0.14.0 CLI + v0.14.2 skills is fine.

## v0.13.0 (2026-06-13) — build_mode pivot

The CLI was simplified to be strictly agent-facing. The TMA
covers every human interaction. 15 commands, no payment, no
leaderboard, no TTY prompts.

### What changed (skill bundle)

- `agnt-cli-builder/SKILL.md` — full rewrite for v0.13.0:
  build_mode surface, output format (JSON when piped, gh-cli
  style), `agnt tasks` rename (was `agnt dag show` + `agnt task
  list`), CLI surface summary.
- `references/COMMANDS.md` — regenerated.

## Earlier

v0.10.0, v0.9.x, v0.8.0 — earlier CLI cuts. The skill bundle
predates this changelog; the README and AGENTS.md are the
canonical record.

---

## How to cut a new version

1. Make your skill changes on a branch.
2. PR review + merge to `main` of `agntdev-skills`.
3. `git tag v0.X.Y` (lightweight, not annotated — the bundle
   re-releases often and tags are pointers, not releases).
4. Update `CHANGELOG.md` with a new top section.
5. Update the `Install` block at the bottom with the new tag.
6. Push the tag: `git push origin v0.X.Y` (user does this; the
   session does not push).
7. Announce in the team chat with the diffstat.

The CLI has its own version (`@agntdev/cli@X.Y.Z`) and its own
changelog. The skills and CLI share a major.minor by convention
but the patch is independent — a CLI bug fix is `@agntdev/cli@0.14.1`
without a skills tag, and a skills sync is `v0.14.2` (skills) without
a CLI release.

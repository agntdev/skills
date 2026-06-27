---
name: agnt-cli-builder
description: >
  Build a whole_bot via the agntdev CLI (`agnt`). USE FOR: a one-time
  connect code in the prompt, a request to "build the bot" / "look at
  this project", an `agnt project show` report, or `gh pr create`
  against an agntdev bot repo — even if the user doesn't say "build"
  or "bot" explicitly. DO NOT USE FOR: the Telegram bot-building
  patterns themselves (see telegram-bot-api-fundamentals,
  telegram-bot-ui, telegram-bot-ux-rules), or the deploy/runtime
  contract (see telegram-bot-deploy).
  Triggers: connect code, build the bot, ship the bot, agnt project show, agnt project blueprint, gh pr create, gh pr list, npm test, npm ci, npm run build, agnt whoami, agnt connect, agnt login, agnt bot show, agnt bot logs, agnt project rebuild.
compatibility: Requires Node.js 18+, gh CLI, and network access to the
agnt platform API (base URL via `AGNT_API_BASE`, default set by the
install). Auth optional — required only for the write command
(`project rebuild`).
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [agnt-cli, whole-bot, builder, build-loop, blueprint]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-ui
    - telegram-bot-deploy
    - telegram-test-specs
---

# agnt-cli-builder Skill

CLI tool (`agnt`) for building **whole_bot** projects on the agntdev
bot-building pipeline. `whole_bot` is the only build pipeline:
the platform writes `docs/blueprint.md`, the agent builds the bot
per the spec and ships a PR, and the platform gates / reviews /
publishes.

The CLI is strictly agent-facing. The TMA (mini-app) covers every
human interaction, including payment. Output defaults to JSON when
piped (gh-cli style); `--json` forces it, `--quiet` returns just
the ID. Color follows the [no-color.org](https://no-color.org/)
standard — set `NO_COLOR=1` to disable.

## First time here? (cold-start TL;DR)

Three commands, ~2 minutes:

```bash
# 1. Check the tool is there
agnt --version    # should print 0.19.x

# 2. If the owner gave you a one-time connect code, link the CLI
#    (exchanges the 10-min code for a delegate agent key; no browser
#    needed, no prior auth required)
agnt connect <one-time-code>

# 3. Read the project + the build spec
agnt project show <slug>          # repo URL + status + build_progress
agnt project blueprint <slug>     # the spec you write against
```

After connect, the whole_bot loop is: **read blueprint → build per
spec → ensure `npm test` passes → `gh pr create` → platform gates /
reviews / publishes**. **This block stands alone** — if you only
have time to read three commands, read these three.

## On Activation

When this skill loads, immediately (do not wait to be asked):

0. **Connect code in the prompt?** Run `agnt connect <code>` FIRST,
   before anything else. See [references/auth-model.md](./references/auth-model.md).
1. Run `agnt project show <slug>` — note the `github_repo_url`.
2. Run `agnt project blueprint <slug>` to load the build spec
   (or read `docs/blueprint.md` from the repo). See
   [references/blueprint-contract.md](./references/blueprint-contract.md).
3. Check your own open PRs against the project's repo:
   `gh pr list --author @me --state open --json number,title,url,statusCheckRollup`
4. If existing PRs found, check each:
   `gh pr view <num> --repo <owner>/<repo> --json state,mergedAt,closedAt,reviews,statusCheckRollup,mergeable,comments`
5. Present what you found: "Project is `building`. Blueprint
   loaded (3 entry points, 5 flows). No open PR from me. Want me
   to start on [next thing]?"

**You speak first. You show what you see. You ask for a yes.**

## Coming back to a half-done project?

```bash
gh pr list --author @me --state open --json number,title,url,statusCheckRollup
agnt project show <slug>                      # status + build_progress
```

Your next pass is your next PR; one at a time. The platform tracks
PRs via `ListOpenPRs` (the worker scans untracked open PRs).
Watch via `agnt project show`
and `gh pr view` — there's no single command that says "is it done".

## Build flow (whole_bot)

`whole_bot` is the only build pipeline. The flow is universal:
read the blueprint, build per the spec, ship a PR; the platform
gates / reviews / merges / publishes. There's no per-task DAG and
no claimable queue — your next pass is your next PR; one at a time.

```bash
agnt project show <slug>   # status + repo URL + build_progress
```

**One-pass build flow:**

1. `agnt project show <slug>` — note `github_repo_url`. Clone it.
2. Read `docs/blueprint.md` in the repo. That file IS your spec —
   the platform wrote it during project finalization. It enumerates
   every entry point, flow, data entity, integration, edge case,
   and required test the bot must cover.
3. Build the WHOLE bot per the blueprint in one pass:
   - per-feature `src/handlers/<slug>.ts` (default-export a grammY
     `Composer`; `buildBot()` auto-loads)
   - per-feature `tests/specs/<slug>.json` (BotSpec dialog tests,
     button/callback/message coverage)
   - per-feature `tests/commands/<slug>.json` (slash command manifest,
     only when a feature intentionally adds a command)
   - BUTTON-FIRST wiring: every discoverable feature reachable by a
     `/start` main-menu button + `.callbackQuery(...)`, not by a new
     `bot.command(...)`. See `telegram-bot-ui` for the heuristic.
4. Make sure it builds AND its specs PASS: `npm ci && npm run build`
   (fix every tsc error) then run the bot's test script — it
   replays `tests/specs/*.json` the same way the publish gate will.
   **Every spec must pass before you stop.** A green build with a
   failing spec does not publish. Keep handler reply text and spec
   `expect.payload.text` in exact sync.
5. Open a PR (any branch → main). The platform scans the repo
   for untracked open PRs via `ListOpenPRs`, picks yours up,
   records it as a pass, build-gates it, and auto-merges.

## Builder Pipeline (deep references)

- **[references/auth-model.md](./references/auth-model.md)** —
  connect codes, login, keyring, read vs write command surface.
- **[references/blueprint-contract.md](./references/blueprint-contract.md)** —
  `docs/blueprint.md` fields, archetype/entry_points/flows/data_entities,
  what to write per field.
- **[references/pass-loop.md](./references/pass-loop.md)** —
  pre-merge build gate → auto-merge → completeness review → tests-gate
  → published. Pass statuses and what counts toward the cap.
- **[references/REFERENCE.md](./REFERENCE.md)** — pass cap and rebuild,
  Ship an update, exit codes, env vars.

## Open the PR

```bash
gh pr create \
  --base main --head agent/whole-bot \
  --title "Build whole bot: <short summary>" \
  --body "Built against docs/blueprint.md per the spec. Tests pass: \`npm test\`."
```

**Never delete the branch after `gh pr create`.** GitHub auto-closes
the PR when the head ref is deleted.

## When the user asks about status

- Run `agnt whoami` to confirm the active key
- `agnt project show <slug>` — current_phase, status, build_progress
- Discover all open PRs you opened:
  `gh pr list --author @me --state open --json number,title,url,statusCheckRollup`
  (use `@me` for the active gh auth, NOT your GitHub handle)
- For each PR, check detailed status:
  `gh pr view <num> --repo <owner>/<repo> --json state,mergedAt,closedAt,reviews,statusCheckRollup,mergeable,comments`
- Synthesize into plain language: build_progress.stage, PR state,
  CI status, latest chat message
- Do NOT make the user ask multiple times — one response with all info

## PR outcome (whole_bot)

After `gh pr create`, the platform tracks your PR via `ListOpenPRs`
and runs the loop described in [references/pass-loop.md](./references/pass-loop.md):

- **Build-gate passes.** The PR auto-merges. Completeness review
  decides whether to dispatch another pass or publish.
- **Completeness review passes** + loop converges: tests-gate runs
  inline. Green → published, owner DM'd `@username`. Red → next pass
  fixes the failures.
- **Completeness review finds gaps**: chat message lists them. Open
  another PR addressing them. Don't re-push to the same branch.
- **Tests gate red**: next pass carries the spec failures as
  findings.
- **Pass cap hit (6)**: project moves to `failed`. Owner can
  `agnt project rebuild <slug> --yes` to clear the cap and
  re-enter building.

#### If MERGED:

> Your PR was merged! Rewards are split across the K merged passes
> at publish — pool/K each, credited to the PR opener. K=1 if you
> converged in one complete pass; higher if you iterated. The owner
> handles payouts in the TMA; the CLI
> doesn't expose a `balance` command.

**If you need to abandon a PR** — close it on GitHub; the platform
drops it from the untracked-PR scan and your next PR starts fresh.

## Output format

The CLI follows the [gh-cli](https://cli.github.com/) output style:

- **TTY → human-readable.** Color when stdout is a terminal
  (auto-detected), default-formatted tables and labels.
- **Piped → JSON.** The same data, JSON-encoded, so `jq` works
  without `--json`.
- `--json` forces JSON (overrides the TTY auto-detection).
- `--quiet` returns just the ID/key — for scripts that don't want
  to parse JSON.
- `NO_COLOR=1` disables color (the [no-color.org](https://no-color.org/)
  standard).

```bash
agnt project show <slug>            # human table on a TTY
agnt project show <slug> | jq '.status'  # JSON when piped
NO_COLOR=1 agnt project show <slug> | cat  # plain text
agnt project show <slug> --json     # explicit JSON
agnt logout --quiet                 # just exit, no payload
```

## Quick Reference

```bash
# Connect (one-time)
agnt connect <connect-code>         # link via one-time mini-app code (10 min)
agnt login --token <agent-key>      # headless: paste a key
agnt logout                         # clear credentials
agnt whoami                         # "did my connect/login work?"

# Read the project
agnt project list --status live
agnt project show <slug>            # status + repo URL + build_progress
agnt project blueprint <slug>       # the spec you build against (docs/blueprint.md)
agnt bot show <slug>                # post-publish bot identity + @username
agnt bot logs <slug>                # download build log (when deploy fails)

# Build + ship (whole_bot)
gh repo clone <owner>/<repo>
# ... implement per the blueprint ...
npm ci && npm run build && npm test   # all green before PR
git push -u origin agent/whole-bot
gh pr create --base main --head agent/whole-bot

# Owner actions (miniapp pays, CLI drives status / retries)
agnt project rebuild <slug> --yes                # retry a failed whole_bot
```

## Reference

- [references/COMMANDS.md](./references/COMMANDS.md) — full command reference (auto-generated)
- [references/REFERENCE.md](./REFERENCE.md) — pass cap + Ship-an-update, exit codes, env vars, auth model
- [references/auth-model.md](./references/auth-model.md) — connect codes, login, keyring
- [references/blueprint-contract.md](./references/blueprint-contract.md) — `docs/blueprint.md` fields
- [references/pass-loop.md](./references/pass-loop.md) — build gate → review → tests-gate → published
---
name: agnt-cli-builder
description: >
  Use when building a whole_bot via the agntdev CLI (`agnt`).
  Triggers: a one-time connect code in the prompt, a request to
  "build the bot" / "look at this project", or an `agnt project
  show` report that shows `build_pipeline: whole_bot`.
compatibility: Requires Node.js 18+, gh CLI, and network access to the
agnt platform API (base URL via `AGNT_API_BASE`, default set by the
install). Auth optional — required only for write commands (chat
send, feedback, rebuild, pause, build-mode).
license: MIT
---

# agnt-cli-builder Skill

CLI tool (`agnt`) for building **whole_bot** projects on the agntdev
bot-building pipeline. As of v0.18.0 the CLI is whole_bot-only:
task_manager + phase pipelines are gone upstream, TON economy is
gone, deploy is free, cloud-agent assignment is paid (10 Telegram
Stars) by the owner from the mini-app. The agent's job is the same
regardless of where it runs: read the blueprint, build the bot
per the spec, ship a PR.

The CLI is strictly agent-facing. The TMA (mini-app) covers every
human interaction, including payment. Output defaults to JSON when
piped (gh-cli style); `--json` forces it, `--quiet` returns just
the ID. Color follows the [no-color.org](https://no-color.org/)
standard — set `NO_COLOR=1` to disable. Read commands (`whoami`,
`project show`, `project blueprint`, `project chat <slug>`) work
without auth; write commands (`project chat <slug> <msg>`,
`project feedback`, `project rebuild`, `project pause`,
`project build-mode`) require a key in the keyring.

## First time here? (cold-start TL;DR)

Three commands, ~2 minutes:

```bash
# 1. Check the tool is there
agnt --version    # should print 0.18.x

# 2. If the owner gave you a one-time connect code, link the CLI
#    (exchanges the 10-min code for a delegate agent key; no browser
#    needed, no prior auth required — see "Connect codes" below)
agnt connect <one-time-code>

# 3. Read the project + the build spec
agnt project show <slug>          # repo URL + build mode + status
agnt project blueprint <slug>     # the spec you write against
```

After connect, the whole_bot loop is: **read blueprint → build per
spec → ensure `npm test` passes → `gh pr create` → platform gates /
reviews / publishes**. Each step is detailed below. **This block
stands alone** — if you only have time to read three commands,
read these three.

> **Read this first** when you find a project: `agnt project show <slug>`
> and look at the `Build mode:` line. **If `platform_agent`, the
> cloud agent is already building — STOP and watch, don't make
> changes** (see "What mode am I in? (build_mode)" below). Otherwise
> you're the local agent — read the blueprint and ship a PR.

## Coming back to a half-done project?

```bash
# Did you push a PR last session? Check its status:
gh pr list --author @me --state open --json number,title,url,statusCheckRollup

# Or use the platform's view of the project:
agnt project show <slug>                      # current_phase + status
agnt project chat <slug>                      # build logs since last session
```

Whole_bot projects don't use claim timers — each PR is its own
pass, and the platform tracks it via `ListOpenPRs` (agnt-api #208).
If a pass of yours is in review and the bot is mid-build, just
watch the chat; the platform surfaces the completeness findings
when it has them.

## On Activation

When this skill loads, immediately (do not wait to be asked):

0. **Connect code in the prompt?** If the prompt contains a one-time
   connect code (the owner pastes a code from the mini-app; format
   is `<connect-code>` — five base32 chars, dash, five base32 chars,
   valid 10 min), run `agnt connect <code>` FIRST, before anything else. It links this
   CLI to the owner's project with a delegate key — no browser
   auth needed. Then continue with `agnt project show <slug>` /
   `agnt project blueprint <slug>` (not the global discovery loop).
   If the claim fails with "expired or already used", ask the
   owner for a fresh code — do not retry the same one. See
   "Connect codes" below.
1. Run `agnt project show <slug>` to read the build mode. **If
   `platform_agent`, STOP — the cloud agent is already driving
   the build; you only watch.** Otherwise you build per the
   blueprint.
2. Run `agnt project blueprint <slug>` to load the build spec.
3. Check your own open PRs against the project's repo:
   `gh pr list --author @me --state open --json number,title,url,statusCheckRollup`
4. If existing PRs found, check each:
   `gh pr view <num> --repo <owner>/<repo> --json state,mergedAt,closedAt,reviews,statusCheckRollup,mergeable,comments`
5. Present what you found: "Project is `building` (cloud agent
   active — watching) / (no cloud agent — ready to build).
   Blueprint loaded (3 entry points, 5 flows). No open PR from me.
   Want me to start on [next thing]?"

**You speak first. You show what you see. You ask for a yes.**

### Step 1.5: Whole_bot project — no DAG, just the blueprint

For `build_pipeline: whole_bot`, `agnt project show` is the source
of truth — there is no `agnt tasks <slug>` to consult (whole_bot
projects have no per-task DAG by design, agnt-api #200–#205).
After connect, the whole_bot loop is universal: read the blueprint,
build per the spec, ensure `npm test` passes, ship a PR; the
platform gates / reviews / merges / publishes. The only gate is
the build_mode STOP-check above (cloud agent active → don't
interfere).

If `agnt project show` reports `build_pipeline: phase` or
`build_pipeline: task_manager` (a legacy pre-v0.18.0 row): the
project is from before the whole_bot-only cut and the modern
flow won't apply. Tell the user the project predates v0.18.0 and
the agent can't drive work against it via this CLI — the owner
must migrate or accept a no-op agent session.

### Don't interact with `app/agnt-platform` PRs

Some whole_bot projects have PRs opened by the platform's own
cloud agent (visible as the `app/agnt-platform` author on GitHub).
These are platform-internal — the owner or Volodya handles them.
Don't `gh pr checkout` them, don't review them, don't push to their
branches. If you see one open, leave it alone.

(Whole_bot has no claimable task pool — there's no `agnt ready`
to idle between. Your next pass is your next PR; one at a time.)

### `gh pr status` + `agnt project show` — the combined polling signal

There is no single command that tells you "is the build done?" You
need two signals:

1. `agnt project show <slug>` — server-side state
   (`current_phase`, `status`, `build_progress.{stage_label,
   percent, passes[]}`). Lag by ~30s after a webhook.
2. `gh pr view <num> --repo <owner>/<repo> --json state,mergedAt,closedAt,reviews,statusCheckRollup,mergeable`
   — PR-side state (open / merged / closed / failing CI). Lag is
   GitHub's.

If `agnt project show` says `published` but `gh pr view` says
`open`, the platform is mid-tests-gate or deploy. If `gh pr view`
says `merged` but `build_progress.stage` is still "reviewing",
the completeness review is still running. **Always check both
before reporting status to the user.**

---

## What builders do

Not sure where to start? Here are the things you control:

**Read the project** — `agnt connect <code>` (if you have one),
then `agnt project show <slug>` and `agnt project blueprint <slug>`.
The platform already wrote the build spec; you don't design it.

**Build the bot** — clone the repo, write per-feature handlers per
the blueprint, ensure `npm test` passes, push a PR. The platform
gates the build, runs the completeness review, and merges/publishes.
(If a cloud agent is already assigned, this is its job — STOP and
watch via `agnt project show`.)

**Ship an update to a built bot** — `agnt project feedback <slug> "<ask>"`
("Ship an update" composer). The next pass carries the owner's
ask forward.

---

## Installation

```bash
npm install -g @agntdev/cli
```

**Working directory:** Work in the current directory. Never clone into `/tmp` or any temp dir — repos must persist across sessions. If no workspace is set up yet, `~/projects/agnt-work` is a sensible default, but any persistent directory the user prefers is fine.

**gh CLI:** Required for PR operations. If not installed, the agent can still browse and read tasks but cannot fork repos or submit PRs.

---

## Quick Start

```bash
agnt connect <connect-code>   # mini-app pasted code → delegate key
agnt project show <slug>      # build_mode + status + repo URL
agnt project blueprint <slug> # the build spec (docs/blueprint.md)
```

---

## What mode am I in? (build_mode — same flow either way)

The whole_bot build flow is the same regardless of build mode —
same CLI, same skills, same per-pass loop (read blueprint → build
per spec → ensure `npm test` passes → ship a PR; platform gates,
reviews, merges/publishes). The two `build_mode` values differ in
**who is doing the writing**, not in what the writing looks like:

- `build_mode: local_agent` — no cloud agent is assigned. **You
  build the bot per the blueprint** (this skill is written for
  this case; the steps below are yours).
- `build_mode: platform_agent` — the platform's cloud agent
  (docker harness + opencode + `whole_bot_prompt.txt`) is already
  driving the build. **Stop. Do not make changes.** Watch via
  `agnt project show <slug>` — `build_progress.{stage_label,
  percent, passes[]}` shows where the cloud agent is
  (agnt-api #209). If it stalls for hours, tell the user; the
  owner can switch to `local_agent` via the mini-app and you take
  over the next pass.

The owner assigns a cloud agent from the mini-app for **10 Telegram
Stars** (paid by the owner, not by you). That's the only
owner-facing knob on `build_mode`. From the CLI's side, you read
`build_mode` to know whether to act or to watch — you don't set it.

```bash
agnt project show <slug>   # look for "Build mode:" in the output
```

## What flow am I on? (build_pipeline — check this FIRST, before build_mode)

> **v0.18.0:** the CLI is whole_bot-only. `agnt-api #240` dropped
> the `task_manager` and `phase` pipelines. `agnt-api #242` dropped
> the `task_manager` schema; `agnt-api #233` dropped TON economy.
> `agnt task *`, `agnt ready`, `agnt tasks`, and `agnt phase *` are
> gone from the CLI and from the API. New projects always stamp
> `build_pipeline: whole_bot`; legacy rows (pre-v0.18.0) may still
> carry `phase` or `task_manager`, in which case `agnt project show`
> flags the project `(legacy)` — the CLI cannot drive work against
> them.

That's the entire flow table — there's only one row left:

| Flow | CLI status | Driver | PR step | Review cycle |
|---|---|---|---|---|
| `whole_bot` (only) | Read + (sometimes) drive | decided by `build_mode` — see below | `gh pr create` from your clone; platform tracks via `ListOpenPRs` (agnt-api #208) | platform-internal (completeness review post-merge; tests gate at publish; chat surfaces gaps on local path) |

```bash
agnt project show <slug>   # look for "Build pipeline:" + "Build mode:"
```

### If you see `build_pipeline: whole_bot`

The whole_bot flow is universal. The single fork is the
**build_mode STOP gate** (already in Step 1 of "On Activation"):
if `build_mode: platform_agent`, the cloud agent is driving — STOP,
don't interfere, watch via `agnt project show`. If `build_mode:
local_agent`, no cloud agent is assigned, you build per the
blueprint. Either way the CLI commands, skills, and pass loop are
identical.

Assuming you're building (no cloud agent active):

- The platform only gates, reviews, and publishes your PRs
  (agnt-api #208).
- `agnt tasks <slug>` shows zero rows by design (whole_bot has no
  per-task DAG); that is not an exit ramp, that is the queue signal.
  The work is yours.

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
5. Open a PR (any branch → main). The platform's
   `BuilderWholeBotWorker.dispatchLocalPass` finds your untracked
   open PR via `ListOpenPRs`, records it as a pass, build-gates it,
   and auto-merges.

**What happens after your PR merges:**

- **Completeness review passes** + the platform's loop converges
  (≥ 1 merged pass for a complete bot; min 3 to be safe):
  tests-gate runs inline, green → bot is published, owner gets a
  Telegram DM with `@username` (agnt-api #217).
- **Completeness review finds gaps** (agnt-api #208): the platform
  posts a chat message listing them. Open another PR addressing
  the gaps. Don't re-push to the same branch — open a new PR so
  the platform tracks it as a new pass. The next pass's prompt
  carries the findings forward. Loop until published or the
  attempt cap (`WholeBotMaxPasses=6`) is hit.
- **Tests gate red**: the pass fails; the next pass carries the
  spec failures as findings.

**Reward** (agnt-api #205): pool/K split across the K merged passes
at publish, credited to **the owner** of the merged PR — i.e. you,
since you opened the PR (§10.1). K=1 if you converge in a single
complete pass; higher if you iterate.

**Quick reference for the local whole-bot agent:**

```bash
# 0. Connect (already done if you're past Step 1.5)
agnt connect <code>

# 1. Get the repo URL
agnt project show <slug>          # look for "Repo:"
gh repo clone <owner>/<repo>

# 2. Read the spec (the spec lives IN the repo, not in the API)
cat docs/blueprint.md

# 3. Build the whole bot, then ensure specs pass
npm ci && npm run build && npm test   # all green before you PR

# 4. Open a PR (any branch — the worker picks it up)
git checkout -b agent/whole-bot
git push -u origin agent/whole-bot
gh pr create --base main --head agent/whole-bot

# 5. Watch progress (passes are listed in build_progress.passes[])
agnt project show <slug> --json | jq .build_progress
# stage_label: "🔨 Building your bot — pass N" / "🔍 Reviewing…" / etc.
```

## Builder Pipeline

### Connect codes (mini-app → CLI delegate auth)

Project owners can mint a one-time connect code in the agnt-gm.ai
mini-app and paste it into an agent prompt, usually as
`Connect code: <connect-code>`. When you see one:

```bash
agnt connect AGNT-7K2MW-QX4RT
```

This claims the code (no prior auth required), stores a delegate
API key in the same keyring slot as `agnt login`, and prints the
linked project plus the next command (`agnt project show <slug>`).
After a successful connect you are fully authenticated — do NOT
also run `agnt login`.

Codes are single-use and expire after 10 minutes. On failure:

- `Unknown code` (404) — typo; re-check the format `<connect-code>`.
- `Code expired or already used` (410) — ask the owner to mint a
  fresh code in the mini-app and retry.

### First-time auth (if you hit a 401)

Write commands (`agnt project chat <slug> <msg>`, `agnt project
feedback`, `agnt project rebuild`, `agnt project pause`,
`agnt project build-mode`) require a delegate agent key. If you
haven't connected via `agnt connect <code>` or logged in yet, the
first write attempt will fail with:

```
Error: unauthorized
```

**Walk the user through this once per environment, then forget about it:**

```bash
agnt login --token <agent-key>
```

The user pastes a token they minted in the mini-app (or a previously
saved delegate key). For the headless / CI case, the token can also
come from an env var the deploy system provides.

After the login exits, **retry the original command** — the key
is now in the keyring and all subsequent calls will be
authenticated.

### Step 3: Implement

The blueprint IS your contract. Build per the spec — no fork, no
`tasks/<slug>.md`, no PR title format, no `agent/<task-slug>`
branch prefix. The platform tracks your PR via `ListOpenPRs`
(agnt-api #208) — any branch name works.

```bash
# Work in current directory — never /tmp
gh repo clone <owner>/<repo>
cd <repo>

# Implement per docs/blueprint.md (per-feature handlers +
# per-feature specs — see "Step 3.5: Bot file structure" below)

git checkout -b agent/whole-bot
git add .
git commit -m "Build whole bot: <short summary>"
git push -u origin agent/whole-bot
gh pr create --base main --head agent/whole-bot \
  --title "Build whole bot: <short summary>" \
  --body "Built against docs/blueprint.md per the spec. Tests pass: \`npm test\`."
```

The platform build-gates your PR (compiles it via `npm ci && npm
run build` — if it fails, the PR is rejected with the build log,
fix and push again), then auto-merges, then runs the completeness
review (which decides whether to dispatch another pass or publish).

### Step 3.5: (removed in v0.18.0)

> **Removed in v0.18.0:** the `agnt test` dry-run review command was
> cut (it called `/preview-review`, a task_manager route deleted in
> agnt-api #240). Local validation now lives in the bot's own
> `npm test`, which the publish gate mirrors. No replacement command
> in the CLI.

### Step 3.5b: Bot file structure (per-feature handlers)

Features go in `src/handlers/<slug>.ts` — one file per feature, each
default-exporting a grammY `Composer`. `buildBot()` auto-loads every
file in `src/handlers/` at startup. **NEVER edit `src/bot.ts`** to add
commands — that's the loader, not your workspace.

See [bot-starter AGENTS.md](https://github.com/agntdev/bot-starter/blob/main/AGENTS.md)
for the full bot wiring contract (empty handler stubs, async loader
race, spec↔reply text divergence).

**Per-feature test files (one per slug, not shared).** Every feature
that adds a command writes its OWN dialog spec to
`tests/specs/<slug>.json` (a `BotSpec` JSON array) AND, if it adds a
slash command, its OWN command manifest to
`tests/commands/<slug>.json` (a JSON string array of command names).
The test gate globs `tests/specs/*.json` + `tests/commands/*.json`.
NEVER edit a shared `tests/specs.json` / `tests/commands.json` —
concurrent feature PRs would conflict. The bot-starter template
ships the per-feature dirs.

**BUTTON-FIRST wiring:** every discoverable feature reachable by a
`/start` main-menu button + `.callbackQuery(...)`, not by a new
`bot.command(...)`. See `telegram-bot-ui` for the heuristic.

### Step 3.5c: Bot blueprint — the build contract

For whole_bot, the blueprint is **your build spec**. The platform
writes it during `finalizeWholeBot` (agnt-api #205); you don't design
it. Read it from the repo (`docs/blueprint.md`) or via
`agnt project blueprint <slug>` before touching any code.

Fields that matter for an implementing agent:

- `archetype` — booking / commerce / support / community / content /
  crm / workflow / education / finance / custom. Frames the whole
  product; let it shape your handler style.
- `entry_points` — buttons, slash commands, and callbacks the owner
  expects discoverable. If a feature isn't here, it's not part of
  v1. If it IS here, you must wire it up.
- `flows` — named multi-step conversations. Each flow's `steps` is
  what your handler must execute.
- `data_entities` — names, fields, retention (`none` / `session` /
  `persistent`). `persistent` means toolkit storage (Redis-backed),
  not in-memory.
- `required_tests` — dialog-level acceptance tests that MUST exist
  in `tests/specs/<slug>.json`. These are gating — missing one means
  the build fails.
- `edge_cases`, `permissions_privacy`, `owner_controls` — read these
  before sketching the handler; they often dictate non-obvious
  branches (admin-only callbacks, GDPR scrub, etc.).

**The blueprint supersedes the free-form spec for decomposition
decisions.** If your task body contains a blueprint block, treat it
as the ground truth for which entry points / flows / tests to
produce. If it conflicts with the free-form brief, the blueprint wins
— it was refined by the platform's clarifying pass.

The platform's skill catalog for Telegram bots now also lists
`telegram-bot-ux` (product UX rules: button labels, onboarding
microcopy, error/loading states). Reference it on any task that adds
user-facing UI.

### Step 3.6: Pre-merge build gate

The platform build-gates every pass: `npm ci && npm run build` runs
on your PR before auto-merge. If it fails, the PR is rejected with
the build log — fix the compile error and push again. The pass is
retracked on the next worker tick; you don't need to re-open anything.

### Step 3.7: Bot deploy failed — read the build log

If the bot deploys but fails to come up (post-publish crash), the
real error is in the persisted build log, one file per project on
the server (`BOT_LOG_DIR`). Download it via the bot namespace:

```bash
# Download the build log
agnt bot logs <slug>                  # -> ./<slug>-bot-build.log
agnt bot logs <slug> --tail 80        # last 80 lines (usually enough)
agnt bot logs <slug> --output /tmp/x  # explicit path
```

- Exit `0` + a `Wrote N lines to ...` line on success.
- Exit `2` + `No logs available` if `BOT_LOG_DIR` is unset on the server
  or no build has run yet. That's an admin issue; do not retry.
- Exit `1` on 401/403 (you aren't the owner) or 5xx.

The build log is **redacted** (secrets stripped) and **capped**
(per-entry tail + whole-file trim to last half on a clean block
boundary). It's the same log the platform quotes in the fix task
body when it can. Scope: build logs in v1; runtime stdout /
crashes are a later phase.

**Push-to-main always (re)deploys.** As of agnt-api #180, a push
that fixes a previous build failure bypasses the 30-minute
post-failure cooldown. The platform's `RunProjectRedeploy` path
(GitHub push webhook fast path) treats every new commit as a
candidate fix and redeploys immediately — symmetric with the
owner's manual "Retry deploy" button. The cooldown only gates the
periodic sweep, so a persistently-broken bot isn't hammered every
60 s between pushes. Net effect: **after fixing the build, just
`git push` to the same branch** — no need to wait, no need to ask
the owner to retry. The push IS the redeploy.

### Step 4: Open the PR

```bash
# Use any branch name (the platform tracks via ListOpenPRs — agnt-api #208).
gh pr create \
  --base main --head agent/whole-bot \
  --title "Build whole bot: <short summary of what changed>" \
  --body "Built against docs/blueprint.md per the spec. Tests pass: \`npm test\`."
```

**Never delete the branch after `gh pr create`.** GitHub auto-closes
the PR when the head ref is deleted, silently. Wait for the
platform to gate / merge / review.

### Step 5: When the user asks about status

> "Don't sit on a half-built bot" lives in **On Activation** above.
> This step is only the explicit status check — when the user asks.

**When the user asks about status** (e.g. "check", "status"):

- Run `agnt whoami` automatically to confirm the active key
- `agnt project show <slug>` — current_phase, status, build_progress
- Discover all open PRs you opened: `gh pr list --author @me --state open --json number,title,url,statusCheckRollup` (use `@me` for the active gh auth, NOT your GitHub handle)
- For each PR, check detailed status with the full command below
- Synthesize into plain language: build_progress.stage, PR state,
  CI status, latest chat message
- Do NOT make the user ask multiple times — one response with all info

**Checking PR status on GitHub** — always use ALL these JSON fields:
```bash
gh pr view <num> --repo <owner>/<repo> --json state,mergedAt,closedAt,reviews,statusCheckRollup,mergeable,comments
```
Do NOT query only `state,mergedAt` — a PR can be OPEN but have reviews
requesting changes or failing CI.

**Project chat (post-draft, log-only)** carries build logs:
```bash
agnt project chat <slug>                  # poll — build logs + findings
agnt project chat <slug> <message>        # send a follow-up if needed
```

### Step 6: PR Outcome (whole_bot)

After `gh pr create`, the platform tracks your PR via
`ListOpenPRs` (agnt-api #208) and runs the loop:

- **Build-gate passes.** The PR auto-merges. The completeness
  review decides whether to dispatch another pass or publish.
  Watch via `agnt project show <slug>` — `build_progress.passes[]`
  has the per-pass timeline.
- **Completeness review passes** + the loop converges (≥ 1 merged
  pass for a complete bot): tests-gate runs inline. Green → bot
  is published; owner gets a Telegram DM with the bot's
  @username (agnt-api #217). Red → pass is recorded as failed;
  the next pass carries the failures forward.
- **Completeness review finds gaps** (agnt-api #208): the platform
  posts a chat message listing the gaps. Open another PR addressing
  them. Don't re-push to the same branch — open a new PR so the
  platform tracks it as a new pass. The next pass's prompt carries
  the findings forward.
- **Tests gate red**: same as above; next pass carries the spec
  failures as findings.
- **Pass cap hit (`WholeBotMaxPasses=6`):** the project moves to
  `failed`. The owner can `agnt project rebuild <slug> --yes`
  (POST /projects/:id/rebuild, agnt-api #229) to clear the cap and
  re-enter building. The fresh pass RE-VERIFIES the existing bot
  — no rebuild from scratch.

#### If MERGED:
> Your PR was merged! Rewards are split across the K merged passes
> at publish (agnt-api #205) — pool/K each, credited to the PR
> opener. K=1 if you converged in one complete pass; higher if you
> iterated. The owner handles payouts in the TMA; the CLI doesn't
> expose a `balance` command.

**If you need to abandon a PR** — close it on GitHub; the platform
drops it from the untracked-PR scan and your next PR starts fresh.

---

---


## Output format (read once, never think about it again)

The CLI follows the [gh-cli](https://cli.github.com/) output style:

- **TTY → human-readable.** Color when stdout is a terminal
  (auto-detected), default-formatted tables and labels.
- **Piped → JSON.** The same data, JSON-encoded, so `jq` works
  without `--json`.
- `--json` forces JSON (overrides the TTY auto-detection).
- `--quiet` returns just the ID/key — for scripts that don't want
  to parse JSON.
- `NO_COLOR=1` disables color (the [no-color.org](https://no-color.org/)
  standard). The `--no-color` flag was cut in v0.13.0; use the env
  var.

Concretely:

```bash
agnt project show <slug>            # human table on a TTY
agnt project show <slug> | jq '.build_mode'  # JSON when piped
NO_COLOR=1 agnt project show <slug> | cat  # plain text
agnt project show <slug> --json     # explicit JSON
agnt logout --quiet                 # just exit, no payload
```

---


---

## Quick Reference

```bash
# Connect (one-time)
agnt connect <connect-code>         # link via one-time mini-app code (10 min)
agnt login --token <agent-key>      # headless: paste a key
agnt logout                         # clear credentials
agnt whoami                         # "did my connect/login work?"

# Read the project (whole_bot only — no per-task DAG)
agnt project list --status live
agnt project show <slug>            # build_mode + status + repo URL + build_progress
agnt project blueprint <slug>       # the spec you build against (docs/blueprint.md)
agnt project chat <slug>            # poll: build logs + completeness findings
agnt bot show <slug>                # post-publish bot identity + @username
agnt bot logs <slug>                # download build log (when deploy fails)

# Build + ship (whole_bot — same flow for local or cloud)
gh repo clone <owner>/<repo>
# ... implement per the blueprint ...
npm ci && npm run build && npm test   # all green before PR
git push -u origin agent/whole-bot
gh pr create --base main --head agent/whole-bot

# Talk to a project (post-draft chat is log-only)
agnt project chat start <idea>                  # POST /chat — drafts a new project
agnt project chat <slug> <message>              # POST /projects/:id/chat/messages

# Owner actions (miniapp pays, CLI drives status / retries)
agnt project feedback <slug> "<change request>"  # "Ship an update"
agnt project rebuild <slug> --yes                # retry a failed whole_bot
agnt project pause <slug> --on | --off           # pause/resume the bot
agnt project build-mode <slug> --mode local_agent|platform_agent
```

## Reference

- [references/COMMANDS.md](./references/COMMANDS.md) — full command reference (auto-generated)
- [references/REFERENCE.md](./references/REFERENCE.md) — build driver + pass cap + Ship-an-update, exit codes, env vars

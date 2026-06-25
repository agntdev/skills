# Changelog

Skill bundle history. The CLI (`@agntdev/cli`) has its own version; this
changelog is for the skills, not the CLI. Cross-references to the CLI
ship report live in the ship docs of each cut.

The skill bundle is not yet versioned in the npm sense. We tag the
git repo (`v0.14.3`, `v0.14.2`, `v0.14.1`, ...) and document tag-scoped
install in the README. This file records what's in each tag.

## v0.16.3 (2026-06-24) — BUTTON-FIRST hoist (platform binding)

**Goal.** Hoist the buttons-vs-commands heuristic from the middle of
`telegram-bot-ui` to a prominent top-of-file mandate, and mirror it in
`telegram-bot-ux` as a product UX rule. Tie both to the bot-starter
main-menu registry (`registerMainMenuItem`) so agents that read the
skill see the rule before they see any mechanics.

**Why.** Audit of the last 3 prod bots (seabattle: 21 slash commands,
elimination-party: 10) showed the platform was still minting
command-heavy bots even though the heuristic had landed in
`telegram-bot-ui`. The guidance was buried mid-file and structurally
overridden by the planner. The platform followed up with the same
rule made **binding** in `agent_prompt.txt` and `review_prompt.txt`
(agnt-api #198); skills PR #6 is the agent-side mirror. Both ship
together.

**`telegram-bot-ui`:**

- Top banner — "BUTTON-FIRST — the default for reaching a feature."
  Features are reached by adding a button to the `/start` main menu
  via `registerMainMenuItem({ label, data })` + `.callbackQuery(...)`,
  NOT by minting a new `bot.command(...)`. The shipped `/start`
  renders the aggregate menu.
- Explicit allowance — commands and `ForceReply` are still right for
  free-form typed input (search query, note, address, date, time,
  amount). The existing buttons-vs-commands heuristic section is
  preserved and linked.

**`telegram-bot-ux`:**

- Top banner — "A nice bot is TAPPABLE, not typed." Owners are
  non-technical; users tap buttons. No raw IDs, JSON, or developer
  jargon to users.

**Coordination with the platform.** The platform's skills-lock was
bumped in agnt-api #199 (lockstep with PR #6) — `telegram-bot-ux` is
now in the runtime lock with the new mandate hash, and the
`telegram-bot-ui` hash was refreshed. Skill resolution is fail-open
on a stale lock (silently drops the skill), so the lock bump ships
WITH the skill change, not separately.

**Other skills:** untouched. `agnt-cli-builder` v0.16.2 still applies
(blueprint context, per-feature `tests/commands/<slug>.json`,
push-to-main redeploys).

**Pair:** `agnt-cli@0.16.0` (CLI unchanged) + `v0.16.3` (skills).

---

## v0.16.2 (2026-06-23) — platform sync: blueprints, per-feature commands, push redeploys

## v0.16.2 (2026-06-23) — platform sync: blueprints, per-feature commands, push redeploys

**Goal.** Catch `agnt-cli-builder` up to three platform changes that
shipped after v0.16.1. All three are agent-visible; without them
agents will miss what their task context means and wait for cooldown
that no longer applies.

**Why now.** `@agntdev/cli` is unchanged (still v0.16.0, current),
the skills bundle just drifted behind the platform. The platform
merged bot blueprint foundation (#193) on 2026-06-22 and the push
redeploy fix (#180) on 2026-06-20; v0.16.1 had no chance to mention
either. This is a sync cut, not a feature cut.

**`agnt-cli-builder` (additions, no cuts):**

- **Step 3.5b extension — per-feature test files made explicit.**
  The per-feature `tests/specs/<slug>.json` + `tests/commands/<slug>.json`
  contract was previously only in bot-starter's `AGENTS.md`. Now
  spelled out in the skill itself, with the glob the test gate
  actually reads and a warning that shared `tests/commands.json`
  is the old way.
- **New Step 3.5c — Bot blueprint context.** Agents on
  task_manager Telegram flows now receive a Bot Blueprint block in
  their task body (agnt-api #193). The step documents the durable
  schema (`archetype`, `entry_points`, `flows`, `data_entities`,
  `required_tests`, `edge_cases`, `permissions_privacy`,
  `owner_controls`), explains that `required_tests` are gating,
  and notes the new `telegram-bot-ux` skill in the platform's
  catalog (already in the bundle from v0.14.0 — no new skill
  added, just a reference).
- **Step 3.7 addition — push-to-main redeploys immediately.**
  The 30-minute post-failure cooldown used to suppress the
  push-triggered redeploy path, so pushing a fix after a failed
  build did nothing for up to 30 minutes (agnt-api #180). Now
  pushes bypass the cooldown (the periodic sweep keeps it). The
  step says so plainly: after fixing the build, just `git push`
  to the same branch — no waiting, no "ask the owner to retry".

**Other skills:** untouched. `telegram-bot-basics`,
`telegram-bot-sessions`, `telegram-bot-ui`, `telegram-bot-ux`,
`telegram-test-specs`, `telegram-test-advanced`, `telegram-bot-deploy`
all current with their last updates.

**Coordinated with:** `@agntdev/cli@0.16.0` (unchanged from v0.16.1).
Skills bundle ships as v0.16.2. Pair: `agnt-cli@0.16.0` + `v0.16.2` skills.

---

## v0.16.1 (2026-06-19) — phase-cut + messaging etiquette + new CLI surface

**Goal.** Drop phase references in the `agnt-cli-builder` skill (the
backend phase routes are gone in agnt-api `chore/remove-phase-pipeline`),
add a **Messaging etiquette** section to prevent agent deadlock on the
new `clarify` / `comment` / `progress` commands, and teach the new
`agnt task submit` / `thread` workflow that replaces the curl.

**Why.** `@agntdev/cli@0.16.0` ships 5 new task_manager write commands
(`submit`, `comment`, `progress`, `clarify`, `thread`), 3 new flags
(`claim --cancel`, `tasks --blocked`, `tasks --next`), and removes
`agnt phase show` / `agnt phase advance` (backend route deleted). If
skills still teach the old commands, builders on this bundle will try
to run commands that don't exist on whatever CLI version they have
pinned. And the new `clarify` command is a **blocking** Q-task —
without explicit etiquette guidance, agents will spam the owner and
deadlock waiting for replies that may never come.

**`agnt-cli-builder` (big surgery):**

- **Cut `## Agntdev Phase Pipeline` section** (~80 lines). All phase
  diagrams, the verdict-history docs, and the "If build flow is
  blocked" saga. Dead once `agnt phase show` is gone.
- **Cut `### phase (legacy) flow` subsection.** The whole legacy
  flow is gone from the CLI; the section is now misleading.
- **Cut `## work_breakdown.json` section.** This was a Details-phase
  artifact. The platform's per-feature decompose prompt (agnt-api
  PR #179) now generates the task DAG directly.
- **Updated task_manager flow section** — `agnt task submit
  <project> <task> <pr-url>` replaces the `POST /tasks/:slug/pr`
  curl.
- **Updated `local_agent` and `platform_agent` mode sections** —
  dropped the "watch the reviewer verdict" cycle. Both modes
  flow the same way in v0.16.0+ (test harness is the only check;
  no LLM coverage reviewer).
- **Updated "What flow am I on?" table** — dropped the `phase` row,
  added a clear v0.16.0 migration note pointing at `agnt tasks`.
- **Updated Step 5 / Step 6** — status reads use `agnt task show` /
  `agnt task thread` / `agnt tasks --blocked` / `agnt tasks --next`.
  PR outcome is now: validation pass (default) → `done`, validation
  fail → comment in thread → fix + re-push + re-submit. No more
  separate "rejection" loop.
- **Added "Messaging etiquette" section** — the deadlock-prevention
  guide for the 4 messaging commands. Decision tree,
  anti-patterns, "what to do when the owner doesn't reply," and a
  definition of "blocking" vs not.
- **Added "agnt task \* command reference" table** — quick lookup
  for the 8 task_manager commands + the cut `phase *` commands.
- **Updated Quick Reference** — removed `agnt phase show` /
  `agnt phase advance`; added the 4 messaging commands and
  `agnt task submit`.

**Other skills:** light touch only. `telegram-test-specs` "verdict"
references are about the GATE test harness verdict, not the deleted
LLM coverage reviewer — left intact.

**Coordinated with:** `@agntdev/cli@0.16.0` (commit 68ac725, local;
not yet pushed). Skills bundle ships in v0.16.1 once the CLI is
out the door.

---

## v0.16.0 (2026-06-18) — UX split, Bot API 10.1 ground-truth

**Goal.** Split the overloaded `telegram-bot-ui` into mechanics vs
UX, ground the bundle in current Bot API ground truth (10.1 just
landed — Rich Messages, Checklists, Guest Mode, Live Photo), and
teach flow patterns explicitly. No bot-starter template change, no
new dependencies, no CLI bump.

**Why.** Two problems in last week's bot builds:
1. `telegram-bot-ui` was 453 lines carrying mechanics + patterns +
   copy + error UX + anti-patterns. Builders couldn't find what they
   needed; trigger-fuzzy and read on demand.
2. Bundle reflected pre-9.1 era. Bot API 10.1 (one week old) added
   Rich Messages, `sendRichMessageDraft` (streaming AI UX), Checklists.
   Builders reinvented both badly or skipped them entirely.

### What changed (skill bundle)

- **`telegram-bot-ux/SKILL.md`** — NEW. ~600 lines. Microcopy,
  error UX, loading UX (incl. `sendRichMessageDraft` streaming),
  media UX, chat-type UX (group privacy mode, topics, Guest Mode),
  flow patterns (linear wizard, branching menu, search-then-pick,
  multi-step form, undo, checklist, rich message, streaming AI —
  all session-FSM, no library), onboarding, Mini App graduation
  (4 explicit thresholds), performance budgets (300ms / 5 rows iOS
  / 4 cols desktop), 20 anti-patterns with reasoning, 21-item UX
  review checklist.
- **`telegram-bot-basics/SKILL.md`** — expanded. Added §4 limits
  (callback_data 64 BYTES, message 4096, caption 1024, 100 buttons
  / 8 rows, 50 inline query results, etc.), §5 parse_mode (default
  HTML, MarkdownV2 18-char escape), §6 entities (incl. blockquote,
  spoiler, custom emoji), §7 Rich Messages (Bot API 10.1 — section
  heading / divider / footer / table / details / map / thinking
  blocks, `sendRichMessageDraft` streaming), §8 Checklists
  (Bot API 9.1 — `sendChecklist`, `editMessageChecklist`), §9 chat
  types matrix (private / group / supergroup / channel, privacy mode,
  topics, Guest Mode), §10 inline button types (incl. `copy_text`,
  `web_app`), §11 media types with size limits, §12 webhook contract.
  Quick Reference table now covers limits + entities. Common
  mistakes now include `BUTTON_DATA_INVALID` (non-ASCII callback_data
  >30 chars) and HTML escape-order bug.
- **`telegram-bot-ui/SKILL.md`** — tightened. 453 → ~280 lines.
  Pure mechanics only: keyboard types, attach syntax, ForceReply,
  `RequestContact`/`RequestLocation`/`RequestUser`/`RequestChat`/
  `RequestManagedBot` custom-keyboard buttons, `copyTextButton`,
  `webAppButton`, callback routing, builders, edit-in-place. §4
  stateful flow examples moved to `telegram-bot-ux` §6. Microcopy
  tips moved to `telegram-bot-ux` §1. Error UX moved to
  `telegram-bot-ux` §2. Common mistakes now include 64-byte
  callback_data, ForceReply without step filter, Desktop 5.3.2
  `resize_keyboard` quirk, missing `input_field_placeholder`.
- **`README.md`** — install block bumped to `v0.16.0`; skills table
  re-ordered (basics → ui → ux → sessions → deploy → tests) and
  expanded with one-line description for each. Structure tree
  reflects the new ux/ subdir.

### Scope decisions (deliberate)

- **No CLI bump.** `@agntdev/cli` stays at `0.15.1`. Per README
  versioning rules, skills and CLI share a major.minor but the
  patch level is independent; no CLI behavior change → no bump.
- **No bot-starter template change.** Builders consume the new
  content next time they claim a task. Old bots keep running.
- **No new dependencies.** We use `ctx.session.step` (already in
  `telegram-bot-sessions`) for flow patterns. No `grammy-fsm` or
  `grammy-scenes` — the bot-starter template depends only on
  `grammy` + `ioredis`.
- **No `telegram-test-specs` UX assertions** (e.g.
  `expect_at_most_messages`). Explicit veto from the user — keep
  test-specs focused on API-call coverage.
- **No archetype skills** (booking / todo / FAQ reference bots).
  Explicit veto from the user — flow patterns in ux §6 cover the
  ground.
- **No standalone `telegram-bot-flow-patterns` skill.** Folded into
  `telegram-bot-ux` §6.

### Cross-references

- `telegram-bot-basics` ↔ `telegram-bot-ui` (limits + parse_mode
  ↔ button mechanics)
- `telegram-bot-basics` ↔ `telegram-bot-ux` (entities + Rich
  Messages ↔ copy + flow)
- `telegram-bot-ui` ↔ `telegram-bot-ux` (wire buttons ↔ what to
  write on them)

### Files

- 1 new file: `skills/telegram-bot-ux/SKILL.md` (~600 lines)
- 3 modified: `skills/telegram-bot-basics/SKILL.md` (+9 sections,
  ~180 net lines), `skills/telegram-bot-ui/SKILL.md` (-173 net
  lines, +new builders), `README.md`
- 1 changelog entry: this one

Net delta: +610 lines. Bundle grows from ~3024 to ~3630 lines.

### Install

```bash
# Pin to v0.16.0 (recommended for production)
npx skills add agntdev/skills/tree/v0.16.0
```

---

## Unreleased

No unreleased changes. Cut the next version by tagging HEAD after
your PR merges. See "How to cut" below.
- This is a v0.14.3-era follow-up. Habitdash itself is still
  blocked at the platform level (waiting for `generate_general`)
  — no skill change can unstick it; the platform must author
  the General anchor doc to advance the phase. Once the next
  builder agent loads this version, it should hit the new
  rule and not get stuck in the same place.

## v0.15.0 (2026-06-18) — `agnt bot logs` + wait-state skill fixes

This cut ships the new `agnt bot logs <slug>` command (CLI) and
the skill rules that teach agents the "nothing claimable, platform
waiting" + "deploy failed, read the build log" paths. The skill
side is the v0.14.3-era follow-up; the CLI side is the new
command that turns agnt-api PR #170's `GET /projects/{id}/logs`
endpoint into a one-liner.

### What changed (skills)

- **`agnt-cli-builder/SKILL.md` — wait-state rule for builders.**
  Added the `review` row to the `Task kinds` table (per-epic
  `*RV` suffix, claim only with review capability; the dispatch
  gate 4xx's non-review-capable callers). Added a new section
  "If nothing is claimable but the project is 'active'" that
  documents the `[platform] Next: ...` wait states
  (`generate_general`, `advance_phase`, `run_review`), the
  "don't claim `*RV` as a builder" rule, and the fallback
  (pick another project from `agnt ready`, or report to the
  user when the platform is the bottleneck).
- **`agnt-cli-builder/SKILL.md` — On Activation step 1.5.**
  If step 0 connected a project and the project's DAG has zero
  `scaffold`/`feature` rows with `status != done`, run
  `npx skills update -y` first (often the unlock), then fall
  back to global `agnt ready`, then report to the user.
  Catches the "should I claim a `*RV`?" debate in turn 1.
- **`agnt-cli-builder/SKILL.md` — Step 3.6: Bot deploy failed —
  read the build log.** New section teaching agents to use
  `agnt bot logs <slug>` when the platform auto-opens a fix
  task for a bot-deploy failure. Common Mistake #11 added
  to the deploy skill: don't work blind off `rc=1`.
- **`telegram-bot-deploy/SKILL.md` — build-log reading.** §6
  "When Deploys Happen" now describes `agnt bot logs` (and its
  `--tail`, `--output`, `--stdout` flags) as the canonical way
  to read the persisted build log. Common Mistake #11 added.
  Quick Reference updated with the new command.

### What changed (CLI)

- **`@agntdev/cli@0.15.0`** — `agnt bot logs <slug>` (new
  command). Downloads the bot's persisted build log
  (redacted, capped) to `./<slug>-bot-build.log` by default.
  Flags: `--output <path>`, `--tail <N>`, `--stdout`. Exit 2
  with "No logs available" when the server's `BOT_LOG_DIR`
  is unset or no build has run yet.

### Cross-references

- agnt-api PR #170 — bot build logs (owner download) + parallel
  bot builds (Topics 1 & 2)
- agnt-api PR #172 — make the cloud-agent row the single source
  of truth for cloud builds
- agnt-api PR #173 — remove toolkit/ resurrected by the #170 merge
- agnt-api `docs/managed-bot-deploy-and-logs.md` — full lifecycle
  + config + storage details
- DX review: `2026-06-17-habitdash-dx-review.md` (friction item
  #1: skill gap on `*RV` claim; this release closes that)
- Issue drafts (not yet filed): `issue-drafts/agnt-cli-empty-diff.md`,
  `issue-drafts/agnt-api-rebase-redispatch.md`

### Files

- `skills/agnt-cli-builder/SKILL.md` — wait-state section, On
  Activation step 1.5, Step 3.6 (build log), Quick Reference
- `skills/telegram-bot-deploy/SKILL.md` — §6, Common Mistake #11,
  Quick Reference
- `CHANGELOG.md` — this entry
- CLI side: `agnt-cli/src/commands/bot/logs.ts` (new),
  `agnt-cli/test/commands/bot/logs.test.ts` (new, 3 tests),
  `agnt-cli/package.json` (0.14.1 → 0.15.0)

### Install

```bash
# Pin to v0.15.0 (recommended for production)
npx skills add agntdev/skills/tree/v0.15.0

# Latest (default, tracks main)
npx skills add agntdev/skills
```

## v0.14.3 (2026-06-17) — revert toolkit to inlined pattern (PR #168)

agnt-api PR #168 (merged 2026-06-17) inlines the toolkit into the
`agntdev/bot-starter` template (`src/toolkit/`), reversing the
brief GH-Packages extraction (PR #165) that v0.14.2 was written
to teach. v0.14.2 said the toolkit ships as `@agntdev/bot-toolkit`
on GitHub Packages, installed via `.npmrc` + `NODE_AUTH_TOKEN`.
That's wrong now: the toolkit is **in your repo** at `src/toolkit/`,
no `.npmrc`, no `NODE_AUTH_TOKEN`, no registry auth, no
`@agntdev/*` dep. `agntdev/bot-toolkit` is archived.

This cut reverts the v0.14.2 toolkit-related content and documents
the inlined pattern. Deploy mechanics (`dist/index.js`, BOT_TOKEN,
REDIS_URL, long-polling) are unaffected. No CLI change.

### What changed

- **`telegram-bot-basics` — revert toolkit import path to local.**
  All `from "@agntdev/bot-toolkit"` imports rewritten to local
  relative paths (`../toolkit/...`). §3 header rewritten from
  "The Wrapper" to "what's already in your repo". Project
  structure updated: drop `.npmrc`, add `src/toolkit/`,
  `package.json` deps drop `@agntdev/bot-toolkit`. Common
  mistakes #7 reverted: "Don't vendor a `.tgz`" is the new
  directive (the toolkit is already vendored at `src/toolkit/`).
- **`telegram-bot-deploy` — major rewrite of the toolkit-distribution
  parts.** The "What" line, §2 (the platform Dockerfile), the
  bot-starter section, and Common mistakes #9–#11 all rewritten
  for the inlined pattern. Old §7 (migration to GH Packages)
  deleted; old §8 (local NODE_AUTH_TOKEN sim) deleted. §3
  "Strongly recommended" drops the `.npmrc` line. §5 "What NOT
  to commit" drops the `.tgz` / `.SHA256` rows. Quick Reference
  table updated. The deploy mechanics (§1, §3 build contract,
  §4 runtime contract, §5 state, §6 deploy timing) are unchanged.
- **`telegram-bot-sessions`, `telegram-bot-ui`,
  `telegram-test-advanced`, `telegram-test-specs`** —
  compat/frontmatter lines and import references updated
  from `@agntdev/bot-toolkit` to the inlined toolkit.
- **`telegram-bot-basics` project structure** — pre-v0.14.3
  reference block shows the GH-Packages era for historical
  context.
- **`agnt-cli-builder`** — no change (build_mode / claim
  flow / task structure are independent of the toolkit
  distribution pivot).
- **`CHANGELOG.md`** — this entry. v0.14.2 becomes a
  historical note.
- **`README.md`** — install block updated to point at
  `v0.14.3`; deploy-skill row description updated.

### Cross-references

- agnt-api PR #168 — `inline-toolkit-into-bot-starter` (merge)
- agnt-api PR #168 design doc —
  `docs/superpowers/specs/2026-06-17-inline-toolkit-into-bot-starter-design.md`
- agnt-api commits `46582c4`, `39c0f51`, `2a6a095`, `cebe3c2`,
  `1260c06` (PR #165 — the extraction that's now reversed)
  remain in history but should NOT be referenced as the
  canonical pattern.

### Files

- `skills/telegram-bot-basics/SKILL.md` — §3, project structure,
  Common mistakes #7
- `skills/telegram-bot-deploy/SKILL.md` — major rewrite of
  toolkit-related sections; deploy mechanics preserved
- `skills/telegram-bot-sessions/SKILL.md` — frontmatter, §3
- `skills/telegram-bot-ui/SKILL.md` — frontmatter, §3
- `skills/telegram-test-advanced/SKILL.md` — frontmatter, §2
- `skills/telegram-test-specs/SKILL.md` — frontmatter, §5
- `CHANGELOG.md` — this entry
- `README.md` — install + table row

### Install

```bash
# Pin to v0.14.3 (recommended for production)
npx skills add agntdev/skills/tree/v0.14.3

# Latest (default, tracks main)
npx skills add agntdev/skills
```

## v0.14.2 (2026-06-17) — sync skill with the platform's last week

> **Note:** v0.14.2 was the brief GH-Packages era (PR #165),
> reversed the same day by PR #168. v0.14.3 is the canonical
> re-sync. The content below is preserved as historical context
> for anyone who cloned the repo in the v0.14.2 window.

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

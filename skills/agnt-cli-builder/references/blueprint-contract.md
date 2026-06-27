# Bot blueprint — the build contract

For whole_bot, the blueprint is **your build spec**. The platform
writes `docs/blueprint.md` to the repo at project finalization; you
don't design it. Read it from the repo (`docs/blueprint.md`) or via
`agnt project blueprint <slug>` before touching any code.

## Reading the blueprint

```bash
# Either read from the repo:
cat docs/blueprint.md

# Or fetch from the API:
agnt project blueprint <slug>
```

## Fields that matter for an implementing agent

- **`archetype`** — booking / commerce / support / community /
  content / crm / workflow / education / finance / custom. Frames
  the whole product; let it shape your handler style.
- **`entry_points`** — buttons, slash commands, and callbacks the
  owner expects discoverable. If a feature isn't here, it's not
  part of v1. If it IS here, you must wire it up.
- **`flows`** — named multi-step conversations. Each flow's `steps`
  is what your handler must execute.
- **`data_entities`** — names, fields, retention (`none` / `session` /
  `persistent`). `persistent` means toolkit storage (Redis-backed),
  not in-memory.
- **`required_tests`** — dialog-level acceptance tests that MUST
  exist in `tests/specs/<slug>.json`. These are gating — missing
  one means the build fails.
- **`edge_cases`**, **`permissions_privacy`**, **`owner_controls`**
  — read these before sketching the handler; they often dictate
  non-obvious branches (admin-only callbacks, GDPR scrub, etc.).

## The blueprint supersedes the free-form spec

If your task body contains a blueprint block, treat it as the
ground truth for which entry points / flows / tests to produce. If
it conflicts with the free-form brief, the blueprint wins — it
was refined by the platform's clarifying pass.

## What to do with the blueprint

For every entry_point → handler + spec:

```text
src/handlers/<entry_point>.ts   # grammY Composer, default export
tests/specs/<entry_point>.json  # BotSpec dialog tests (see telegram-test-specs)
tests/commands/<entry_point>.json  # slash command manifest (only if command added)
```

For every flow → handler that implements the flow's `steps`:

```text
src/handlers/<flow_slug>.ts    # state machine over ctx.session.step
tests/specs/<flow_slug>.json   # one spec per flow step (Pattern A in flow-patterns)
```

For every data_entity with `retention: persistent` → use the
inlined toolkit's Redis-backed storage (see
[telegram-bot-sessions](../../telegram-bot-sessions/SKILL.md)).

For every `required_test` → write the matching `tests/specs/<slug>.json`
entry. The tests-gate fails the build if any are missing.

## What NOT to do

- Don't redesign the bot. The blueprint is the spec.
- Don't add features not in the blueprint. The owner didn't ask for
  them; they'll bloat the bot and shift the reward split.
- Don't drop required_tests. They gate publish.
- Don't use `agnt ready` / `agnt tasks` / `agnt task *` — whole_bot
  has no per-task DAG. Your next pass is your next PR.
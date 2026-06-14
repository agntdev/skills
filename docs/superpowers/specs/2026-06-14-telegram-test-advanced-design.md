# Design: `telegram-test-advanced` skill

Date: 2026-06-14
Repo: `agnt-skills` (`github.com/agntdev/skills`)
Branch: `feat/telegram-test-advanced-skill`

## Summary

A new agent skill that teaches how to test Telegram bots **when declarative
BotSpec JSON is not enough**. It is a gap-filling sibling to the existing
`telegram-test-specs` skill. It is guidance only — prose plus inline TS/JSON
snippets, no shipped testkit module.

A Telegram bot is a pure function in disguise: a webhook `Update` comes in,
and the bot answers by calling the Bot API. `telegram-test-specs` already
exploits that seam with a tokenless, in-process harness (synthetic Updates in,
captured API calls out, deep-subset assertions, a coverage gate). This skill
covers the three things that model deliberately cannot express.

## Why this skill exists (the gap)

`telegram-test-specs` is the objective publish gate. Its declarative BotSpec
JSON harness:
- feeds synthetic Updates into a fresh `makeBot()` per spec,
- installs a grammY transformer that captures every outgoing API call and
  always returns `{ ok: true }`,
- asserts via `send` / `expect` with deep-subset matching,
- enforces command coverage via a `GATE:<nonce>:{...}` verdict.

It cannot express:
1. **External dependencies** — a bot that hits a DB, an HTTP API, or a payment
   provider. JSON has no way to say "when the bot calls Stripe, return *this*."
2. **Error / adversarial Telegram responses** — the capture transformer always
   returns `{ ok: true }`, so `429` rate limits, `403` blocked-by-user, and
   "message is not modified" never happen, and the `bot.catch()` boundary is
   never exercised.
3. **Assertions JSON can't reach** — call ordering, argument shapes, "exactly
   N calls", or anything needing real code.

## Scope

### In scope
- The programmatic escape hatch: raw grammY + vitest with `bot.handleUpdate()`.
- Mocking external dependencies via dependency injection (and `vi.mock` fallback).
- Simulating Telegram API failures with a failing transformer; asserting error
  handling.
- Edge-case Update fixtures JSON specs handle awkwardly.

### Out of scope (defer with cross-links)
- The harness model, BotSpec JSON format, coverage gate, basic command/callback
  specs → `telegram-test-specs`.
- grammY / toolkit fundamentals, `makeBot()` factory → `telegram-bot-basics`.
- Session wiring → `telegram-bot-sessions`.
- The discovery-and-claim loop → `agnt-cli-builder`.

## Placement & naming

- Path: `skills/telegram-test-advanced/SKILL.md`.
- Name `telegram-test-advanced` parallels `telegram-test-specs` (the `telegram-test-*`
  testing pair). Chosen over `telegram-bot-testing-advanced`.
- Single `SKILL.md`, no `references/` (prose + inline snippets only).

## Frontmatter (must satisfy `scripts/validate-skills.mjs`)

- `name: telegram-test-advanced` (matches directory).
- `description:` folded `>` scalar; first sentence is the trigger; includes a
  `Triggers:` line (comma-separated phrases).
- `compatibility:` line (grammY + vitest; `@agntdev/bot-toolkit` for `makeBot()`).
- `license: MIT`.
- Any `./...` or `references/...` path mentioned must resolve to a real file —
  so cross-links to sibling skills use `../telegram-test-specs/SKILL.md` style
  paths that exist.

Draft description:

> Use when a Telegram bot's tests outgrow declarative BotSpec JSON — mocking
> external dependencies (DB / HTTP / payments), simulating Telegram API failures
> (429 rate limit, blocked user, message-not-modified), and writing raw
> `handleUpdate` tests. Assumes the harness basics from telegram-test-specs.
> Triggers: mock bot dependencies, test error paths, rate limit test,
> programmatic bot test, handleUpdate test, simulate api failure.

## Section outline

Opening: title `# telegram-test-advanced Skill`, one-line summary, the
`> **Built for the agntdev pipeline.**` callout cross-linking `agnt-cli-builder`
and `telegram-test-specs`, and an explicit "read telegram-test-specs first"
boundary note.

1. **When you've outgrown BotSpec JSON.** Decision table — stay in specs
   (commands, callbacks, happy-path dialogs; these feed the coverage gate) vs.
   drop to programmatic tests (deps, failures, ordering/shape assertions).
   Load-bearing warning: programmatic tests do **not** count toward the
   command-coverage gate, so keep command coverage in specs.

2. **The programmatic escape hatch.** Raw grammY + vitest. `makeBot()` → set a
   fake `botInfo` (skip `getMe`) → install a capture transformer → call
   `bot.handleUpdate(fakeUpdate())` → assert recorded `(method, payload)`.
   Inline `captureCalls(bot)` and `fakeUpdate()` helpers.
   IMPL NOTE: before hand-rolling, verify whether `@agntdev/bot-toolkit`
   exports a reusable test util; if it does, prefer it and show that instead.

3. **Mocking external dependencies.** The seam problem: deps read from module
   scope are untestable. Primary pattern — dependency injection:
   `makeBot(deps)` with real defaults, tests pass fakes. Fallback — `vi.mock()`
   when the factory signature can't change. Worked example: a bot that queries
   a DB and calls `fetch`. Note the interaction with the `makeBot()` factory
   contract from `telegram-bot-basics` (fresh bot per call; inject fresh fakes).

4. **Error & adversarial paths.** A *failing* transformer that returns
   `{ ok: false, error_code, description }` or throws, simulating `429`,
   `403` blocked-by-user, and "message is not modified". How grammY surfaces
   these (`GrammyError` vs `HttpError`) and how to assert the `bot.catch()`
   boundary / retry logic handles them.

5. **Edge-case Update fixtures.** Inputs specs handle awkwardly, as inline
   builders: edited messages, media messages, `my_chat_member` (bot blocked /
   kicked), `pre_checkout_query` (payments), inline queries.

Closing:
- `## Quick Reference` table (helper → purpose).
- `## Common mistakes` — e.g. relying on programmatic tests for coverage
  (gate only counts specs); transformer always returns `ok` so the error path
  is never exercised; mocking at module scope while the factory caches the real
  dep; forgetting fresh fakes per `makeBot()` call.

## Verification

- `node scripts/validate-skills.mjs` passes (frontmatter, name match, license,
  resolvable cross-links).
- All inline code is consistent with grammY + `@agntdev/bot-toolkit` idioms as
  documented in `telegram-bot-basics` / `telegram-test-specs` (no invented APIs).
- During implementation, confirm any `@agntdev/bot-toolkit` test-export claim
  against the actual package before asserting it; if unverifiable, present the
  hand-rolled pattern as the default and mention the toolkit util as an
  "if available" option.

## Open follow-ups (not blocking)

- Optional `references/` split if any section outgrows inline snippets — not
  planned for v1.

---
name: telegram-bot-anti-patterns
description: >
  Final review pass before shipping a Telegram bot. Covers the 20
  most common ways bots get rejected by the completeness review or
  fail UX review. Each anti-pattern is one file under references/
  (read individually when you suspect you might be doing it). Also
  includes the 21-item UX review checklist
  (references/ux-review-checklist.md) for a final pre-ship sweep.
  USE FOR: code review, anti-pattern, ux review, completeness
  review, pre-ship, lint, don't, never, ship checklist, lint pass,
  review pass — even if the user doesn't say "review" or
  "anti-pattern" explicitly. DO NOT USE FOR: the underlying rules
  the anti-patterns break (see telegram-bot-ux-rules), or button
  wiring (see telegram-bot-ui).
  Triggers: code review, anti-pattern, ux review, completeness review, pre-ship, lint, don't, never, ship checklist, lint pass, review pass.
compatibility: Works with any Telegram bot — pure review checklist,
  no runtime dependency.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, anti-patterns, code-review, ux-review, pre-ship, lint]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-ui
    - telegram-bot-ux-rules
    - telegram-bot-flow-patterns
    - telegram-bot-onboarding
---

# telegram-bot-anti-patterns Skill

The final review pass before shipping a Telegram bot — 20 anti-patterns (each one its own file under `references/`) plus a 21-item UX review checklist. For the rules these anti-patterns break, see [telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md). For flow patterns, see [telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md).

> **Built for the agntdev pipeline.** Run through the checklist in
> [references/ux-review-checklist.md](./references/ux-review-checklist.md)
> before shipping the bot. If any item is "no", the bot isn't done.

---

## Anti-patterns index

Each entry is one file under `references/`. Read individually when you suspect you're doing it.

| # | Anti-pattern | Why | File |
|---|---|---|---|
| 1 | New message per dialog step | Spams chat | [01-message-per-step.md](./references/01-message-per-step.md) |
| 2 | Button label as a question | Buttons are actions, not queries | [02-button-as-question.md](./references/02-button-as-question.md) |
| 3 | Wall-of-text /start | Mobile scrolls | [03-wall-of-text-start.md](./references/03-wall-of-text-start.md) |
| 4 | Emoji-only keyboards | Decoration ≠ clarity | [04-emoji-only-keyboards.md](./references/04-emoji-only-keyboards.md) |
| 5 | Missing `answerCallbackQuery()` | Spinner never stops | [05-missing-answer-callback-query.md](./references/05-missing-answer-callback-query.md) |
| 6 | Hardcoded `chat_id` | Multi-tenant fails | [06-hardcoded-chat-id.md](./references/06-hardcoded-chat-id.md) |
| 7 | No `/help` command | Users get stuck | [07-no-help-command.md](./references/07-no-help-command.md) |
| 8 | No empty state | New users see nothing | [08-no-empty-state.md](./references/08-no-empty-state.md) |
| 9 | Group ambient without privacy-mode off | Telegram doesn't deliver | [09-group-ambient-without-privacy-mode.md](./references/09-group-ambient-without-privacy-mode.md) |
| 10 | Secret-feature discovery | Users can't find features | [10-secret-feature-discovery.md](./references/10-secret-feature-discovery.md) |
| 11 | Edit message >48h old | "Message to edit not found" | [11-edit-message-too-old.md](./references/11-edit-message-too-old.md) |
| 12 | HTML without escaping `<`/`>`/`&` | "Can't parse entities" 400 | [12-html-without-escaping.md](./references/12-html-without-escaping.md) |
| 13 | Non-ASCII `callback_data` >30 chars | `BUTTON_DATA_INVALID` (64 BYTES) | [13-callback-data-bytes-vs-chars.md](./references/13-callback-data-bytes-vs-chars.md) |
| 14 | Missing `input_field_placeholder` | Users see empty input field | [14-missing-input-field-placeholder.md](./references/14-missing-input-field-placeholder.md) |
| 15 | No `copy_text` for IDs/codes | Users long-press, 4 taps wasted | [15-no-copy-text-for-ids.md](./references/15-no-copy-text-for-ids.md) |
| 16 | `bot.catch` leaks `err.message`/`err.stack` | Leaks internals, scares users | [16-bot-catch-leaks-stack.md](./references/16-bot-catch-leaks-stack.md) |
| 17 | Edit-in-place on a message you don't own | Telegram rejects | [17-edit-in-place-not-owned.md](./references/17-edit-in-place-not-owned.md) |
| 18 | `getUpdates` polling without backoff | Tight loop hammers the API | [18-polling-without-backoff.md](./references/18-polling-without-backoff.md) |
| 19 | "Reply /cancel to stop" without a `/cancel` handler | Dead instruction | [19-cancel-instruction-without-handler.md](./references/19-cancel-instruction-without-handler.md) |
| 20 | Sending media >20MB on official API | Webhook delivery fails | [20-media-over-webhook-limit.md](./references/20-media-over-webhook-limit.md) |

---

## UX review checklist

Before shipping, run through
[references/ux-review-checklist.md](./references/ux-review-checklist.md).
21 items across 5 sections (hero & onboarding, buttons & copy, flow,
errors, limits & parsing, performance, group / chat-type). If any
item is "no", the bot isn't done — even if all tests pass.

---

## Quick Reference

| Concern | Rule |
|---|---|
| Anti-pattern read | Match the suspected failure to the index, read that one file |
| UX checklist | Run [references/ux-review-checklist.md](./references/ux-review-checklist.md) before every ship |
| Lint pass | If `bot.catch` exposes `err.stack`, fix immediately |
| Pre-ship gate | All 21 checklist items = yes |

---

## Cross-references

- `telegram-bot-ux-rules` — the rules the anti-patterns break
- `telegram-bot-api-fundamentals` — HTTP / grammY / toolkit / limits
- `telegram-bot-ui` — keyboard mechanics
- `telegram-bot-flow-patterns` — flow patterns (the proper way to do it)
- `telegram-bot-onboarding` — onboarding + Mini App graduation

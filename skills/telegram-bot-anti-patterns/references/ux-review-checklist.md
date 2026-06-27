---
title: UX review checklist
impact: HIGH
impactDescription: 21-item final review pass before ship
tags: ux-review, checklist, pre-ship, completeness-review
---

# UX review checklist

Before you ship a Telegram bot, run through this. If any item is
"no", the bot isn't done — even if all tests pass.

The LLM completeness-review will catch some, but the bot is "done"
when it works in the user's hands, not when the reviewer approves
the diff.

## Hero & onboarding

1. `/start` shows hero ≤ 6 lines + 3–5 menu buttons (no walls of text).
2. `/help` exists and lists every command.
3. First-run features show empty state, not silent.

## Buttons & copy

4. Every button label is verb-first, sentence case, ≤24 chars.
5. Emoji budget ≤ 1 per button, none on cancel.
6. Destructive actions have explicit confirmation.

## Flow

7. Each dialog updates the same message in place (no message spam).
8. `answerCallbackQuery()` is called on every callback path.
9. `/cancel` works from any step, resets `session.step = "idle"`.

## Errors

10. `bot.catch()` doesn't leak `err.message` / `err.stack` to users.
11. Error messages say what went wrong + suggest the next step.
12. Stuck flows (5min idle) auto-expire with a clear message.

## Limits & parsing

13. `callback_data` ≤ 64 bytes (test in UTF-8 bytes for non-ASCII).
14. Message text ≤ 4096 chars; captions ≤ 1024 (truncate before send).
15. HTML output escapes `<`/`>`/`&` (and `&` first, not last).

## Performance

16. Fast ops (<500ms) skip loading state.
17. Slow ops (3s+) use `sendChatAction("typing")` or `sendRichMessageDraft` for LLM flows.
18. Edits throttled ≤ 30/min globally; iOS keyboards ≤ 5 rows; Desktop ≤ 4 cols.

## Group / chat-type

19. Group bot checks `can_read_all_group_messages`; doesn't promise ambient behavior if off.
20. Supergroup topic replies include `message_thread_id`.
21. Channel bot posts only; never reads user messages.

---

## Verifying each item

For each "no", find the relevant anti-pattern file:

| Item | Anti-pattern |
|---|---|
| 1 | [03-wall-of-text-start.md](./03-wall-of-text-start.md) |
| 2 | [07-no-help-command.md](./07-no-help-command.md) |
| 3 | [08-no-empty-state.md](./08-no-empty-state.md) |
| 4, 5, 6 | [04-emoji-only-keyboards.md](./04-emoji-only-keyboards.md), [02-button-as-question.md](./02-button-as-question.md) |
| 7 | [01-message-per-step.md](./01-message-per-step.md) |
| 8 | [05-missing-answer-callback-query.md](./05-missing-answer-callback-query.md) |
| 9 | [19-cancel-instruction-without-handler.md](./19-cancel-instruction-without-handler.md) |
| 10 | [16-bot-catch-leaks-stack.md](./16-bot-catch-leaks-stack.md) |
| 11 | [16-bot-catch-leaks-stack.md](./16-bot-catch-leaks-stack.md) |
| 12 | see [telegram-bot-flow-patterns](../../telegram-bot-flow-patterns/SKILL.md) §1 P4 |
| 13 | [13-callback-data-bytes-vs-chars.md](./13-callback-data-bytes-vs-chars.md) |
| 14 | see [telegram-bot-api-fundamentals](../../telegram-bot-api-fundamentals/SKILL.md) §4 |
| 15 | [12-html-without-escaping.md](./12-html-without-escaping.md) |
| 16, 17 | see [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §3 |
| 18 | [14-missing-input-field-placeholder.md](./14-missing-input-field-placeholder.md) (placeholder), see also ux-rules §6 |
| 19 | [09-group-ambient-without-privacy-mode.md](./09-group-ambient-without-privacy-mode.md) |
| 20 | see [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §5 |
| 21 | see [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §5 |

If any check fails, fix and re-run. Don't ship "I'll fix the next one
later" — completeness review is the gate, not the goal.
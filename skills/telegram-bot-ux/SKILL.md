---
name: telegram-bot-ux
description: >
  Router for Telegram bot UX skills. Picks the right sub-skill based
  on the UX concern. USE FOR: bot UX, user experience, telegram bot
  copy, telegram bot design, "make the bot feel right", "what should
  the bot say", "how should the bot behave" — even if the user
  doesn't say "UX" or "Telegram" explicitly. DO NOT USE FOR: keyboard
  wiring mechanics (see telegram-bot-ui), Bot API ground truth (see
  telegram-bot-api-fundamentals), flow patterns (see
  telegram-bot-flow-patterns), or session persistence (see
  telegram-bot-sessions).
  Triggers: bot UX, user experience, telegram bot copy, telegram bot design, make the bot feel right, what should the bot say, how should the bot behave.
compatibility: Works with any Telegram bot — pure router skill.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, ux, router]
  related_skills:
    - telegram-bot-ux-rules
    - telegram-bot-flow-patterns
    - telegram-bot-onboarding
    - telegram-bot-anti-patterns
---

# telegram-bot-ux — router

The UX bundle for Telegram bots is split across four skills. Pick
based on the concern:

- **Strings and timings (microcopy, error/loading UX, media UX,
  chat-type UX, performance budgets)** →
  [telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md)
- **Multi-step conversation patterns (wizard, branching menu,
  search-then-pick, multi-step form, undo, checklist, rich
  message, streaming AI)** →
  [telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md)
- **First 30–60 seconds with a user (/start hero, /help, empty
  state, Mini App graduation)** →
  [telegram-bot-onboarding](../telegram-bot-onboarding/SKILL.md)
- **Pre-ship review pass (20 anti-patterns + 21-item UX checklist)** →
  [telegram-bot-anti-patterns](../telegram-bot-anti-patterns/SKILL.md)

For keyboard wiring mechanics, see [telegram-bot-ui](../telegram-bot-ui/SKILL.md).
For the Bot API foundation, see [telegram-bot-api-fundamentals](../telegram-bot-api-fundamentals/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the build loop.
---
name: telegram-bot-onboarding
description: >
  Design a Telegram bot's first 30–60 seconds with a user. Covers
  /start hero and menu wiring, /help pattern, empty-state copy
  for first-run features, follow-up sequences (easy-exit,
  frequency caps, quiet hours), and the decision tree for
  graduating to a Telegram Mini App. USE FOR: onboarding,
  /start hero, first-run, empty state, /help, follow-up,
  frequency cap, quiet hours, Mini App graduation, web_app
  button, welcome flow, new user flow — even if the user
  doesn't say "onboarding" or "Mini App" explicitly. DO NOT USE
  FOR: button wiring (see telegram-bot-ui), flow patterns (see
  telegram-bot-flow-patterns), microcopy rules (see
  telegram-bot-ux-rules). Triggers: onboarding, /start hero,
  first-run, empty state, /help, follow-up, frequency cap, quiet
  hours, Mini App graduation, web_app button, welcome flow, new user flow.
compatibility: Works with grammY + the inlined toolkit's main-menu
  helpers (registerMainMenuItem) from src/toolkit/ui/.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, onboarding, first-run, empty-state, help, mini-app, graduation]
  related_skills:
    - telegram-bot-ui
    - telegram-bot-flow-patterns
    - telegram-bot-ux-rules
    - telegram-bot-api-rich-messages
---

# telegram-bot-onboarding Skill

First 30–60 seconds with a user: the /start hero + menu, /help, empty-state copy, follow-up sequences, and the Mini App graduation decision. For microcopy/error/loading UX rules, see [telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md). For flow patterns (wizard, branching, etc.), see [telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the build loop.

---

## 1. Onboarding — first 30–60 seconds

Onboarding has a **clock**: segment or lose the user. After 60s of
unclear choice, drop-off is steep.

### Step 1: `/start` sends a hero + 3–5 menu buttons

```ts
bot.command("start", async (ctx) => {
  ctx.session.step = "menu";
  await ctx.reply(
    "👋 Welcome to Bookings.\n\n" +
    "What brings you here?",
    {
      reply_markup: menuKeyboard([
        { text: "📅 Book a slot", data: "menu:book" },
        { text: "📋 My bookings", data: "menu:my" },
        { text: "❓ How it works", data: "menu:help" },
      ]),
    },
  );
});
```

**Rules:**
- **Hero ≤ 6 lines.** No walls of text.
- **3–5 buttons max.** More than 5 = decision paralysis.
- **Wording matches user intent.** "Book a slot" not "Schedule resource reservation".
- **Emoji to disambiguate, not decorate.**
- **One primary CTA** (📅 Book) + one secondary (📋 My bookings) + one help escape (❓ How it works).

### Step 2: Branch into the chosen intent

Use Flow Pattern B (Branching menu) from
[telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md).

### Step 3: `/help` always exists

```ts
bot.command("help", async (ctx) => {
  await ctx.reply(
    "📖 How to use this bot:\n\n" +
    "• /start — Main menu\n" +
    "• /book — Book a slot\n" +
    "• /cancel — Cancel a pending flow\n" +
    "• /my — View your bookings\n\n" +
    "Need more help? Reply to this message.",
  );
});
```

### Step 4: Empty state for first-run features

If a feature has no data for this user, **show an empty state, not a silent message**.

```ts
bot.command("my", async (ctx) => {
  const bookings = await db.getBookings(ctx.from.id);
  if (bookings.length === 0) {
    await ctx.reply(
      "📋 You have no bookings yet.\n\n" +
      "Tap 📅 Book to schedule one.",
      {
        reply_markup: inlineKeyboard([[
          inlineButton("📅 Book now", "menu:book"),
        ]]),
      },
    );
    return;
  }
  // ... render bookings list
});
```

### Step 5: Easy exit + frequency caps

For follow-up sequences:

- **Stop button** always on automated messages.
- **Frequency cap**: ≤ 1 automated message per 12h per user unless they replied.
- **Quiet hours**: don't follow up at night in user's timezone.

### Sequences and onboarding copy rules

- **Easy exit** always: include "Stop" button or instructions like "Reply STOP to pause".
- **Frequency caps**: no more than 1 automated message per 12 hours per user unless they replied.
- **Quiet hours**: don't follow up at night in the user's timezone.
- **Light personalization**: avoid repeated identical messages; vary slightly.

---

## 2. Mini App graduation — when to upgrade from inline keyboards

Inline keyboards hit a ceiling. Graduate to a **Telegram Mini App**
(embedded web view) when **any** of these thresholds is hit:

| Threshold | Why inline keyboards fail |
|---|---|
| Option list **>50 items** with re-sorts >1/hour | Client cache invalidates; pagination breaks. |
| **Multi-select with Apply** semantics | No native checkbox in inline keyboards — you need a message per toggle. |
| **Compliance audit trail** required | `callback_data` retained only 24h via `getUpdates`. Web App logs instantly to your store. |
| **>4 KB payload** per state | Inline keyboard JSON explodes. Web App streams from your backend. |

When **none** of these apply, **stay on inline keyboards** — they're
cheaper to build, render faster, and don't require web hosting.

### Decision

```
Need >50 items that change frequently?
├── Yes → Mini App
└── No → Inline keyboards
Multi-select with Apply semantics?
├── Yes → Mini App
└── No → Inline keyboards
Need full audit trail of user interactions?
├── Yes → Mini App
└── No → Inline keyboards
Anything else (≤50 items, simple choices, real-time feedback)?
└── Inline keyboards (default)
```

### Web App button

The bridge between inline keyboards and Mini App:

```ts
inlineKeyboard([[
  webAppButton("🛒 Open shop", "https://shop.example.com/twa"),
]])
```

User taps → Mini App opens → user interacts in the embedded web view →
app sends a message back via `sendMessage` on close. Use for: catalog
browse, settings panels, checkout, dashboards.

---

## Quick Reference

| Concern | Rule |
|---|---|
| /start hero | ≤ 6 lines, sentence case, 1 primary CTA + 1 secondary + 1 help |
| Buttons on /start | 3–5 max, verb-first, ≤24 chars |
| /help command | Always exists; lists every command |
| Empty state | Always show "No X yet — tap Y to start." |
| Follow-up frequency | ≤ 1 message per 12h unless user replied |
| Quiet hours | No follow-ups overnight in user's TZ |
| Mini App trigger | >50 items w/ re-sorts, multi-select Apply, audit trail, >4KB |

---

## Cross-references

- `telegram-bot-flow-patterns` — branching menu pattern, linear wizard, search-then-pick
- `telegram-bot-ui` — `menuKeyboard`, `inlineKeyboard`, `webAppButton`
- `telegram-bot-ux-rules` — microcopy, button labels, error/loading UX
- `telegram-bot-api-rich-messages` — Rich Messages, Checklists

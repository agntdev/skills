---
name: telegram-bot-flow-patterns
description: >
  Implement a multi-step Telegram bot conversation. Covers five
  session-FSM primitives (typed step enum, cancel from any step,
  per-step handler with input filter, flow-timeout sweeper,
  back/undo button) and seven reusable patterns: linear wizard,
  branching menu, search-then-pick, multi-step form with
  back-stack, undo for destructive actions, native checklist flow,
  rich message flow, streaming AI flow. No FSM library — flows use
  ctx.session.step. USE FOR: flow pattern, wizard, branching menu,
  search-then-pick, multi-step form, undo, checklist flow, rich
  message flow, streaming AI, FSM, session step, ctx.session.step,
  multi-step conversation, bot flow design — even if the user
  doesn't say "flow" or "FSM" explicitly. DO NOT USE FOR: button
  wiring (see telegram-bot-ui), the Bot API foundation (see
  telegram-bot-api-fundamentals), session persistence details (see
  telegram-bot-sessions), or microcopy / error UX (see
  telegram-bot-ux-rules).
  Triggers: flow pattern, wizard, branching menu, search-then-pick, multi-step form, undo, checklist flow, rich message flow, streaming AI, FSM, session step, ctx.session.step, multi-step conversation, bot flow design.
compatibility: Works with grammY + agntdev toolkit sessions. No FSM
  library — flows use ctx.session.step from the per-feature handler
  in src/handlers/<slug>.ts.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, flow-pattern, fsm, session, wizard, undo, checklist]
  related_skills:
    - telegram-bot-ui
    - telegram-bot-sessions
    - telegram-bot-ux-rules
    - telegram-bot-onboarding
    - telegram-bot-api-rich-messages
---

# telegram-bot-flow-patterns Skill

Multi-step conversation patterns for Telegram bots — five session-FSM primitives and seven reusable patterns. For microcopy/error/loading UX rules, see [telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md). For onboarding + Mini App graduation, see [telegram-bot-onboarding](../telegram-bot-onboarding/SKILL.md). For keyboard mechanics, see [telegram-bot-ui](../telegram-bot-ui/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the build loop.

---

## 1. Five primitives

The agntdev bot template does **not** ship an FSM library. We use the
`ctx.session.step` primitive already in
[telegram-bot-sessions](../telegram-bot-sessions/SKILL.md) and
[telegram-bot-api-fundamentals](../telegram-bot-api-fundamentals/SKILL.md)
(makeBot + Session type).

### P1 — typed step enum (in session shape)

```ts
type Step =
  | "idle"
  | "menu"
  | "awaiting_name"
  | "awaiting_age"
  | "confirming"
  | "done";

interface Session {
  step: Step;
  // flow data
  name?: string;
  age?: number;
}
```

### P2 — cancel from any step

```ts
bot.command("cancel", async (ctx) => {
  ctx.session.step = "idle";
  await ctx.reply("Cancelled. Tap /start to begin again.", {
    reply_markup: { remove_keyboard: true },
  });
});
```

### P3 — per-step handler with input filter

```ts
bot.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_name") return next();

  const name = ctx.message.text.trim();
  if (name.length < 2) {
    await ctx.reply("Name too short — try again.");
    return;  // stay in awaiting_name
  }

  ctx.session.name = name;
  ctx.session.step = "awaiting_age";
  await ctx.reply(`Got it, ${name}. How old are you?`, {
    reply_markup: { force_reply: true, input_field_placeholder: "Type your age…" },
  });
});
```

### P4 — flow timeout (sweeper)

```ts
// In your session shape:
interface Session {
  step: Step;
  expiresAt?: number;  // unix ms
}

// On entering a step:
function enterStep(ctx: BotContext, step: Step, ttlMs = 5 * 60 * 1000) {
  ctx.session.step = step;
  ctx.session.expiresAt = Date.now() + ttlMs;
}

// Global middleware:
bot.use(async (ctx, next) => {
  if (ctx.session.expiresAt && Date.now() > ctx.session.expiresAt) {
    ctx.session.step = "idle";
    ctx.session.expiresAt = undefined;
    await ctx.reply("Flow timed out. Tap /start to begin again.");
  }
  return next();
});
```

### P5 — back / undo button on the current message

```ts
bot.callbackQuery(/^back:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "menu";
  await ctx.editMessageText("Main menu:", {
    reply_markup: mainMenuKeyboard(),
  });
});
```

---

## 2. Seven flow patterns

### Pattern A — Linear wizard

One question at a time, ForceReply markup, session fields per step.

```
/start
  → step: awaiting_name (ForceReply: "Type your name")
  → on text: validate → step: awaiting_age
  → on text: validate → step: confirming (show summary + confirm row)
  → on callback confirm:yes → step: done → reply "Booked!"
  → on callback confirm:no → step: awaiting_name
```

**Pros:** simplest model. Clear progress. Easy to test (one spec per step).
**Cons:** slow for users who know what they want. Use for: sign-up, booking, intake.

### Pattern B — Branching menu

Entry sends hero + inline menu; tapping a branch sets `step = "branch_X"`.

```ts
bot.command("start", async (ctx) => {
  ctx.session.step = "menu";
  await ctx.reply("What do you want to do?", {
    reply_markup: menuKeyboard([
      { text: "📅 Book", data: "menu:book" },
      { text: "📋 My bookings", data: "menu:my" },
      { text: "❓ Help", data: "menu:help" },
    ]),
  });
});

bot.callbackQuery(/^menu:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const choice = ctx.callbackQuery.data.split(":")[1];
  ctx.session.step = `branch_${choice}` as Step;

  switch (choice) {
    case "book": await startBookingFlow(ctx); break;
    case "my":   await showBookings(ctx);     break;
    case "help": await showHelp(ctx);         break;
  }
});
```

Use for: any bot with multiple distinct user intents.

### Pattern C — Search-then-pick

Text query → debounce → paginated results → tap → detail.

```ts
bot.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "idle") return next();
  const q = ctx.message.text.trim();
  if (q.length < 2) return next();

  const items = await search(q);  // up to 50
  if (items.length === 0) {
    return ctx.reply(`No results for "${q}". Try different words?`);
  }

  const { pageItems, controls } = paginate(items, { page: 0, perPage: 5 });
  await ctx.reply(`Results for "${q}":`, {
    reply_markup: inlineKeyboard([
      ...pageItems.map(i => [inlineButton(i.name, `pick:${i.id}`)]),
      ...controls.inline_keyboard,
    ]),
  });
});
```

Use for: catalog browse, contact search, lookup tools.

### Pattern D — Multi-step form with back-stack

Like linear wizard but with `ctx.session.history = []` to support going back:

```ts
interface Session {
  step: Step;
  history: Step[];   // stack of visited steps
}

function pushStep(ctx: BotContext, step: Step) {
  ctx.session.history.push(ctx.session.step);
  ctx.session.step = step;
}

bot.callbackQuery(/^back:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prev = ctx.session.history.pop();
  ctx.session.step = prev ?? "idle";
  // re-render the previous step's UI
});
```

Use for: complex sign-up, multi-page settings, checkout.

### Pattern E — Undo pattern

User does action → bot does it + shows "↩️ Undo" inline button → button
auto-expires in 30s.

```ts
bot.callbackQuery(/^do:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  await db.delete(id);
  await ctx.editMessageText(`✅ Deleted #${id}`, {
    reply_markup: inlineKeyboard([[
      inlineButton("↩️ Undo (30s)", `undo:delete:${id}`),
    ]]),
  });

  // Schedule undo expiry
  setTimeout(async () => {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* message edited elsewhere */ }
  }, 30_000);
});

bot.callbackQuery(/^undo:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Restored" });
  const id = ctx.match[1];
  await db.restore(id);
  await ctx.editMessageText(`✅ Restored #${id}`, {
    reply_markup: { inline_keyboard: [] },
  });
});
```

Use for: destructive actions (delete, kick, archive, cancel).

### Pattern F — Checklist flow (Bot API 9.1)

User sees a native checklist; taps to mark done. State in your DB.

```ts
bot.command("packing", async (ctx) => {
  const items = await db.getPackingList(ctx.from.id);  // [{ id, text, done }]
  await ctx.api.sendChecklist(ctx.chat.id, {
    checklist: {
      title: "Pack for the trip",
      tasks: items.map(i => ({
        id: i.id,
        text: i.text,
        completed: i.done,
      })),
    },
  });
});

// When user marks a task done (incoming update from the message)
bot.on("checklist_task_done", async (ctx) => {
  const taskId = ctx.update.checklist_task_done.task_id;
  await db.markDone(ctx.from.id, taskId);
});
```

State lives in your backend; the message is a render of that state. Use for: todos, packing lists, onboarding steps, group chores.

### Pattern G — Rich message flow (Bot API 10.1)

Build a structured message with sections, divider, footer. Edit in place.

```ts
bot.callbackQuery(/^book:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  const slot = await db.getSlot(id);

  await ctx.editMessageText("…", {  // replaced by rich edit below
  });
  await ctx.api.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, {
    rich_message: {
      blocks: [
        { type: "RichBlockSectionHeading", text: { type: "RichTextBold", text: "Confirm booking" } },
        { type: "RichBlockDivider" },
        { type: "RichBlockParagraph", text: [
          { type: "RichTextText", text: "Slot: " },
          { type: "RichTextBold", text: `${slot.date} ${slot.time}` },
        ]},
        { type: "RichBlockParagraph", text: [
          { type: "RichTextText", text: "Service: " },
          { type: "RichTextBold", text: slot.service },
        ]},
        { type: "RichBlockDivider" },
        { type: "RichBlockFooter", text: { type: "RichTextItalic", text: "Reply /cancel to cancel up to 2h before." } },
      ],
    },
    reply_markup: confirmKeyboard(`book:${id}`),
  });
});
```

Use for: confirmations, summaries, status displays. Replaces the
old "wall of bold text" pattern with native structured blocks.

### Pattern H — Streaming AI flow (Bot API 10.1 `sendRichMessageDraft`)

Send empty draft, update on each token, finalize. See
[telegram-bot-api-rich-messages](../telegram-bot-api-rich-messages/SKILL.md)
§1 for the full streaming pattern.

Use for: any LLM-driven response. Replaces "Loading…" placeholders
with smooth streaming UX.

---

## Pattern selection

| Pattern | Use for |
|---|---|
| **A — Linear wizard** | sign-up, booking, intake (clear sequential steps) |
| **B — Branching menu** | any bot with distinct user intents |
| **C — Search-then-pick** | catalog browse, contact search, lookup |
| **D — Multi-step form** | complex sign-up, settings, checkout (with back) |
| **E — Undo** | destructive actions (delete, kick, cancel) |
| **F — Checklist** | todos, packing lists, onboarding, group chores |
| **G — Rich message** | confirmations, summaries, status displays |
| **H — Streaming AI** | any LLM-driven response |

A typical bot mixes patterns:
- `/start` → Pattern B (branching menu)
- "Book" branch → Pattern A (linear wizard) ending in Pattern G (rich confirmation)
- "My bookings" branch → simple list + Pattern E (undo a cancel)
- Free-form text → Pattern C (search-then-pick) when idle

---

## Cross-references

- `telegram-bot-sessions` — `ctx.session.step` primitive, session shape design
- `telegram-bot-ui` — `menuKeyboard`, `inlineKeyboard`, `confirmKeyboard`, `paginate`, `webAppButton`, callback routing
- `telegram-bot-ux-rules` — microcopy, error UX, loading UX, performance budgets
- `telegram-bot-onboarding` — `/start` hero, empty state, Mini App graduation
- `telegram-bot-api-rich-messages` — Rich Messages (10.1), Checklists (9.1), `sendRichMessageDraft`
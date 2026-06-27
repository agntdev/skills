---
title: "Reply /cancel to stop" without a /cancel handler
impact: HIGH
impactDescription: dead instruction, user gets stuck
tags: anti-pattern, cancel, command, escape-hatch
---

## Don't: tell users to "/cancel" if you don't have a /cancel handler

You tell users "Reply /cancel at any time to stop this flow" — but
no `bot.command("cancel", ...)` handler exists. The user's
`/cancel` message gets routed to a generic "unknown command" path,
or worse, gets interpreted as text and pushed into the wrong step of
your flow.

## Do: always wire `/cancel` (and `/start`)

```ts
// ✅ Required — escape hatch from any flow step
bot.command("cancel", async (ctx) => {
  ctx.session.step = "idle";
  await ctx.reply("Cancelled. Tap /start to begin again.", {
    reply_markup: { remove_keyboard: true },  // dismiss any reply keyboard
  });
});

// ✅ Required — reset to known state
bot.command("start", async (ctx) => {
  ctx.session.step = "menu";
  await ctx.reply("👋 Main menu:", { /* main menu markup */ });
});
```

The cancel handler:
- Resets `ctx.session.step = "idle"` (canonical reset state)
- Sends a one-line confirmation
- Removes any active reply keyboard (`remove_keyboard: true`)
- Doesn't ask "are you sure?" — cancel is a one-tap action

This is also primitive P2 in
[telegram-bot-flow-patterns](../../telegram-bot-flow-patterns/SKILL.md) §1.
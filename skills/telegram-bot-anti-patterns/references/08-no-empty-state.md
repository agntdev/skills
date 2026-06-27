---
title: No empty state for first-run features
impact: HIGH
impactDescription: new users see nothing, assume the bot is broken
tags: anti-pattern, onboarding, empty-state
---

## Don't: show nothing when there's no data

If a user opens "My bookings" for the first time and sees an empty
chat, they assume the bot is broken. They never discover the
"Book now" CTA.

## Do: show an empty state with a next-step CTA

```ts
// ❌ Bad — silent on empty
bot.command("my", async (ctx) => {
  const bookings = await db.getBookings(ctx.from.id);
  if (bookings.length === 0) return;  // user sees nothing
  // ... render list
});

// ✅ Good — empty state with CTA
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

Empty-state copy rules:
- Sentence case
- Lead with what the user has (or doesn't have)
- One CTA to the next obvious action

Full rules in [telegram-bot-onboarding](../../telegram-bot-onboarding/SKILL.md) §1 step 4.
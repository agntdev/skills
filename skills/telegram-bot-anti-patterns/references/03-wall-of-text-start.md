---
title: Wall-of-text /start
impact: HIGH
impactDescription: mobile scrolls, users abandon
tags: anti-pattern, onboarding, microcopy
---

## Don't: send a wall of text on /start

A /start hero that explains everything the bot does ("Welcome! This
bot helps you book restaurant tables, manage your reservations, view
menus, rate places, get recommendations...") makes mobile users
scroll. After 4–5 lines of dense text, drop-off is steep.

## Do: 3–5 buttons on /start

Lead with a one-sentence hello + the most likely first action:

```ts
// ❌ Bad — wall of text
await ctx.reply(
  "👋 Welcome to Bookings!\n\n" +
  "This bot helps you book restaurant tables in your city. You can " +
  "browse availability for any date up to 60 days in advance, make " +
  "reservations for parties of 1-12, modify or cancel existing " +
  "bookings, rate your experience after dining, and get personalized " +
  "recommendations based on your past visits. We support over 500 " +
  "restaurants in your area and are adding more every week. To get " +
  "started, you'll need to share your location so we can show you " +
  "nearby options. You can also browse without sharing location by " +
  "entering a city or neighborhood manually. We respect your " +
  "privacy and never share your data with restaurants without your " +
  "explicit consent..."
);

// ✅ Good — hero + 3 buttons
await ctx.reply(
  "👋 Welcome to Bookings.\n\n" +
  "What would you like to do?",
  {
    reply_markup: menuKeyboard([
      { text: "📅 Book a table",   data: "menu:book" },
      { text: "📋 My reservations", data: "menu:my"   },
      { text: "❓ How it works",   data: "menu:help" },
    ]),
  },
);
```

Hero ≤ 6 lines, 3–5 buttons, one primary CTA. See
[telegram-bot-onboarding](../../telegram-bot-onboarding/SKILL.md) §1.
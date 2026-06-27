---
title: Secret-feature discovery (no onboarding menu)
impact: HIGH
impactDescription: users can't find features, bot looks half-done
tags: anti-pattern, onboarding, discoverability
---

## Don't: hide features behind undiscoverable commands

A bot with 10 commands but no `/start` menu looks half-done. Users
have to memorize slash commands or read the docs to discover what
the bot does. The Telegram UX is built around tapping, not typing.

## Do: every feature is a button on /start

```ts
bot.command("start", async (ctx) => {
  ctx.session.step = "menu";
  await ctx.reply("👋 What would you like to do?", {
    reply_markup: menuKeyboard([
      { text: "📅 Book",      data: "menu:book" },
      { text: "📋 My stuff",  data: "menu:my"    },
      { text: "⚙️ Settings",  data: "menu:settings" },
      { text: "❓ Help",      data: "menu:help" },
    ]),
  });
});

// Each menu item is a callback branch, not a slash command:
bot.callbackQuery(/^menu:book/, async (ctx) => { /* ... */ });
bot.callbackQuery(/^menu:my/,   async (ctx) => { /* ... */ });
```

Reserve slash commands for `/start`, `/help`, and free-form typed
input the user already knows how to enter (search query, note,
address, date). A bot with 10–20 slash commands is a failure for
the non-technical owner audience.

Full rules in [telegram-bot-onboarding](../../telegram-bot-onboarding/SKILL.md) §1.
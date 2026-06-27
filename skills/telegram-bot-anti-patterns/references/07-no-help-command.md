---
title: No /help command
impact: MEDIUM
impactDescription: users get stuck, support tickets pile up
tags: anti-pattern, onboarding, help
---

## Don't: ship a bot without /help

A bot with no `/help` command traps users the moment their expected
flow breaks. They can't discover what the bot does, what commands
exist, or how to reach a human.

## Do: always ship /help

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

The /help reply should:
- List every command the bot exposes
- Mention the main menu (and that /start always opens it)
- Include a "Reply to this message" hint as a low-cost support
  escape hatch (in groups, this won't work — see chat-type UX for
  the group /help pattern)

The agntdev test harness auto-discovers commands from
`tests/commands/*.json`; the /help text should match.
---
title: Group ambient messages without privacy-mode off
impact: HIGH
impactDescription: Telegram doesn't deliver them, users see silence
tags: anti-pattern, group, privacy-mode, ambient
---

## Don't: promise ambient group behavior without disabling privacy mode

If your bot promises to "greet every new member" or "send a daily
reminder to the group," it **cannot see those events** by default.
Telegram only delivers to a group bot messages that:

- Start with `/` (a command)
- Mention the bot by username
- Are replies to the bot's own message
- Are service messages (member joins, etc.)

Your ambient code runs but never fires — Telegram doesn't deliver
the updates it would react to.

## Do: check `can_read_all_group_messages` and warn at startup

```ts
export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, {
    initial: () => ({ step: "idle" }),
  });

  // Warn at startup if a group bot has privacy mode on
  if (!bot.botInfo.can_read_all_group_messages) {
    console.warn("[bot] Privacy mode is ON — bot only sees commands, mentions, replies in groups.");
  }

  // ... handlers ...
  return bot;
}
```

The owner can disable privacy mode in BotFather
(`/setprivacy` → Disable) — but **never promise ambient behavior
without verifying first**, and surface the warning at startup so
the owner notices before users do.

Full chat-type rules in [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §5.
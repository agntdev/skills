---
title: New message per dialog step
impact: HIGH
impactDescription: message spam, breaks flow continuity
tags: anti-pattern, flow, messaging
---

## Don't: send a new message per dialog step

Sending a fresh `sendMessage` per wizard step (ask name → ask age →
ask email → ask phone → confirm) **spams the chat**. The user sees
six back-to-back messages they have to scroll past to find their
actual data.

## Do: edit-in-place

Use `editMessageText` (or `editMessageReplyMarkup`) on the same
message across steps. The user sees one stable slot in the chat,
and the message body changes to reflect the new step.

```ts
// ❌ Bad — six messages, six rows in chat
await ctx.reply("What's your name?");
await ctx.reply(`Got it, ${name}. What's your age?`);
await ctx.reply("What's your email?");
await ctx.reply("What's your phone?");
await ctx.reply("Confirm: send the details?");

// ✅ Good — one message, six edits
const placeholder = await ctx.reply("What's your name?");
await ctx.api.editMessageText(chatId, placeholder.message_id,
  `Got it, ${name}. What's your age?`);
await ctx.api.editMessageText(chatId, placeholder.message_id,
  "What's your email?");
// ...
```

For the full pattern, see
[telegram-bot-flow-patterns](../../telegram-bot-flow-patterns/SKILL.md)
Pattern A (Linear wizard).

Reference: [Telegram Bot UX — edit-in-place recommendation](https://core.telegram.org/bots/features)
---
title: Edit-in-place on a message you don't own
impact: MEDIUM
impactDescription: Telegram rejects, throws 400 error
tags: anti-pattern, editMessageText, ownership
---

## Don't: try to edit messages from other bots or the user

`editMessageText` only works on messages **your own bot** sent. If
you capture a `message_id` from an inbound message (a user message,
a message from another bot, a forwarded message), editing it
returns `400: message is not modified` or `400: message to edit not
found` — and in some cases throws a `GrammyError` that crashes your
handler if not caught.

## Do: scope `editMessageText` to your bot's outbound messages

The reliable pattern: only edit messages **your handler itself
sent** in the same conversation flow. Persist the `message_id` in
session and edit it on subsequent steps.

```ts
// ❌ Bad — edits the user's incoming message
bot.on("message:text", async (ctx) => {
  const userMessageId = ctx.message.message_id;
  // ... time passes, user does something else ...
  await ctx.api.editMessageText(ctx.chat.id, userMessageId, "Updated");  // 400
});

// ✅ Good — edits a message the bot sent
let botMessageId: number | undefined;
bot.command("start", async (ctx) => {
  const sent = await ctx.reply("What's your name?");
  botMessageId = sent.message_id;
});

bot.on("message:text", async (ctx) => {
  if (ctx.session.step !== "awaiting_name") return;
  const name = ctx.message.text.trim();
  // Edit the message the bot sent, not the user's reply
  await ctx.api.editMessageText(ctx.chat.id, botMessageId!, `Got it, ${name}.`);
});
```

For errors and edge cases, see
[11-edit-message-too-old.md](./11-edit-message-too-old.md) and the
error UX rules in
[telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §2.
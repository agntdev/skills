---
title: Editing a message >48h old
impact: MEDIUM
impactDescription: "message to edit not found" 400 error
tags: anti-pattern, editMessageText, error-handling
---

## Don't: call editMessageText on old messages without fallback

Telegram rejects edits to messages **older than 48 hours** with
`400: message to edit not found` (or `400: message is not modified`
if the new text matches exactly). If your handler blindly calls
`editMessageText` on every callback, dead callbacks spam errors.

## Do: try/catch with a `ctx.reply()` fallback

```ts
// ❌ Bad — bare edit
bot.callbackQuery(/^resend:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Updated text");  // throws if message >48h old
});

// ✅ Good — edit with fallback
bot.callbackQuery(/^resend:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.editMessageText("Updated text");
  } catch (err) {
    // Message too old (>48h) or identical — send new message instead
    await ctx.reply("Updated text");
  }
});
```

Also handle `400: message is not modified` silently (log it, don't
surface) — it fires when the new text equals the existing text and
is harmless.

Error UX rules in [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §2.
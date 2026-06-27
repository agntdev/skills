---
title: Missing answerCallbackQuery()
impact: HIGH
impactDescription: platform demotes bots with too few answers
tags: anti-pattern, callback, bot-api
---

## Don't: forget answerCallbackQuery

Telegram shows a loading spinner on the user's screen until you call
`answerCallbackQuery()`. If you skip it, the spinner hangs for ~30s,
then the user sees a "Bot didn't answer" toast and re-taps — which
fires the callback again, potentially double-mutating state.

The platform ranks bots by "Too few answers to callback queries" — a
real ranking signal. Missing `answerCallbackQuery` is the easiest
way to get demoted.

## Do: always call answerCallbackQuery

Treat it like a `return` statement — never conditional, never
optional. Call it at the end of every callback handler, before or
after your domain logic.

```ts
// ❌ Bad — sometimes forgotten
bot.callbackQuery("confirm:42", async (ctx) => {
  if (ctx.from?.id !== ADMIN_ID) return;  // early return without answering!
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Confirmed");
});

// ✅ Good — always answer
bot.callbackQuery("confirm:42", async (ctx) => {
  if (ctx.from?.id !== ADMIN_ID) {
    await ctx.answerCallbackQuery({ text: "Not authorized", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Confirmed");
});
```

Optional `text` shows as a toast; `show_alert: true` makes it a
modal dialog (use for errors, not confirmations).
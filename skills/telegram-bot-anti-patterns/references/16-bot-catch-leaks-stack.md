---
title: bot.catch replies with err.message or err.stack
impact: CRITICAL
impactDescription: leaks internals, scares users, helps attackers
tags: anti-pattern, error-handling, security, logging
---

## Don't: surface `err.message` or `err.stack` to the user

`bot.catch()` handlers that reply with the raw exception
(`ctx.reply(err.message)`) leak stack traces, internal endpoints,
SQL fragments, API keys embedded in error strings, and other
internals to the user. They also help attackers fingerprint your
stack and find exploits.

## Do: log the error, reply with a generic safe message

```ts
// ❌ Bad — leaks everything
bot.catch((err) => {
  console.error(err);
  ctx.reply(`Error: ${err.message}`).catch(() => {});  // ❌ never
});

// ✅ Good — log structured, reply generically
bot.catch((err) => {
  const ctx = err.ctx;
  // 1. Log the FULL error to your backend (with stack, request id)
  console.error("[bot error]", {
    update_id: ctx?.update?.update_id,
    err: err.error ?? err,
  });

  // 2. Try to tell the user something — but only if you can
  if (ctx?.reply) {
    ctx.reply("Something went wrong. Try again or /cancel.").catch(() => {});
  }
});
```

Error message rules for the user-facing reply:
- Plain language, no jargon
- Say what went wrong only when you can do so safely
  ("Couldn't load your bookings" is fine;
   "ECONNREFUSED 127.0.0.1:5432" is not)
- Suggest the next step
- One apology max

Full error UX rules in
[telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §2.
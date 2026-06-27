---
title: Hardcoded chat_id in source
impact: CRITICAL
impactDescription: multi-tenant fails, bot only works for one user
tags: anti-pattern, multi-tenant, scoping
---

## Don't: hardcode chat_id anywhere

Anywhere in your source — `const ADMIN_CHAT = 123456789;`,
`bot.api.sendMessage(123456789, "...");` — locks your bot to one
specific chat. Multi-tenant bots (and the entire agntdev model)
fail.

## Do: read chat_id from the context

Every handler receives `ctx` with the incoming chat identity:

```ts
// ❌ Bad — hardcoded
const ADMIN_CHAT = 123456789;
bot.command("broadcast", async (ctx) => {
  if (ctx.from?.id !== ADMIN_USER_ID) return;
  await ctx.api.sendMessage(ADMIN_CHAT, "Server status: OK");  // wrong recipient
});

// ✅ Good — uses the current chat
bot.command("broadcast", async (ctx) => {
  if (ctx.from?.id !== ADMIN_USER_ID) return;
  await ctx.api.sendMessage(ctx.chat.id, "Server status: OK");  // correct
});
```

For admin-only cross-chat broadcasts (a real admin tool), persist
the admin chat ID in env or a config file, never in source. For
everything else, `ctx.chat.id` / `ctx.from.id` is always correct.
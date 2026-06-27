---
title: callback_data with non-ASCII >30 chars
impact: CRITICAL
impactDescription: BUTTON_DATA_INVALID 400 error (it's 64 BYTES, not chars)
tags: anti-pattern, callback_data, limits, i18n
---

## Don't: assume callback_data is char-counted

`callback_data` is limited to **1–64 BYTES** (UTF-8), not characters.
For non-ASCII projects:

- Cyrillic ≈ 2 bytes/char → ~30 chars max
- Emoji ≈ 4 bytes → ~15 chars max
- CJK ≈ 3 bytes/char → ~21 chars max

Telegram rejects with `400: BUTTON_DATA_INVALID` and the user sees
nothing. This is the #1 silent killer for non-ASCII bots.

## Do: keep callback_data short and ASCII

Namespaced short prefixes work in any alphabet:

```ts
// ❌ Bad — 14 chars but 28 bytes in Cyrillic, near the limit
{ text: "Подтвердить", callback_data: "подтвердить:42" }

// ✅ Good — 7 bytes, ASCII, works everywhere
{ text: "✅ Подтвердить", callback_data: "confirm:42" }

// ✅ Also good — namespaced short prefix + ID
{ text: "📅 Book slot", callback_data: "slot:42" }
```

If you genuinely need >64 bytes of context, store a server-side map
keyed by a short UUID and put only the UUID in `callback_data`:

```ts
const callbacks = new Map<string, OrderData>();  // keyed by UUID
const uuid = crypto.randomUUID();
callbacks.set(uuid, { orderId: 42, slotId: 99, userId: ctx.from.id });
inlineKeyboard([[
  { text: "📋 Track", callback_data: `track:${uuid}` },
]]);

// In the handler:
bot.callbackQuery(/^track:/, async (ctx) => {
  const uuid = ctx.callbackQuery.data.split(":")[1];
  const data = callbacks.get(uuid);
  if (!data) {
    await ctx.answerCallbackQuery({ text: "Link expired", show_alert: true });
    return;
  }
  // ... use data.orderId, data.slotId, etc.
});
```

Full limits in [telegram-bot-api-fundamentals](../../telegram-bot-api-fundamentals/SKILL.md) §4.
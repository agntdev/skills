---
title: No copy_text button for IDs / codes / addresses
impact: MEDIUM
impactDescription: users long-press to copy, 4 taps wasted
tags: anti-pattern, button-type, copy_text, microcopy
---

## Don't: display an ID and expect users to long-press to copy

Telegram supports long-press → copy on message text, but it costs
the user **4 taps** to actually copy a string out: long-press → tap
"Copy" → switch apps → paste. For IDs, codes, and addresses users
need to capture, that's friction they don't expect.

## Do: use `copy_text` buttons

```ts
// ❌ Bad — user has to long-press the message to copy
await ctx.reply(`Your order ID is: ${orderId}`);
await ctx.reply(`Tracking: https://track.example.com/${orderId}`);

// ✅ Good — one tap to copy
inlineKeyboard([[
  { text: "📋 Copy order ID", copy_text: { text: orderId } },
  { text: "📦 Track",         callback_data: `track:${orderId}` },
]]);
```

`copy_text` is a one-tap "copy to clipboard" button (Bot API 7.x+).
Use it for anything the user will need to paste elsewhere:

- Order IDs, booking references, ticket numbers
- Invite codes, referral codes, coupon codes
- Tracking URLs, short links
- Crypto addresses, payment references
- One-time passwords (for handoff to another app)

One-tap copy is the cheapest UX upgrade for IDs and codes.

Full inline-button types in
[telegram-bot-api-rich-messages](../../telegram-bot-api-rich-messages/SKILL.md)
§4.
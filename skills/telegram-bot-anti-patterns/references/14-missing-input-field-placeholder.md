---
title: Missing input_field_placeholder on reply keyboards
impact: MEDIUM
impactDescription: users see empty input field, freeze
tags: anti-pattern, reply-keyboard, placeholder
---

## Don't: send a reply keyboard without `input_field_placeholder`

Without a placeholder, the input field above the reply keyboard is
empty. Users freeze — they don't know if they should type, what to
type, or whether the bot expects text at all.

## Do: always set `input_field_placeholder`

```ts
// ❌ Bad — empty placeholder
await ctx.reply("Main menu:", {
  reply_markup: {
    keyboard: [
      [{ text: "📅 Book" }, { text: "📋 My bookings" }],
    ],
    resize_keyboard: true,
  },
});

// ✅ Good — placeholder tells the user what to do
await ctx.reply("Main menu:", {
  reply_markup: {
    keyboard: [
      [{ text: "📅 Book" }, { text: "📋 My bookings" }],
    ],
    resize_keyboard: true,
    input_field_placeholder: "Type or tap…",
  },
});

// Also works for ForceReply:
await ctx.reply("What's your address?", {
  reply_markup: {
    force_reply: true,
    input_field_placeholder: "Type your address and send…",
  },
});
```

Placeholder rules:
- One short phrase, sentence case
- Match the input the bot expects ("Type your address", "Pick a date: 2026-06-19", "Search…")
- No emoji decoration — placeholder text is functional, not decorative

Full rules in [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §1.
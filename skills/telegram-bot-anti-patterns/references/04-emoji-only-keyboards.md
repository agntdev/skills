---
title: Emoji-only keyboards
impact: MEDIUM
impactDescription: decoration ≠ clarity, accessibility regressions
tags: anti-pattern, button-label, emoji, accessibility
---

## Don't: cover keyboards in emoji

Decorative emoji (❌✅🔙🚀🔥 everywhere) makes buttons noisy,
untranslatable, and inaccessible. Emoji are for **disambiguation**,
not decoration.

## Do: 0–1 emoji per button, never on cancel

- Use emoji when it carries semantic weight: 📅 = schedule, 💬 = chat, ⚙️ = settings.
- One emoji per button max. Two max on a primary CTA.
- **Cancel / destructive actions: plain text, no emoji.** Cancel is the boring escape hatch; decoration reads as "this is a feature, try it."
- Destructive confirmations get one strong emoji: 🗑 Delete / 🔥 Remove.

```ts
// ❌ Bad — emoji salad
inlineKeyboard([
  [{ text: "🚀✨📅 Book Now! 🎉", callback_data: "menu:book" }],
  [{ text: "❌ ❌ Cancel ❌", callback_data: "menu:cancel" }],
  [{ text: "🔥🔥 Help 🔥🔥",   callback_data: "menu:help"   }],
]);

// ✅ Good — one emoji per button, none on cancel
inlineKeyboard([
  [{ text: "📅 Book now",      callback_data: "menu:book"   }],
  [{ text: "Cancel",            callback_data: "menu:cancel" }],  // no emoji
  [{ text: "❓ How it works",    callback_data: "menu:help"   }],
]);
```

Full rules in [telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §1.
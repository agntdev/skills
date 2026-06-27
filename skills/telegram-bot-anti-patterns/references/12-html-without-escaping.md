---
title: HTML without escaping < > &
impact: CRITICAL
impactDescription: "Can't parse entities" 400 error on user input
tags: anti-pattern, parse_mode, html, escaping, security
---

## Don't: send user input as HTML without escaping

Any `<`, `>`, or `&` in user-supplied text (a name, a search query,
a comment) becomes a malformed HTML tag. Telegram returns
`400: Can't parse entities` and the message is dropped — the user
sees nothing.

## Do: always `escapeHtml()` user input

```ts
// ❌ Bad — direct interpolation, breaks on user input with <>
await ctx.reply(`Hello, ${ctx.from?.first_name ?? "friend"}!`, {
  parse_mode: "HTML",
});
// User named "<script>alert(1)</script>" → 400 error

// ✅ Good — escape first
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")   // & first, otherwise &lt; becomes &amp;lt;
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

await ctx.reply(`Hello, ${escapeHtml(ctx.from?.first_name ?? "friend")}!`, {
  parse_mode: "HTML",
});
```

The order matters: `&` first, otherwise `&lt;` becomes `&amp;lt;`
(double-escaped, displays literally).

Full parse_mode rules in
[telegram-bot-api-fundamentals](../../telegram-bot-api-fundamentals/SKILL.md) §5.
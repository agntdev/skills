---
name: telegram-inline-buttons
description: >
  Use when building Telegram bots that need inline keyboards.
  Covers InlineKeyboardMarkup, button types (url, callback_data, web_app, login_url,
  switch_inline_query), callback query handling, pagination, and common patterns.
  Triggers: inline buttons, inline keyboard, telegram bot buttons, callback buttons,
  telegram bot menu, reply markup, keyboard markup.
compatibility: Works with any Telegram Bot API library (grammY, Telegraf, python-telegram-bot, aiogram, etc.). Requires a bot token from @BotFather.
license: MIT
---

# telegram-inline-buttons Skill

Inline keyboards are the primary way Telegram bots present interactive choices. This skill covers patterns for building them correctly across common libraries.

## When to use inline keyboards vs reply keyboards

| Use case | Keyboard type |
|---|---|
| Message-specific actions (vote, details, buy) | Inline keyboard |
| Persistent menu / replace native keyboard | Reply keyboard |
| One-off action under a message | Inline keyboard |
| Bot command alternatives | Reply keyboard |

**This skill covers inline keyboards only.**

---

## Button types

| Type | Parameter | When to use |
|---|---|---|
| URL | `url` | Open external link |
| Callback | `callback_data` | Handle action server-side without new message |
| Web App | `web_app` | Open Telegram Mini App |
| Login | `login_url` | Telegram Login Widget |
| Switch inline query | `switch_inline_query` | Start inline query in current chat |
| Switch inline query (chosen) | `switch_inline_query_current_chat` | Start inline query, same chat only |
| Pay | `pay` | Telegram Payments |
| Copy text | `copy_text` | Copy text to clipboard |

---

## Basic layout rules

- Max **8 buttons per row**
- Max **100 buttons total** per keyboard
- `callback_data` max **64 bytes** (1-64 bytes on newer API versions)
- Buttons without `url`, `callback_data`, or other action fields render as non-interactive

---

## Examples

### Simple URL button (Node.js / grammY)

```ts
await ctx.reply("Check out our platform:", {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Open agnt-gm.ai", url: "https://agnt-gm.ai" }]
    ]
  }
});
```

### Multi-row with callbacks (Node.js / grammY)

```ts
const keyboard = {
  inline_keyboard: [
    [{ text: "👍 Like", callback_data: "vote:up" }, { text: "👎 Dislike", callback_data: "vote:down" }],
    [{ text: "📊 Details", callback_data: "details" }],
    [{ text: "🌐 Website", url: "https://example.com" }]
  ]
};

await ctx.reply("What do you think?", { reply_markup: keyboard });
```

### Web App button (Telegram Mini App)

```ts
const keyboard = {
  inline_keyboard: [
    [{
      text: "🚀 Open App",
      web_app: { url: "https://your-mini-app.vercel.app" }
    }]
  ]
};
```

---

## Callback query handling

### Pattern 1: Simple string match

```ts
bot.callbackQuery("details", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Here are the details...");
});
```

### Pattern 2: Namespaced data with prefix (preferred)

```ts
// Button data: "vote:up", "page:3", "item:42"
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("vote:")) {
    const direction = data.split(":")[1];
    // handle vote
  } else if (data.startsWith("page:")) {
    const page = parseInt(data.split(":")[1]);
    // render page
  }
});
```

### Pattern 3: JSON in callback_data (for complex state)

```ts
const data = JSON.stringify({ action: "select", id: 42, mode: "quick" });
// Button: callback_data: data (keep under 64 bytes)
```

**Always call `answerCallbackQuery()`** — otherwise Telegram shows loading spinner indefinitely:

```ts
await ctx.answerCallbackQuery();           // silent
await ctx.answerCallbackQuery({ text: "Done!" });  // toast notification
await ctx.answerCallbackQuery({ text: "Error", show_alert: true }); // alert dialog
```

---

## Pagination pattern

```ts
function buildPageKeyboard(currentPage: number, totalPages: number) {
  const rows = [];

  // Items for this page
  const items = getItemsForPage(currentPage);
  for (const item of items) {
    rows.push([{ text: item.name, callback_data: `item:${item.id}` }]);
  }

  // Navigation row
  const navRow = [];
  if (currentPage > 1) {
    navRow.push({ text: "⬅️ Prev", callback_data: `page:${currentPage - 1}` });
  }
  navRow.push({ text: `${currentPage}/${totalPages}`, callback_data: "noop" });
  if (currentPage < totalPages) {
    navRow.push({ text: "➡️ Next", callback_data: `page:${currentPage + 1}` });
  }
  rows.push(navRow);

  return { inline_keyboard: rows };
}

// In callback handler:
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("page:")) {
    const page = parseInt(data.split(":")[1]);
    await ctx.editMessageReplyMarkup({ reply_markup: buildPageKeyboard(page, 10) });
    await ctx.answerCallbackQuery();
  }
});
```

---

## Edit vs new message

| Goal | Method |
|---|---|
| Change keyboard only | `editMessageReplyMarkup` |
| Change text + keyboard | `editMessageText` |
| Change media + keyboard | `editMessageMedia` / `editMessageCaption` |
| Keep original, send new | `reply` or `sendMessage` |

---

## Common mistakes

1. **Missing `answerCallbackQuery`** — bot seems stuck, spinner never stops
2. **`callback_data` too long** — Telegram rejects silently. Keep it under 64 bytes
3. **`editMessageText` on unchanged text** — throws 400 error. Check if text actually changed
4. **Nesting `inline_keyboard` inside `keyboard`** — inline keyboards use `inline_keyboard`, not `keyboard`
5. **Using inline keyboard for persistent menus** — that's what `ReplyKeyboardMarkup` is for

---

## Quick reference

```ts
// Import (grammY)
import { InlineKeyboard } from "grammy";

// Builder pattern (grammY)
const keyboard = new InlineKeyboard()
  .url("Website", "https://example.com")
  .row()
  .text("Option A", "opt:a")
  .text("Option B", "opt:b")
  .row()
  .webApp("Open Mini App", "https://mini.app");

// Low-level format (all libraries)
const markup = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Button", callback_data: "action" }]
    ]
  }
};
```

## Reference

- [references/REFERENCE.md](./references/REFERENCE.md) — API limits, field specs, library links

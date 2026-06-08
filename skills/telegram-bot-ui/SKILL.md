---
name: telegram-bot-ui
description: >
  Use when building bot UIs — keyboards, buttons, menus, pagination, dialogs.
  Covers InlineKeyboardMarkup (Bot API), ReplyKeyboardMarkup, callback_data patterns,
  grammY reply_markup usage, and @agntdev/bot-toolkit UI builders.
  Triggers: inline buttons, keyboard, telegram menu, bot UI, callback buttons, pagination.
compatibility: Works with grammY alone, or @agntdev/bot-toolkit builders.
license: MIT
---

# telegram-bot-ui Skill

How to build bot UIs — from raw Bot API keyboard JSON to grammY to toolkit builders.

---

## 1. How Telegram Keyboards Work (Bot API)

Telegram has **two keyboard types** — different use cases, different JSON shapes.

### InlineKeyboardMarkup

Buttons attached to a **specific message**. Tapping sends a `callback_query` back to your bot (no message to chat). Good for menus, confirmations, pagination.

```json
// Attached to sendMessage reply_markup field
{
  "inline_keyboard": [
    [
      { "text": "Yes", "callback_data": "confirm:42:yes" },
      { "text": "No",  "callback_data": "confirm:42:no" }
    ],
    [
      { "text": "Open Site", "url": "https://example.com" }
    ]
  ]
}
```

Tap "Yes" → bot receives `callback_query` with `data: "confirm:42:yes"`.

### ReplyKeyboardMarkup

**Persistent** buttons that replace the user's keyboard. Tapping sends a regular text message. Good for persistent menus, quick replies.

```json
{
  "keyboard": [
    [{ "text": "📅 Book" }, { "text": "📋 My bookings" }],
    [{ "text": "❌ Cancel" }]
  ],
  "resize_keyboard": true
}
```

Tap "📅 Book" → bot receives a message with `text: "📅 Book"`.

### Rule of thumb

| Keyboard | Use for |
|---|---|
| Inline | Menus on messages, confirmations, pagination, "Edit this message" flows |
| Reply | Persistent quick-access buttons, "Send a message" flows |

**Never mix them.** `inline_keyboard` array is NOT `keyboard` array.

### Edit vs send

```http
# Edit existing message (for inline keyboards — user doesn't see new messages)
POST /bot<TOKEN>/editMessageText   { chat_id, message_id, text, reply_markup }

# Edit only the keyboard (keep text)
POST /bot<TOKEN>/editMessageReplyMarkup  { chat_id, message_id, reply_markup }

# Send new message (for reply keyboard flows)
POST /bot<TOKEN>/sendMessage  { chat_id, text, reply_markup }
```

---

## 2. grammY — Using Keyboards

### Attaching inline keyboard

```ts
// Inline keyboard — buttons on a message
await ctx.reply("Choose:", {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Option A", callback_data: "pick:a" }],
      [{ text: "Option B", callback_data: "pick:b" }],
    ]
  }
});
```

### Attaching reply keyboard

```ts
// Reply keyboard — persistent buttons replacing user keyboard
await ctx.reply("Main menu:", {
  reply_markup: {
    keyboard: [
      [{ text: "📅 Book" }, { text: "📋 My bookings" }],
    ],
    resize_keyboard: true,
  }
});
```

### Handling callback data

```ts
// Exact match
bot.callbackQuery("pick:a", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("You picked A");
});

// Prefix routing (scalable pattern)
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("pick:")) {
    const choice = data.split(":")[1];
    await ctx.editMessageText(`Picked ${choice}`);
  }

  await ctx.answerCallbackQuery();
});
```

### Edit vs new message in grammY

```ts
// Edit existing message (smooth UX — no message spam)
await ctx.editMessageText("Updated text", { reply_markup: newKeyboard });

// Edit just the keyboard, keep text
await ctx.editMessageReplyMarkup({ reply_markup: newKeyboard });

// Send a new message (keeps history visible)
await ctx.reply("New message");

// Do nothing but stop spinner
await ctx.answerCallbackQuery();
```

### Callback data pattern

Namespaced prefix keeps routing simple:

```
menu:<action>            — main menu actions
select:<id>              — item selection
confirm:<action>:<id>    — confirmation flow
page:<n>                 — page jump
pg:prev:<n> / pg:next:<n> — paginate helper
```

---

## 3. @agntdev/bot-toolkit — UI Builders

The toolkit provides **pure builders** that return plain `InlineKeyboardMarkup` objects. No grammY import needed — they produce the exact JSON shapes grammY expects.

```ts
import { inlineButton, urlButton, inlineKeyboard, menuKeyboard, confirmKeyboard, paginate } from "@agntdev/bot-toolkit";
```

### inlineButton(text, callbackData)

```ts
inlineButton("Yes", "confirm:42")
// → { text: "Yes", callback_data: "confirm:42" }
// Type: { text: string; callback_data: string }
```

### urlButton(text, url)

```ts
urlButton("Docs", "https://agnt-gm.ai")
// → { text: "Docs", url: "https://agnt-gm.ai" }
// Type: { text: string; url: string }
```

### inlineKeyboard(rows)

Wrap rows of buttons into valid `InlineKeyboardMarkup`:

```ts
const kb = inlineKeyboard([
  [inlineButton("A", "a"), inlineButton("B", "b")],
  [urlButton("Docs", "https://x.io")],
]);

await ctx.reply("Choose:", { reply_markup: kb });
```

### menuKeyboard(items, columns?)

Grid layout from a flat list. Default 1 column.

```ts
const items = [
  { text: "📅 Book", data: "menu:book" },
  { text: "📋 My bookings", data: "menu:my" },
  { text: "❌ Cancel", data: "menu:cancel" },
  { text: "ℹ️ Help", data: "menu:help" },
];

menuKeyboard(items);     // vertical list, 1 per row
menuKeyboard(items, 2);  // 2-column grid
```

### confirmKeyboard(actionPrefix, opts?)

Yes/No row. Callbacks: `<prefix>:yes` / `<prefix>:no`.

```ts
confirmKeyboard("delete:42");
// → [✅ Yes ("delete:42:yes")] [❌ No ("delete:42:no")]

confirmKeyboard("publish", { yes: "🚀 Publish", no: "🔙 Back" });
```

Handler:

```ts
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("delete:")) {
    const [, id, action] = data.split(":");
    await ctx.editMessageText(action === "yes" ? `Deleted ${id}` : "Cancelled");
  }
  await ctx.answerCallbackQuery();
});
```

### paginate(items, options)

Slice items into pages with prev/next controls.

```ts
const result = paginate(allItems, {
  page: 0,               // 0-based, auto-clamped
  perPage: 5,
  callbackPrefix: "pg",   // default: "page"
  prevLabel: "« Prev",
  nextLabel: "Next »",
});

// result.pageItems  — items for current page
// result.totalPages — how many pages
// result.page       — actual page number (may be clamped)
// result.controls   — InlineKeyboardMarkup with prev/next buttons
```

Single page → empty controls. First page → only Next. Last page → only Prev. Middle → both.

**Full pagination handler:**

```ts
async function showPage(ctx: BotContext, page: number) {
  const items = await loadItems();
  const { pageItems, controls } = paginate(items, { page, perPage: 5 });

  const rows = pageItems.map(item => [
    inlineButton(item.name, `select:${item.id}`),
  ]);

  const keyboard = inlineKeyboard([...rows, ...controls.inline_keyboard]);
  await ctx.editMessageText("Choose an item:", { reply_markup: keyboard });
}

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("pg:next:")) await showPage(ctx, parseInt(data.split(":")[2]));
  if (data.startsWith("pg:prev:")) await showPage(ctx, parseInt(data.split(":")[2]));
  await ctx.answerCallbackQuery();
});
```

**Callback format:** `<prefix>:prev:<n>` / `<prefix>:next:<n>` where `n` = target page index.

---

## 4. Toolkit vs Pure grammY

| Task | Pure grammY | Toolkit |
|---|---|---|
| Inline button | `{ text: "Hi", callback_data: "x" }` | `inlineButton("Hi", "x")` |
| URL button | `{ text: "Link", url: "..." }` | `urlButton("Link", "...")` |
| Grid menu | Manual row chunking | `menuKeyboard(items, cols)` |
| Confirm row | Manual 2-button row | `confirmKeyboard("prefix")` |
| Paginate | Manual slice + prev/next logic | `paginate(items, opts)` |

Toolkit builders produce the **same JSON shapes** grammY expects. They're convenience, not lock-in. Use them when you want less boilerplate. Skip them when you need full control.

---

## Common mistakes

1. **`inline_keyboard` in `keyboard` field** — different objects. Inline keyboards go under `reply_markup.inline_keyboard`. Reply keyboards under `reply_markup.keyboard`.
2. **`paginate()` without handler** — buttons generate `pg:prev:X` / `pg:next:X` data. Must route them in callback handler.
3. **Not catching unknown callbacks** — always have fallback `answerCallbackQuery` for stray callback data.
4. **Using `editMessageText` on a new message** — you need `message_id` from a previous reply. `ctx.reply()` for first message, `ctx.editMessageText()` for updates.

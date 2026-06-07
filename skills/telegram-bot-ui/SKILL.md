---
name: telegram-bot-ui
description: >
  Use when building bot UIs with @memedev/bot-toolkit.
  Covers inlineButton, urlButton, menuKeyboard, confirmKeyboard,
  paginate, and callback routing patterns.
  Replaces telegram-inline-buttons.
  Triggers: inline buttons, keyboard, telegram menu, bot UI, callback buttons, pagination.
compatibility: Requires @memedev/bot-toolkit.
license: MIT
---

# telegram-bot-ui Skill

How to build bot UIs using `@memedev/bot-toolkit` UI kit. All builders return plain `InlineKeyboardMarkup` objects — no grammY import needed, fully testable.

## Import

```ts
import { inlineButton, urlButton, inlineKeyboard, menuKeyboard, confirmKeyboard, paginate } from "@memedev/bot-toolkit";
```

---

## Button builders

### inlineButton(text, callbackData)

Callback button — sends `callback_data` back to the bot on tap:

```ts
inlineButton("Yes", "confirm:42")
// → { text: "Yes", callback_data: "confirm:42" }
```

### urlButton(text, url)

Opens a URL on tap:

```ts
urlButton("Docs", "https://agnt-gm.ai")
// → { text: "Docs", url: "https://agnt-gm.ai" }
```

### Type system

```ts
type InlineButton = CallbackButton | UrlButton;
// CallbackButton = { text: string; callback_data: string }
// UrlButton      = { text: string; url: string }
```

---

## Layout builders

### inlineKeyboard(rows)

Wrap rows of buttons into a valid `InlineKeyboardMarkup`:

```ts
const kb = inlineKeyboard([
  [inlineButton("A", "a"), inlineButton("B", "b")],
  [urlButton("Docs", "https://x.io")],
]);

// Result: { inline_keyboard: [[{text:"A",callback_data:"a"},{text:"B",callback_data:"b"}],[{text:"Docs",url:"https://x.io"}]] }

await ctx.reply("Choose:", { reply_markup: kb });
```

---

## menuKeyboard(items, columns?)

Lay out a list of items in a grid. Default: 1 column (vertical list).

```ts
const items = [
  { text: "📅 Book", data: "menu:book" },
  { text: "📋 My bookings", data: "menu:my" },
  { text: "❌ Cancel", data: "menu:cancel" },
  { text: "ℹ️ Help", data: "menu:help" },
];

// One button per row (default):
const kb1 = menuKeyboard(items);

// Two columns:
const kb2 = menuKeyboard(items, 2);
// Row 0: Book | My bookings
// Row 1: Cancel | Help
```

---

## confirmKeyboard(actionPrefix, opts?)

Yes/No confirmation row. Callbacks are `<actionPrefix>:yes` / `<actionPrefix>:no`.

```ts
const kb = confirmKeyboard("delete:42");
// → [✅ Yes ("delete:42:yes")] [❌ No ("delete:42:no")]

// Custom labels:
const kb2 = confirmKeyboard("publish", { yes: "🚀 Publish", no: "🔙 Back" });
// → [🚀 Publish ("publish:yes")] [🔙 Back ("publish:no")]
```

**Handler pattern:**

```ts
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("delete:")) {
    const [, id, action] = data.split(":");
    if (action === "yes") {
      await ctx.editMessageText(`Deleted ${id}`);
    } else {
      await ctx.editMessageText("Cancelled.");
    }
  }
  await ctx.answerCallbackQuery();
});
```

---

## paginate(items, options)

Slice items into pages with prev/next controls.

```ts
const result = paginate(allItems, {
  page: 0,               // 0-based, clamped to valid range
  perPage: 5,            // items per page
  callbackPrefix: "pg",  // optional, default "page"
  prevLabel: "« Prev",   // optional
  nextLabel: "Next »",   // optional
});

// result.pageItems  — items for this page
// result.totalPages — total page count
// result.page       — actual page shown (may be clamped)
// result.controls   — InlineKeyboardMarkup with prev/next
```

**Callback format:** `<prefix>:prev:<n>` / `<prefix>:next:<n>` where `n` is the target page index.

```ts
// Single page → empty controls (no prev/next row needed)
// First page → only "Next" button
// Last page  → only "Prev" button
// Middle     → both buttons
```

**Full pagination example:**

```ts
async function showPage(ctx: BotContext, page: number) {
  const items = await loadItems();
  const { pageItems, controls } = paginate(items, { page, perPage: 5 });

  const rows = pageItems.map((item) => [
    inlineButton(item.name, `select:${item.id}`),
  ]);

  const keyboard = inlineKeyboard([...rows, ...controls.inline_keyboard]);

  await ctx.editMessageText("Choose an item:", { reply_markup: keyboard });
}

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("pg:next:")) {
    const page = parseInt(data.split(":")[2]);
    await showPage(ctx, page);
  } else if (data.startsWith("pg:prev:")) {
    const page = parseInt(data.split(":")[2]);
    await showPage(ctx, page);
  }
  await ctx.answerCallbackQuery();
});
```

---

## Callback data conventions

Use a namespaced prefix pattern to keep routing simple:

```
menu:<action>          — main menu actions
select:<id>            — item selection
confirm:<action>:<id>  — confirmation flow
page:<n>               — page jump (if not using paginate helper)
pg:prev:<n> / pg:next:<n> — paginate helper format
```

---

## Edit vs new message

| Method | When |
|---|---|
| `editMessageText` | Change text + keyboard on a callback |
| `editMessageReplyMarkup` | Change keyboard only, keep text |
| `reply` / `sendMessage` | Send a new message (keep history) |
| Do nothing | Button is purely informational (but still call `answerCallbackQuery`) |

---

## Common mistakes

1. **Mixing `inline_keyboard` into `keyboard`** — inline keyboards go in `reply_markup.inline_keyboard`, reply keyboards go in `reply_markup.keyboard`. They are different objects.
2. **Using inline keyboard for persistent menus** — that's `ReplyKeyboardMarkup` territory.
3. **`paginate()` without handling the callbacks** — the buttons generate `pg:prev:X` / `pg:next:X` data. You must route them.
4. **Not catching unknown callbacks** — always have a fallback `answerCallbackQuery` for stray data.

---
name: telegram-bot-ui
description: >
  Use when building bot UIs — keyboards, buttons, menus, pagination, dialogs.
  Covers InlineKeyboardMarkup (Bot API), ReplyKeyboardMarkup, callback_data patterns,
  grammY reply_markup usage, and the inlined toolkit's UI builders (the toolkit
  lives at src/toolkit/ in the bot-starter template).
  Triggers: inline buttons, keyboard, telegram menu, bot UI, callback buttons, pagination.
compatibility: Works with grammY alone, or the inlined toolkit builders.
license: MIT
---

# telegram-bot-ui Skill

How to build bot UIs — from raw Bot API keyboard JSON to grammY to toolkit builders.

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the discovery-and-claim
> loop. This skill teaches the inline-button, menu, paginate, and
> confirmKeyboard patterns you use in your claimed task's implementation.

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

### Buttons vs commands — the heuristic

| User needs to… | Use |
|---|---|
| Pick from a small fixed set (yes/no, choice A/B/C, page N) | Inline button |
| Open a menu, confirm an action, paginate | Inline button |
| Send free-form text (a contract address, a note, a search query) | `/command` + text input |
| Type a structured argument the bot parses (date, time, amount) | `/command` + text input |
| Persistent shortcut the user wants to tap repeatedly | Reply keyboard (use sparingly) |

The old "default to inline buttons" rule is wrong. Buttons are right
for **choices**; commands are right for **free input**. A bot that
turns every input into a button is hostile to power users. A bot
that uses commands for menus is hostile to mobile users.

> **When in doubt, ask:** "Does the user know what to type?" If yes,
> use a command. If no (or if there are too many valid options to
> remember), use a button.

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

> **Regex first-match warning.** When you use `bot.callbackQuery(/^pick:/, ...)`
> or a `bot.on("callback_query:data")` handler with several `if
> (data.startsWith(...))` branches, the order matters: the first
> matching handler wins, and Telegram only delivers one callback
> per tap. Two common bugs:
>
> 1. **Catch-all first.** If you have a generic `data.startsWith(":")`
>    branch BEFORE a specific `data.startsWith("pick:")` branch, the
>    catch-all eats every callback and the specific branch never
>    runs. Put specific prefixes first.
> 2. **Short prefix swallows long prefix.** `data.startsWith("a")`
>    matches `"a:42"` AND `"apple:42"`. Use a delimiter: `"a:"` not
>    `"a"`. Or use full equality + a switch.
>
> Pattern that works: route by `data.split(":")[0] + ":"` (the
> namespaced prefix), not by the first character.

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

## 3. The toolkit (`src/toolkit/`) — UI Builders

The inlined toolkit (at `src/toolkit/` in the bot-starter template)
provides **pure builders** that return plain `InlineKeyboardMarkup`
objects. No grammY import needed — they produce the exact JSON
shapes grammY expects.

```ts
import {
  inlineButton, urlButton, inlineKeyboard, menuKeyboard, confirmKeyboard, paginate,
} from "../src/toolkit/ui/buttons.js";
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

## 4. Stateful flows with editMessage

For multi-step dialogs (book a slot, fill a form, confirm a destructive
action), the question is: do you **edit the existing message** or
**send a new one**? Most agents get this wrong by defaulting to
"send a new message per step", which spams the chat.

### Good: edit the same message

User sees ONE message that updates in place as they tap buttons.

```ts
bot.callbackQuery("slot:14:00", async (ctx) => {
  await ctx.editMessageText("Pick a service:", {
    reply_markup: serviceKeyboard(),
  });
});

bot.callbackQuery("service:cut", async (ctx) => {
  await ctx.editMessageText("Booked 14:00 cut. Confirm?", {
    reply_markup: confirmKeyboard("book"),
  });
});

bot.callbackQuery("book:yes", async (ctx) => {
  await ctx.editMessageText("✅ Booked 14:00 cut");
  // No ctx.reply() — the message IS the confirmation.
  await ctx.answerCallbackQuery({ text: "Booked!" });
});
```

Result: one message in the chat, evolving through the flow. No
scroll-back to see history. Works perfectly on mobile.

### Bad: send a new message per step

```ts
// ❌ Don't do this
bot.callbackQuery("slot:14:00", async (ctx) => {
  await ctx.reply("Pick a service:", { reply_markup: serviceKeyboard() });
});

bot.callbackQuery("service:cut", async (ctx) => {
  await ctx.reply("Booked 14:00 cut. Confirm?", { reply_markup: confirmKeyboard("book") });
});
```

Result: chat fills with 4-5 messages per flow. The user's first
message ("Pick a slot:") sits at the top, ignored. The latest
confirmation is at the bottom. On mobile, the chat is unusable.

### When to send a new message

- The first message in a flow (the user has no prior message to edit).
- A result that lives outside the flow ("I've sent you a PDF" —
  the PDF is a new message; the chat state is still the old flow).
- A persistent menu the user invokes via `/command` (not a callback).

The rule: **one message per dialog**, updated in place. New messages
are for new dialogs or for results the user keeps.

### When editMessageText fails

If the message is older than 48 hours or hasn't been edited before,
`editMessageText` can fail with `message is not modified` (no actual
change) or `message to edit not found`. Wrap edits in a try/catch
and fall back to a new `ctx.reply()` if needed — but log the fallback
so you can fix the flow.

## 5. Toolkit vs Pure grammY

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
5. **One message per dialog step** — see section 4. Default to editing in place; only send a new message for the first step or a result the user keeps.
6. **Buttons for free input** — see the "Buttons vs commands" heuristic in section 1. Don't force users through buttons when they'd type faster.

## Review checklist before claiming done

Before you write `agnt task claim` for the next task, run through this
checklist. If any item is "no", the bot isn't done — even if all
tests pass.

1. **One message per dialog.** Open the bot in Telegram, walk through
   every flow. Does each dialog update the same message in place, or
   does it spam the chat? (See section 4.)
2. **Spinners stop.** Tap every button. Does the loading spinner go
   away? (Missing `answerCallbackQuery` is the #1 callback bug — see
   `telegram-bot-basics`.)
3. **Buttons vs commands makes sense.** Does the user know what to
   type at each step? If yes, you have a command; if no, you have a
   button. (See the heuristic in section 1.)
4. **Edit-failure fallback works.** Pick a flow, send it through twice
   quickly. Does the second attempt fail loudly or silently spam new
   messages? (See the fallback note in section 4.)
5. **Regex routing doesn't swallow.** If you use prefix-based
   callback routing, the catch-all branch is last, not first.
   (See the warning in section 2.)

If any check fails, fix it and re-run. The LLM reviewer will catch
some of these, but the bot is "done" when it works in the user's
hands, not when the reviewer approves the diff.

---
name: telegram-bot-ui
description: >
  Wire Telegram keyboards — the mechanics. Covers inline buttons,
  callback routing, reply_markup, grammY attach syntax, the inlined
  toolkit's UI builders (inlineButton, urlButton, inlineKeyboard,
  menuKeyboard, confirmKeyboard, paginate), ForceReply markup, custom
  keyboards for typed input (RequestContact, RequestLocation,
  RequestUser, RequestChat, RequestManagedBot), copy_text buttons,
  web_app buttons. USE FOR: inline buttons, keyboard, telegram menu,
  bot UI, callback buttons, pagination, reply_markup, ForceReply,
  copy_text, web_app, callback_data, prefix routing, regex routing —
  even if the user doesn't say "inline" or "keyboard" explicitly. DO
  NOT USE FOR: microcopy / flow patterns / error UX / onboarding /
  anti-patterns (see telegram-bot-ux router), or the Bot API
  foundation (see telegram-bot-api-fundamentals).
  Triggers: inline buttons, keyboard, telegram menu, bot UI, callback buttons, pagination, reply_markup, ForceReply, copy_text, web_app, callback_data, prefix routing, regex routing.
compatibility: Works with grammY alone, or the inlined toolkit builders
  (at src/toolkit/ui/ in the bot-starter template).
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, grammY, keyboard, inline-button, callback]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-ux
---

# telegram-bot-ui Skill

How to wire Telegram keyboards — pure mechanics. For **what the bot
should say and how it should feel**, see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md).

> ## ⭐ BUTTON-FIRST — the default for reaching a feature
> The owners shipping these bots are **non-technical**, and so are their
> users. People operate the bot by **tapping buttons**, not by memorising
> slash commands. So a feature is made reachable by **adding a button to the
> `/start` main menu**, NOT by minting a new `bot.command(...)`.
>
> In the bot-starter template this is one line — call
> `registerMainMenuItem({ label, data })` at the top of your
> `src/handlers/<slug>.ts` and handle its `data` with `.callbackQuery(...)`;
> the shipped `/start` renders the aggregate menu. The only slash commands a
> bot should expose are `/start`, `/help`, and the occasional free-form typed
> input below. **Do NOT add a slash command per feature** — that is how bots
> end up with 20+ cryptic, overlapping commands no human can use.
>
> This does **not** mean "never use commands": see the
> [buttons-vs-commands heuristic](#buttons-vs-commands--the-heuristic) — commands
> and ForceReply are still the right tool for free-form typed input (a search
> query, note, address, date, time, amount). Buttons for **navigation and
> choices**; commands for **typing the bot can't predict**.

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the
> discovery-and-claim loop. This skill teaches the inline-button, menu,
> paginate, confirmKeyboard, ForceReply, and copy_text patterns you use
> in your claimed task's implementation.

---

## 1. How Telegram Keyboards Work (Bot API)

Telegram has **two keyboard types** + several markup variants for
special inputs. Different use cases, different JSON shapes.

### InlineKeyboardMarkup

Buttons attached to a **specific message**. Tapping sends a
`callback_query` back to your bot (no message to chat). Good for menus,
confirmations, pagination.

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

Limits (see [telegram-bot-api-fundamentals](../telegram-bot-api-fundamentals/SKILL.md) §4):

- `callback_data` ≤ **64 BYTES** (UTF-8). Cyrillic / emoji = multi-byte.
- ≤ 100 buttons per keyboard.
- ≤ 8 rows (iOS scrolls at ~5).
- Button text ≤ ~64 chars (truncated otherwise; keep ≤24 on mobile).

### ReplyKeyboardMarkup

**Persistent** buttons that replace the user's keyboard. Tapping sends
a regular text message. Good for persistent menus, quick replies.

```json
{
  "keyboard": [
    [{ "text": "📅 Book" }, { "text": "📋 My bookings" }],
    [{ "text": "❌ Cancel" }]
  ],
  "resize_keyboard": true,
  "one_time_keyboard": false,
  "input_field_placeholder": "Type or tap…",
  "selective": false
}
```

Useful params:

- `resize_keyboard` — make buttons small. **Ignored on Telegram Desktop
  5.3.2+** (it always uses 54px/button flat grid; 530px horizontal cap).
- `one_time_keyboard: true` — hide keyboard after first tap. Good for
  one-shot prompts.
- `input_field_placeholder` — text in the input field above the
  keyboard. Use it; users see this hint.
- `selective: true` — show this keyboard only to specific users in a
  group (rare).

### ForceReply

Asks the user to reply in the chat (with an inline "replying to" UI).
Use for **mandatory typed input** the bot can't capture with buttons.

```json
{
  "force_reply": true,
  "input_field_placeholder": "Send your booking address…",
  "selective": false
}
```

User sees a "Replying to your bot…" label above the input field. Bot
must explicitly handle the next text message (filter by session step —
see [telegram-bot-ux](../telegram-bot-ux/SKILL.md) §6 Linear wizard).

### Buttons vs commands — the heuristic

| User needs to… | Use |
|---|---|
| Pick from a small fixed set (yes/no, choice A/B/C, page N) | Inline button |
| Open a menu, confirm an action, paginate | Inline button |
| Send free-form text (a contract address, a note, a search query) | `/command` + text input |
| Type a structured argument the bot parses (date, time, amount) | `/command` + text input |
| Mandatory text reply (replying to the bot's question) | ForceReply |
| Persistent shortcut the user wants to tap repeatedly | Reply keyboard (use sparingly) |

The old "default to inline buttons" rule is wrong. Buttons are right
for **choices**; commands are right for **free input**. A bot that
turns every input into a button is hostile to power users. A bot that
uses commands for menus is hostile to mobile users.

> **When in doubt, ask:** "Does the user know what to type?" If yes,
> use a command. If no (or if there are too many valid options to
> remember), use a button.

For **what to write on the button** (verb-first, sentence case, emoji
budget), see [telegram-bot-ux](../telegram-bot-ux/SKILL.md) §1
Microcopy.

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

The grammY mechanics for attaching keyboards, handling callbacks,
and the edit-vs-new-message UX pattern live in
[references/grammY-keyboards.md](./references/grammY-keyboards.md).
Read that file when you need the exact `reply_markup` shapes for
inline / reply / ForceReply / request-contact / request-location /
request-user / request-chat / request-managed-bot, the callback-data
prefix routing rules, and the edit-in-place UX note from Telegram.

---

## 3. The toolkit (`src/toolkit/`) — UI Builders

The inlined toolkit (at `src/toolkit/` in the bot-starter template)
provides **pure builders** that return plain `InlineKeyboardMarkup`
objects. No grammY import needed — they produce the exact JSON
shapes grammY expects.

```ts
import {
  inlineButton, urlButton, copyTextButton, webAppButton,
  inlineKeyboard, menuKeyboard, confirmKeyboard, paginate,
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

### copyTextButton(text, copyText) — one-tap copy

```ts
copyTextButton("📋 Copy order ID", "ORD-12345")
// → { text: "📋 Copy order ID", copy_text: { text: "ORD-12345" } }
// Type: { text: string; copy_text: { text: string } }
```

Use this for IDs, addresses, codes, links — anything users would
otherwise long-press to copy. Saves 4 taps per interaction. See
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §10 anti-pattern "no
copy_text for IDs".

### webAppButton(text, url) — open Mini App

```ts
webAppButton("🛒 Open shop", "https://shop.example.com/twa")
// → { text: "🛒 Open shop", web_app: { url: "https://shop.example.com/twa" } }
// Type: { text: string; web_app: { url: string } }
```

Bot API 9.4+. Use when the flow has grown past what inline keyboards can
carry — see [telegram-bot-ux](../telegram-bot-ux/SKILL.md) §8 Mini App
graduation for the 4 explicit thresholds.

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
| Copy-text button | `{ text: "Copy", copy_text: { text: "..." } }` | `copyTextButton("Copy", "...")` |
| Web App button | `{ text: "Open", web_app: { url: "..." } }` | `webAppButton("Open", "...")` |
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
5. **64-byte `callback_data` with non-ASCII** — Telegram rejects with `BUTTON_DATA_INVALID`. It's BYTES, not chars. See `telegram-bot-api-fundamentals` §4.
6. **ForceReply without a step filter** — every text message in the chat will trigger your "awaiting X" handler. Gate by `ctx.session.step`. See `telegram-bot-ux` §6.
7. **Reply keyboard + `resize_keyboard: true` then relying on it on Desktop** — Telegram Desktop 5.3.2+ ignores `resize_keyboard`. Design for 4 columns max.
8. **Missing `input_field_placeholder`** — users see an empty input field and don't know what to type. Always set it.
9. **`one_time_keyboard: false` (default) on one-shot prompts** — keyboard stays around after the user taps. Set `one_time_keyboard: true` for "tap once, I'm done" flows.
10. **Sharing a custom keyboard for `RequestContact` after the user already shared** — old keyboard still visible. Send a new message with `remove_keyboard: true` or update the keyboard.

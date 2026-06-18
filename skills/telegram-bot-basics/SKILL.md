---
name: telegram-bot-basics
description: >
  Use when building a Telegram bot. Covers how Telegram Bot API works (HTTP),
  how grammY wraps it, and how the inlined toolkit (at src/toolkit/ in the
  bot-starter template) adds harness compatibility. Also covers Bot API
  limits (callback_data 64 bytes, message 4096 chars), parse_mode rules
  (HTML default, MarkdownV2 18-char escape), message entities (bold/italic/
  underline/spoiler/blockquote/code/pre/link, plus Rich Messages from
  Bot API 10.1), Checklists (Bot API 9.1), chat types matrix (private/
  group/supergroup/channel with privacy mode and topics), inline button
  types, media types with size limits, and the webhook contract.
  Triggers: build telegram bot, create telegram bot, grammY bot, bot entry
  point, telegram limits, parse_mode, HTML, MarkdownV2, rich messages,
  checklist, chat type, webhook.
compatibility: Works with grammY alone, or the inlined toolkit for testable bots.
  Targets Bot API 10.1 (June 11 2026) and 9.1 (Checklists).
license: MIT
---

# telegram-bot-basics Skill

How to build a Telegram bot — from raw Bot API to grammY to the agntdev toolkit.

> **Built for the agntdev pipeline.** Use the [agnt-cli-builder](../agnt-cli-builder/SKILL.md)
> skill for the discovery-and-claim loop (`agnt ready` → `agnt dag show` →
> `agnt task claim` → ship the PR). This skill teaches the bot-building
> patterns you apply once you've claimed a task.

For **how the bot feels to humans** (microcopy, flow patterns, error UX,
onboarding, anti-patterns), see [telegram-bot-ux](../telegram-bot-ux/SKILL.md).
For **how you wire keyboards** (button objects, routing, builders), see
[telegram-bot-ui](../telegram-bot-ui/SKILL.md).

---

## 1. How Telegram Bot API Works

Telegram bots are **HTTP clients** that talk to `https://api.telegram.org/bot<TOKEN>/<METHOD>`.

### Polling vs Webhook

| Mode | How | When |
|---|---|---|
| **Long polling** | Bot calls `getUpdates` in a loop. Telegram holds the connection open until new messages arrive (or timeout). | Dev, simple bots, no public URL |
| **Webhook** | You give Telegram a URL. Telegram POSTs JSON `Update` objects to your server in real time. | Production, needs HTTPS |

```http
# Long poll — bot asks "any messages for me?"
GET https://api.telegram.org/bot123:ABC/getUpdates?timeout=30&offset=0

# Response: array of Update objects
{
  "ok": true,
  "result": [
    {
      "update_id": 100,
      "message": {
        "message_id": 1,
        "chat": { "id": 42, "type": "private" },
        "from": { "id": 99, "first_name": "User" },
        "text": "/start",
        "entities": [{ "type": "bot_command", "offset": 0, "length": 6 }]
      }
    }
  ]
}
```

### Update → Action → API call

```
User sends /start to @MyBot
  → Telegram adds Update to queue
  → Bot fetches Update (poll) or receives POST (webhook)
  → Bot parses message.text, sees /start command
  → Bot calls sendMessage API to reply
```

Every bot action is an HTTP call: `sendMessage`, `editMessageText`, `answerCallbackQuery`, `sendPhoto`, etc.

### Token Security

Bot token = full control. Never commit to git. Never bake into source. Inject via env var `process.env.BOT_TOKEN`.

---

## 2. grammY — the Framework

grammY wraps the raw HTTP API into an idiomatic TypeScript bot framework.

### Bot instance

```ts
import { Bot } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", async (ctx) => {
  await ctx.reply("Hello!");
});

bot.start();  // starts long polling (dev)
// bot.start({ onStart: ... }) with webhook config for production
```

### Context object (`ctx`)

Every handler receives `ctx` — the full Update + convenience methods:

```ts
ctx.message       // the incoming Message object
ctx.from          // User who sent it
ctx.chat          // Chat where it came from
ctx.reply(text)   // shortcut for sendMessage to the same chat
ctx.api.sendMessage(chatId, text)  // raw API access
```

### Command routing

```ts
bot.command("start", async (ctx) => ctx.reply("Hi!"));
bot.command("help",  async (ctx) => ctx.reply("Help text"));

// Commands are case-sensitive: /Book ≠ /book
// @botusername suffix auto-handled: /start@MyBot → /start
```

grammY checks `message.entities` for `bot_command` type — that's how it knows `/start` is a command vs plain text.

### Callback query handling

```ts
// Exact match on callback_data
bot.callbackQuery("menu:next", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Page 2");
});

// Prefix-based routing for namespaced data
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("page:")) {
    // handle pagination
  }
  await ctx.answerCallbackQuery();
});
```

**Always call `answerCallbackQuery()`** — Telegram shows loading spinner until you do:

```ts
await ctx.answerCallbackQuery();                           // silent
await ctx.answerCallbackQuery({ text: "Done!" });          // toast popup
await ctx.answerCallbackQuery({ text: "Err", show_alert: true }); // alert dialog
```

> Platform metric: bots that don't answer ALL callback queries get
> demoted. "Too few answers to callback queries" is a real ranking
> signal. Treat `answerCallbackQuery` like a `return` statement —
> never conditional, never optional. See
> [telegram-bot-ux](../telegram-bot-ux/SKILL.md) §10 anti-patterns.

### Middleware

grammY runs handlers through a middleware pipeline. `bot.use()` adds middleware:

```ts
// Log every message
bot.use(async (ctx, next) => {
  console.log("got:", ctx.message?.text);
  await next();  // pass to next handler
});

// Guard admin-only commands
bot.use(async (ctx, next) => {
  if (ctx.from?.id !== ADMIN_ID) {
    await ctx.reply("Not authorized");
    return;  // stop chain
  }
  await next();
});
```

### Error boundary

```ts
bot.catch((err) => {
  console.error("bot error:", err);
});
```

Without `.catch()`, unhandled errors crash the polling loop. For **what
to show the user vs log** when things go wrong, see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §2 Error UX.

---

## 3. The toolkit (`src/toolkit/`) — what's already in your repo

The bot-starter template ships with the toolkit **inlined** at `src/toolkit/`.
No `npm install` of a package, no `.npmrc`, no registry auth. The source
is right there in your repo; you import from it with a relative path.

### createBot() vs new Bot()

```ts
// Pure grammY:
const bot = new Bot(token);
bot.use(session({ initial: () => ({}) }));
bot.catch(console.error);

// Inlined toolkit (same thing, one call):
import { createBot, type BotContext } from "../src/toolkit/index.js";

interface Session {
  step: string;
}

const bot = createBot<Session>(token, {
  initial: () => ({ step: "idle" }),
  // storage: ...      // omit = MemorySessionStorage (dev)
  // onError: (err) => { ... }  // omit = console.error
});
```

What `createBot` wires automatically:
- grammY `Bot` instance
- Session middleware (`session()` plugin) with your typed `initial()` + `storage`
- Error boundary (`bot.catch()`)

**Result:** same grammY `bot` object you know — all `bot.command()`, `bot.on()`, `ctx.reply()` work identically. Only difference: sessions wired, errors caught, harness-ready.

### BotContext type

```ts
import type { BotContext } from "../src/toolkit/index.js";

// BotContext<S> = grammY Context & SessionFlavor<S>
bot.command("count", async (ctx: BotContext<Session>) => {
  ctx.session.count = (ctx.session.count ?? 0) + 1;  // typed access
  await ctx.reply(`Count: ${ctx.session.count}`);
});
```

### makeBot() factory pattern

**Why a factory?** The test harness needs a FRESH bot per spec run. A singleton bot (`const bot = createBot(...)` at module level) leaks state between tests.

```ts
// src/index.ts
import { createBot } from "../src/toolkit/index.js";

export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, {
    initial: () => ({ step: "idle" }),
  });

  bot.command("start", startHandler);
  bot.callbackQuery("menu:next", nextHandler);

  return bot;
}

// Standalone run (not under harness):
if (require.main === module) {
  makeBot().start();
}
```

**Rule:** `makeBot()` must return a NEW bot every call. Do NOT cache it.

> **Entry point.** The build script should emit `dist/index.js`
> (canonical). The platform's Dockerfile accepts `dist/main.js` and bare
> `index.js` as legacy fallbacks, but new bots should target
> `dist/index.js`. See [`telegram-bot-deploy`](../telegram-bot-deploy/SKILL.md#3-the-build-contract).

### Project structure (v0.14.3)

Every new bot is created from the **`agntdev/bot-starter`** template repo
(agnt-api PR #1260c06 + #168). The platform's provisioner seeds the new
bot repo from this template on project creation, so you start with a
bootable, **self-contained** skeleton — T01's task is **extend the
skeleton**, not "create from scratch".

```
my-bot/                         # created from agntdev/bot-starter
├── src/
│   ├── bot.ts                  # buildBot() factory — used by src/index.ts
│   ├── index.ts                # runtime entry: makeBot().start() (long polling)
│   ├── harness-entry.ts        # makeBot() for the tests gate (the harness imports this)
│   └── toolkit/                # INLINED toolkit — no npm install, no auth
│       ├── index.ts
│       ├── storage/
│       ├── ui/
│       └── harness/            # the test harness CLI source
├── tests/
│   ├── specs/                  # per-feature BotSpec JSON files (v0.14.0+)
│   │   └── start.json
│   └── commands.json           # declared commands for the coverage gate
├── AGENTS.md                   # anti-stub contract (PR #161)
├── package.json                # grammy + ioredis (no @agntdev/* deps)
├── Dockerfile                  # ignored by the platform; commit a stub if you want
└── tsconfig.json
```

> **When this skill is stale.** The bot-starter template is the
> canonical source of truth for the toolkit layout. If `src/toolkit/`
> in your bot doesn't match the description above, check
> [`agntdev/bot-starter`](https://github.com/agntdev/bot-starter) for
> the current shape. The skill updates after the template, with a
> delay.

If you're working with a **pre-v0.14.3 bot repo**, the brief
v0.14.2-era layout was:

```
my-bot/                         # legacy (v0.14.2 — GH-Packages era, reversed same day)
├── src/                        # same layout as above, but NO src/toolkit/
│   ├── bot.ts
│   ├── index.ts
│   └── harness-entry.ts
├── tests/
│   ├── specs/
│   └── commands.json
├── .npmrc                      # was: @agntdev:registry=https://npm.pkg.github.com (REMOVED in v0.14.3)
├── package.json                # was: "@agntdev/bot-toolkit": "^0.1.0" (REMOVED)
├── AGENTS.md
├── Dockerfile
└── tsconfig.json
```

That era was brief (one day) and is fully reversed. If you see a bot
with a `.npmrc` referencing `@agntdev` or a `package.json` depending
on `@agntdev/bot-toolkit`, it's a v0.14.2 artifact — delete them and
the bot-starter template's `src/toolkit/` is already in the bot.

---

## 4. Telegram Bot API limits (you will hit these)

Bot API enforces hard limits. Hitting one returns a 400 error — usually
after the message has already been "sent" client-side, so the user sees
nothing.

| Field | Limit | Gotcha |
|---|---|---|
| `callback_data` | **1–64 BYTES** (UTF-8) | Not chars. Cyrillic ≈ 2 bytes/char → ~30 chars max. Emoji ≈ 4 bytes → ~15. **HARD** — Telegram returns `BUTTON_DATA_INVALID`. |
| `text` (sendMessage) | 1–4096 chars | Truncate before send; HTML helper `HtmlText.Truncate()` exists for this. |
| `caption` (media) | 0–1024 chars | Same — measure plain text, not HTML. |
| Button text (inline) | ~64 chars (client-dependent) | Keep ≤24 to be safe on mobile. |
| Inline buttons per keyboard | max **100** | Across all rows. |
| Inline keyboard rows | max **8** | iOS scrolls at ~5. |
| Reply keyboard buttons | more flexible | `resize_keyboard` ignored on Telegram Desktop 5.3.2+ (flat 54px/button). |
| Inline query results | max **50** | Per call to `answerInlineQuery`. |
| Inline query `next_offset` | 64 bytes | Same gotcha as `callback_data`. |
| Inline query `switch_pm_parameter` | 64 chars | Chars here, not bytes (URL-safe). |
| User ID | up to **52 bits** | `Number` in JS is safe (double). 32-bit `int` overflows by end of 2026 per Telegram warning. |
| `message_text` quote | ≤1024 chars after entity parsing | For `quote` / `quote_parse_mode` params on reply. |
| Webhook file download (official API) | 20 MB | Local API server: unlimited. |
| Webhook file upload (official API) | 50 MB | Local API server: 2000 MB. |
| Webhook ports | 443, 80, 88, 8443 only | HTTPS required. |
| Webhook max connections | 1–100 | Per bot. |
| Inline keyboard per message | 1 (overwrites prior) | `editMessageReplyMarkup` to swap. |

**The 64-byte `callback_data` gotcha is the #1 silent killer** for
non-ASCII bots. Test your callback_data strings in actual bytes before
shipping. Pattern that works in any alphabet:

```ts
// Namespaced short prefixes — works in any language
"act:42"        // 6 bytes, ASCII
"подтв:да"      // 14 bytes Cyrillic — room for ~16 chars
"✅:42"          // 8 bytes — emoji costs 4
```

If you need more than 64 bytes, **store a server-side map keyed by a
short UUID and put only the UUID in `callback_data`**. The current
agntdev toolkit doesn't ship that helper — copy `Map<string, T>` into
your own `src/state/callback-cache.ts` if you hit the limit.

For everything below, see [telegram-bot-ui](../telegram-bot-ui/SKILL.md)
for how limits affect keyboard layout, and
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §10 for the
"callback_data with non-ASCII >30 chars" anti-pattern.

---

## 5. parse_mode — pick HTML by default

Telegram supports three text styles. Pick the simplest one that does the
job. **Default to HTML** unless you need a feature HTML doesn't have.

| Mode | Escape rules | Power | When |
|---|---|---|---|
| (none) | None | Plain text only | Default. No formatting. |
| `HTML` | **3 chars**: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;` | Bold, italic, underline (`<u>`), strike (`<s>`), spoiler (`<tg-spoiler>`), code, pre, links | **Default.** Familiar, forgiving, hard to break. |
| `MarkdownV2` | **18 chars** (`.`, `!`, `=`, `+`, `-`, `(`, `)`, `{`, `}`, `[`, `]`, `>`, `#`, `+`, `-`, `\|`, `\`, `~`) | All HTML features + better underline + strikethrough + nested entities | Only when you need `__underline__` or `~strike~` and HTML won't cut it. |

> **Legacy `Markdown`** (no V2) is deprecated. Don't use it.

### HTML tags Telegram supports

```html
<b>bold</b>
<i>italic</i>
<u>underline</u>
<s>strikethrough</s>
<tg-spoiler>hidden until tapped</tg-spoiler>
<code>inline code</code>
<pre language="js">block code with optional language</pre>
<a href="https://example.com">link text</a>
<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>
```

`quote_parse_mode` (Bot API 7.x+) accepts both HTML and MarkdownV2 for
partial-quote replies. Only `HTML` is recommended.

### Escape helper (always escape user input)

```ts
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

### When MarkdownV2 is required

- Spoiler text (`||hidden||` — HTML `<tg-spoiler>` also works; pick HTML).
- Nested entities (HTML can't nest, e.g. `*2*\**2=4*` for `2*2=4` italic inside bold).
- Underline via `__text__` (HTML `<u>` also works).

For each, **escape with `\\` before each of the 18 chars**:

```ts
function escapeMd2(s: string): string {
  return s.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
```

For "what to SAY on the button" and message copy itself, see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §1 Microcopy.

---

## 6. Message entities — what each one does

Entities are how Telegram renders formatted text. They come either from
`parse_mode` (you send a string with markup) or from the `entities`
array on `Message` (you send raw offsets — advanced, rarely needed).

| Entity | HTML | MarkdownV2 | Notes |
|---|---|---|---|
| Bold | `<b>x</b>` | `*x*` | |
| Italic | `<i>x</i>` | `_x_` | |
| Underline | `<u>x</u>` | `__x__` | **HTML-only in Telegram's renderer** until 9.x added proper support; MarkdownV2 always worked. |
| Strikethrough | `<s>x</s>` | `~x~` | |
| Spoiler | `<tg-spoiler>x</tg-spoiler>` | `\|\|x\|\|` | Tappable; hides until user taps. |
| Code | `<code>x</code>` | `` `x` `` | Inline, monospace. |
| Pre | `<pre>x</pre>` | ` ```x``` ` | Block. `<pre language="x">` for syntax highlight. |
| Link | `<a href="URL">x</a>` | `[x](URL)` | URL must be `http(s)://` or `tg://`. |
| Mention | `<a href="tg://user?id=123">x</a>` | n/a | Inline mention of any user. |
| Custom emoji | `<tg-emoji emoji-id="ID">👍</tg-emoji>` | n/a | Requires paid Fragment username (see Bot API 7.9+). |
| Blockquote (Bot API 8.0+) | `<blockquote>x</blockquote>` | `>x` (line-prefixed) | Single block. |
| Expandable blockquote (Bot API 9.x) | `<blockquote expandable>x</blockquote>` | n/a | Collapsed by default, tap to expand. |

### Entity length rule (subtle)

Entity length must **NOT include trailing newlines/whitespace**. The
Telegram client `rtrim`s entities before computing offsets. If you
build entities by hand (raw offsets), `rtrim` first or you'll get
mis-aligned rendering.

```ts
// Building entities manually:
const text = "Hello, **world**  \n";
const rtrimmed = text.replace(/\s+$/, "");
// length: rtrimmed.length, not text.length
```

For **richer layouts** (tables, sections, dividers, embedded media
blocks, streaming AI replies), use Rich Messages (§7 below).

---

## 7. Rich Messages (Bot API 10.1, June 11 2026) — new UX primitive

The biggest Bot API addition in 2026. Bots can now send **structured
messages** with section headings, dividers, footers, tables, expandable
details, embedded media blocks (photo/video/map), and **streaming AI
replies**.

### RichText classes (text formatting as objects)

Instead of `parse_mode`, you compose a `RichMessage` from typed blocks:

```ts
const richMessage = {
  blocks: [
    {
      type: "RichBlockSectionHeading",
      text: { type: "RichTextBold", text: "Booking confirmed" },
    },
    { type: "RichBlockDivider" },
    {
      type: "RichBlockParagraph",
      text: [
        { type: "RichTextText", text: "Your slot: " },
        { type: "RichTextBold", text: "14:00 today" },
      ],
    },
    {
      type: "RichBlockList",
      items: [
        { type: "RichBlockListItem", text: { type: "RichTextText", text: "Service: cut" } },
        { type: "RichBlockListItem", text: { type: "RichTextText", text: "Barber: Alex" } },
      ],
    },
    { type: "RichBlockDivider" },
    {
      type: "RichBlockFooter",
      text: { type: "RichTextItalic", text: "Reply /cancel to cancel up to 2h before." },
    },
  ],
};

await ctx.api.sendRichMessage(chatId, { rich_message: richMessage });
```

### Streaming AI replies (`sendRichMessageDraft`)

For LLM-driven flows. Send an empty draft, update it on each token, finalize:

```ts
// 1. Open an empty draft
const draft = await ctx.api.sendRichMessageDraft(chatId, {
  rich_message: { blocks: [] },
});

// 2. Stream tokens from your LLM, editing the draft in place
for await (const token of llmStream(prompt)) {
  draft.blocks.push({ type: "RichBlockParagraph", text: { type: "RichTextText", text: token } });
  await ctx.api.sendRichMessageDraft(chatId, {
    rich_message: draft,
    draft_id: draft.draft_id,
  });
}

// 3. Finalize — converts the draft into a real message
await ctx.api.sendRichMessage(chatId, { rich_message: draft });
```

`sendRichMessageDraft` is **editable** (acts like an `editMessageText`
for rich content). Use it for any AI/LLM flow — Claude-style "thinking"
blocks (`RichBlockThinking`), structured outputs, anything where you'd
otherwise spam new messages.

### Useful block types

| Block | Purpose |
|---|---|
| `RichBlockParagraph` | Body text (single paragraph). |
| `RichBlockSectionHeading` | H1/H2 visual break. |
| `RichBlockDivider` | Horizontal rule between sections. |
| `RichBlockFooter` | Small grey text under main content. |
| `RichBlockList` + `RichBlockListItem` | Bulleted/numbered lists. |
| `RichBlockBlockQuotation` | Indented quote. |
| `RichBlockPullQuotation` | Large quote with side accent. |
| `RichBlockTable` + `RichBlockTableCell` | Tabular data. |
| `RichBlockDetails` | Collapsible section. |
| `RichBlockMap` | Embedded map. |
| `RichBlockPhoto` / `RichBlockVideo` / `RichBlockAnimation` / `RichBlockAudio` / `RichBlockVoiceNote` | Media blocks (don't need a separate `sendPhoto`). |
| `RichBlockCollage` / `RichBlockSlideshow` | Multi-media blocks. |
| `RichBlockThinking` | "Thinking" indicator (Claude-style). |

**Heads-up:** Rich Messages is **Bot API 10.1** (June 11 2026) — one week
old at time of writing. Some grammY types may lag the spec. If the
types don't compile, declare the object as `any` once and move on;
the wire format is stable.

For flow patterns using rich messages (e.g. confirmation flow with
footer + details block), see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §6 Flow patterns.

---

## 8. Checklists (Bot API 9.1, July 3 2025) — todos as native UI

Bots can send **checklist messages** — todo-style lists where users
mark items done by tapping. No web app, no inline keyboard hacks.

```ts
// Send a checklist
await ctx.api.sendChecklist(chatId, {
  checklist: {
    title: "Pack for the trip",
    tasks: [
      { id: "1", text: "Passport" },
      { id: "2", text: "Charger" },
      { id: "3", text: "Sunscreen" },
    ],
  },
});

// Mark a task done (from server, e.g. via webhook from your backend)
await ctx.api.editMessageChecklist(chatId, messageId, {
  checklist: {
    tasks: [
      { id: "1", text: "Passport", completed: true },
      { id: "2", text: "Charger" },
      { id: "3", text: "Sunscreen" },
    ],
  },
});
```

**Good for:** shopping lists, packing lists, onboarding checklists,
task trackers, group chores. State lives in your backend (`completedTaskIds`
in your DB); the message is a render of that state.

For the full flow pattern (user checks off items → bot updates session
→ bot renders updated checklist), see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §6.

---

## 9. Chat types matrix — what works where

| | Private | Group | Supergroup | Channel |
|---|---|---|---|---|
| Inline keyboard | ✅ | ✅ | ✅ | ❌ (no callbacks from channels) |
| Reply keyboard | ✅ | ✅ | ✅ | ❌ |
| `sendMessage` | ✅ | ✅ (privacy-mode gated) | ✅ | ✅ (broadcast only) |
| Bot ambient messages (no mention) | ✅ | ⚠️ **Privacy mode off** | ⚠️ **Privacy mode off** | ❌ |
| Commands without mention | ✅ | ⚠️ **Privacy mode off** | ⚠️ **Privacy mode off** | ❌ |
| Inline queries | ✅ (in any chat) | ✅ (in any chat) | ✅ (in any chat) | ❌ |
| Topics (`message_thread_id`) | n/a | n/a | ✅ | n/a |
| `pinChatMessage` | n/a | ✅ (needs admin) | ✅ | ✅ |
| Slowmode respected | n/a | ✅ | ✅ | n/a |
| `can_read_all_group_messages` | n/a | controls ambient reads | controls ambient reads | ✅ (always reads) |

### Privacy mode in groups — the silent killer

By default, Telegram **only delivers messages to a group bot that**:

- Start with `/` (a command)
- Mention the bot by username
- Are replies to the bot's own message
- Are service messages (member joins, etc.)

If your bot sends ambient messages in a group ("Good morning everyone!"),
**users see them only if the bot has `can_read_all_group_messages = true`
in BotFather settings AND privacy mode is disabled**. Default is OFF.
For group UX rules, see [telegram-bot-ux](../telegram-bot-ux/SKILL.md) §5.

### Topics in supergroups

Supergroups with **Topics enabled** add a `message_thread_id` field to
every `Message`. Bot handlers must thread their replies back to the
right topic:

```ts
bot.on("message", async (ctx) => {
  const threadId = ctx.message?.message_thread_id;
  await ctx.reply("Reply in same topic", {
    message_thread_id: threadId,  // undefined = General topic
  });
});
```

Without `message_thread_id` on the reply, the bot's message lands in
General and breaks the conversation flow.

### Channels (broadcast)

Bots in channels are admin-only. They post on behalf of the channel,
never receive messages from users (no `from`, no `chat` writes). Use
channels for **announcements** (signal channel); use a group with the
bot as admin for **discussion**.

### Guest Mode (Bot API 10.0, May 8 2026)

Bots can now reply in **chats they're not a member of** if the
calling user opts in. Use `answerGuestQuery` and the new
`guest_message` Update type. Pattern: a "comment bot" that listens to
public channels and replies in DMs without being added to them. Bot API
10.0 also added bot-to-bot communication via username when both bots
opt in.

---

## 10. Inline button types — what's in the `InlineKeyboardButton`

```ts
type InlineKeyboardButton =
  | { text: string; callback_data: string }                           // standard tap → callback
  | { text: string; url: string }                                     // open URL
  | { text: string; switch_inline_query: string }                      // open @bot in current chat
  | { text: string; switch_inline_query_current_chat: string }        // same, query auto-filled
  | { text: string; web_app: { url: string } }                        // open Mini App (Bot API 9.4+)
  | { text: string; login_url: { url: string; ... } }                 // Telegram Login Widget
  | { text: string; copy_text: { text: string } }                      // one-tap copy to clipboard (Bot API 7.x+)
  | { text: string; pay: boolean };                                   // payment button
```

**`copy_text`** is stupidly useful and underused. Builders add a "Your
order ID: ABC-123" text and expect users to long-press to copy. Use a
`copy_text` button instead:

```ts
inlineKeyboard([[
  { text: "📋 Copy order ID", copy_text: { text: orderId } },
  { text: "📦 Track", callback_data: `track:${orderId}` },
]]);
```

For **when to use each** (callbacks for choices, URLs for off-app
destinations, Mini Apps when the flow has grown past keyboard capacity),
see [telegram-bot-ux](../telegram-bot-ux/SKILL.md) §8 Mini App graduation.

`pay` is for Telegram Stars payments. Use `createInvoiceLink` from your
backend, then attach the link to a button.

---

## 11. Media types — when to use which

| Method | When | Limit |
|---|---|---|
| `sendPhoto` | Image, will be displayed inline | 10 MB, ≤10000 px on each side |
| `sendAnimation` | GIF / H.264 / silent video | 50 MB |
| `sendVideo` | Video with sound | 50 MB |
| `sendVideoNote` | Round video message | 50 MB |
| `sendVoice` | Voice message (OGG/MP3) | 50 MB |
| `sendAudio` | Music file with metadata | 50 MB |
| `sendDocument` | Any file the others don't cover | 50 MB |
| `sendLocation` | Single point | n/a |
| `sendVenue` | Named place | n/a |
| `sendContact` | vCard | n/a |
| `sendPoll` | Quiz / multiple-choice | 1–10 options, ≤100 chars each |
| `sendMediaGroup` | Batch of 2–10 media items as one album | mix photo+video ok |
| `sendSticker` | `.webp` or `.tgs` or `.webm` sticker | 500 KB static, 64 KB `.tgs` |
| `sendLivePhoto` (Bot API 10.0) | Photo + short video combined | 10 MB |
| `sendPaidMedia` (Bot API 10.1) | Stars-paid media behind a paywall | per-item Stars price |

**Caption ≤1024 chars** for any media with `caption` field (Bot API
9.x raised it from 1024 to 1024 — same).

### When photo vs document

- **Photo**: rendered inline, compressed automatically. User taps to
  zoom. **Default for any image.**
- **Document**: downloaded as-is, no compression, no inline preview.
  Use for: high-res images users want to keep, PDFs, files.

For UX patterns (captions, batches, spoiler flags), see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §4 Media UX.

---

## 12. Webhook contract (deploy basics)

The platform handles your webhook (see
[telegram-bot-deploy](../telegram-bot-deploy/SKILL.md) for full contract).
For ground truth when debugging:

| | Official API | Local API server |
|---|---|---|
| File download max | 20 MB | Unlimited |
| File upload max | 50 MB | 2000 MB |
| HTTPS port | 443, 80, 88, 8443 | any |
| Max connections / bot | 1–100 | 1–100000 |
| URL required | HTTPS with valid cert | HTTP OK on private net |

Webhook payload size limit is not strictly bounded, but updates with
files >20 MB on official API will fail to deliver. For bots handling
large file flows, **prefer `getUpdates` (long polling)** — agntdev's
deploy contract uses polling by default.

---

## Quick Reference

| What | grammY | Toolkit |
|---|---|---|
| Create bot | `new Bot(token)` | `createBot(token, opts)` |
| Command handler | `bot.command("x", fn)` | Same |
| Callback handler | `bot.callbackQuery("d", fn)` | Same |
| Reply | `ctx.reply(text)` | Same |
| Session | `bot.use(session({...}))` | Auto-wired via `createBot()` |
| Error boundary | `bot.catch(fn)` | Auto-wired, `onError` in opts |
| Factory export | Manual pattern | `makeBot()` → tooling expects this |

| Limit | Value |
|---|---|
| `callback_data` | 1–64 BYTES |
| Message text | 1–4096 chars |
| Caption | 0–1024 chars |
| Inline buttons / keyboard | 100 |
| Inline keyboard rows | 8 |
| Inline query results | 50 |
| `switch_pm_parameter` | 64 chars |
| Webhook file (official) | 20 MB down / 50 MB up |

| Entity | HTML | MarkdownV2 |
|---|---|---|
| Bold | `<b>` | `**` |
| Italic | `<i>` | `_` |
| Underline | `<u>` | `__` |
| Strike | `<s>` | `~~` |
| Spoiler | `<tg-spoiler>` | `\|\|` |
| Code | `<code>` | `` ` `` |
| Pre | `<pre>` | ` ``` ` |
| Link | `<a href>` | `[](url)` |
| Blockquote | `<blockquote>` | `> ` |

---

## Common mistakes

1. **Singleton bot** — `const bot = createBot(...)` at module level. Harness needs fresh bot per spec. Always wrap in `makeBot()`.
2. **Missing `answerCallbackQuery()`** — spinner never stops. Always call it at end of callback handler. Platform demotes bots with too few answers.
3. **Not awaiting API calls** — `ctx.reply(text)` without `await` means handler finishes before message sends.
4. **Forgetting `export function makeBot()`** — harness looks for this exact export name.
5. **Command case mismatch** — grammY commands are case-sensitive. `/Book` ≠ `/book`.
6. **Token in source code** — use `process.env.BOT_TOKEN`, never hardcode.
7. **Vendoring a `.agntdev-bot-toolkit.tgz`** — the toolkit is already
   vendored in your repo at `src/toolkit/`. If you find yourself
   adding a `file:./.agntdev-bot-toolkit.tgz` line to `package.json`,
   stop — that pattern is gone (it was a brief v0.14.2 thing,
   reversed the same day). Just `import { ... } from
   "../src/toolkit/...js"` instead.
8. **Non-ASCII `callback_data >30 chars`** — Telegram rejects with
   `BUTTON_DATA_INVALID`. It's 64 BYTES, not chars. Test in UTF-8 bytes
   before shipping. See §4.
9. **HTML without escaping** — forgetting `&` first (`&amp;` then `&lt;`
   not the other way around) double-escapes user input. See §5.
10. **Group ambient messages** — by default, group bots only see
    commands / mentions / replies. Privacy mode. Don't promise "I'll
    greet every new member" without setting `can_read_all_group_messages`
    in BotFather. See §9.
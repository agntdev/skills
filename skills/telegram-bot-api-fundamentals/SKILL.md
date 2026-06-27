---
name: telegram-bot-api-fundamentals
description: >
  Wire up the Telegram Bot API foundation. Covers how the HTTP
  client works (long polling vs webhook), how grammY wraps it
  (Bot instance, ctx, command routing, callback queries,
  middleware), the agntdev inlined toolkit (createBot / makeBot),
  the hard limits (callback_data 64 BYTES, message 4096 chars),
  parse_mode (HTML default, MarkdownV2 escape), and message
  entities. USE FOR: building a Telegram bot, grammY bot, bot
  entry point, bot token, long polling, webhook, callback_data
  limit, parse_mode, HTML, MarkdownV2, message entity, createBot,
  makeBot, Bot API limits — even if the user doesn't say "inline"
  or "keyboard" explicitly. DO NOT USE FOR: Rich Messages /
  Checklists / chat types / media (see
  telegram-bot-api-rich-messages), keyboard wiring (see
  telegram-bot-ui), UX rules (see telegram-bot-ux-rules).
  Triggers: build telegram bot, grammY bot, bot entry point, bot token, long polling, webhook, callback_data limit, parse_mode, HTML, MarkdownV2, message entity, createBot, makeBot, Bot API limits.
compatibility: Works with grammY alone, or the inlined toolkit for
  testable bots. Targets Bot API 10.1 (June 11 2026).
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, grammY, bot, bot-api, parse-mode, limits]
  related_skills:
    - telegram-bot-api-rich-messages
    - telegram-bot-ui
    - telegram-bot-ux-rules
    - telegram-bot-sessions
    - telegram-bot-deploy
    - telegram-test-specs
---

# telegram-bot-api-fundamentals Skill

The Telegram bot foundation — HTTP, grammY, the inlined toolkit, and the limits you will hit. For Rich Messages, Checklists, chat types, media, and webhooks, see [telegram-bot-api-rich-messages](../telegram-bot-api-rich-messages/SKILL.md). For UX rules (microcopy, errors, flow patterns), see [telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the build loop.
> This skill teaches the bot-building patterns you apply once you
> have a project.

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
> [telegram-bot-anti-patterns](../telegram-bot-anti-patterns/SKILL.md)
> for the full list.

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
[telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md) §2 Error UX.

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

### Project structure

Every new bot is created from the **`agntdev/bot-starter`** template
repo. The platform's provisioner seeds the new bot repo from this
template on project creation, so you start with a bootable,
**self-contained** skeleton.

```
my-bot/                         # created from agntdev/bot-starter
├── src/
│   ├── bot.ts                  # buildBot() factory — used by src/index.ts
│   ├── index.ts                # runtime entry: makeBot().start() (long polling)
│   ├── harness-entry.ts        # makeBot() for the tests gate (the harness imports this)
│   ├── handlers/               # per-feature grammY Composers (auto-loaded)
│   │   └── <slug>.ts
│   └── toolkit/                # INLINED toolkit — no npm install, no auth
│       ├── index.ts
│       ├── storage/
│       ├── ui/
│       └── harness/            # the test harness CLI source
├── tests/
│   ├── specs/                  # per-feature BotSpec JSON files
│   │   └── <slug>.json
│   ├── commands/               # per-feature slash command manifests
│   │   └── <slug>.json
│   └── ...                     # never edit shared specs.json / commands.json
├── AGENTS.md                   # anti-stub contract
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
[telegram-bot-anti-patterns](../telegram-bot-anti-patterns/SKILL.md)
for the "callback_data with non-ASCII >30 chars" anti-pattern.

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
[telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md) §1 Microcopy.

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

For richer layouts (tables, sections, dividers, embedded media blocks,
streaming AI replies), use Rich Messages — see
[telegram-bot-api-rich-messages](../telegram-bot-api-rich-messages/SKILL.md).

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

## Cross-references

- `telegram-bot-api-rich-messages` — Rich Messages (10.1), Checklists (9.1), chat types, media, webhook
- `telegram-bot-ui` — keyboard mechanics, button builders
- `telegram-bot-ux-rules` — microcopy, error UX, loading UX, chat-type UX, performance budgets
- `telegram-bot-sessions` — session shape, FSM primitives
- `telegram-bot-deploy` — build / deploy / runtime contract
- `telegram-test-specs` — dialog test specs, harness, coverage gate
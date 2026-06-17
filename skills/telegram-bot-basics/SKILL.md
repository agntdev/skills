---
name: telegram-bot-basics
description: >
  Use when building a Telegram bot. Covers how Telegram Bot API works (HTTP),
  how grammY wraps it, and how the inlined toolkit (at src/toolkit/ in the
  bot-starter template) adds harness compatibility.
  Triggers: build telegram bot, create telegram bot, grammY bot, bot entry point.
compatibility: Works with grammY alone, or the inlined toolkit for testable bots.
license: MIT
---

# telegram-bot-basics Skill

How to build a Telegram bot — from raw Bot API to grammY to the agntdev toolkit.

> **Built for the agntdev pipeline.** Use the [agnt-cli-builder](../agnt-cli-builder/SKILL.md)
> skill for the discovery-and-claim loop (`agnt ready` → `agnt dag show` →
> `agnt task claim` → ship the PR). This skill teaches the bot-building
> patterns you apply once you've claimed a task.

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

Without `.catch()`, unhandled errors crash the polling loop.

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

---

## Common mistakes

1. **Singleton bot** — `const bot = createBot(...)` at module level. Harness needs fresh bot per spec. Always wrap in `makeBot()`.
2. **Missing `answerCallbackQuery()`** — spinner never stops. Always call it at end of callback handler.
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

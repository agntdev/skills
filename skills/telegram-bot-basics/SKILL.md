---
name: telegram-bot-basics
description: >
  Use when building a Telegram bot. Covers how Telegram Bot API works (HTTP),
  how grammY wraps it, and how @agntdev/bot-toolkit adds harness compatibility.
  Triggers: build telegram bot, create telegram bot, grammY bot, bot entry point.
compatibility: Works with grammY alone, or @agntdev/bot-toolkit for testable bots.
license: MIT
---

# telegram-bot-basics Skill

How to build a Telegram bot — from raw Bot API to grammY to the agntdev toolkit.

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

## 3. @agntdev/bot-toolkit — The Wrapper

The toolkit wraps grammY with **opinionated defaults** that make bots testable via the tokenless harness.

### createBot() vs new Bot()

```ts
// Pure grammY:
const bot = new Bot(token);
bot.use(session({ initial: () => ({}) }));
bot.catch(console.error);

// Toolkit (same thing, one call):
import { createBot, type BotContext } from "@agntdev/bot-toolkit";

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
import type { BotContext } from "@agntdev/bot-toolkit";

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
import { createBot } from "@agntdev/bot-toolkit";

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

### Project structure

```
my-bot/
├── src/
│   ├── index.ts          # makeBot() factory — THE mandatory export
│   ├── commands/         # one file per command handler
│   │   └── start.ts
│   └── flows/            # multi-step dialog flows
│       └── booking.ts
├── tests/
│   └── specs/            # BotSpec JSON files
│       └── start.json
├── package.json
└── tsconfig.json
```

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

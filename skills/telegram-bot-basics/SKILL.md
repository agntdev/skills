---
name: telegram-bot-basics
description: >
  Use when building a Telegram bot on the memedev pipeline.
  Covers project structure, createBot() entry point, session setup,
  command routing, callback handling, and makeBot() factory export.
  Triggers: build telegram bot, memedev bot, create telegram bot, grammY bot.
compatibility: Requires @memedev/bot-toolkit. Works with grammY under the hood.
license: MIT
---

# telegram-bot-basics Skill

How to build a Telegram bot on the memedev pipeline using `@memedev/bot-toolkit`.

## Project structure

```
my-bot/
├── src/
│   ├── index.ts          # makeBot() factory export
│   ├── commands/         # one file per command handler
│   │   └── start.ts
│   └── flows/            # multi-step dialog flows
│       └── booking.ts
├── tests/
│   └── specs/            # BotSpec JSON files
│       └── start.json
├── docs/work_breakdown.json  # emitted by Details phase
├── package.json
└── tsconfig.json
```

**The only mandatory export:** `src/index.ts` must export `makeBot(): Bot`. The test harness and codegen assume this shape.

---

## createBot() — the entry point

```ts
import { createBot, type BotContext } from "@memedev/bot-toolkit";

interface Session {
  step: string;
  // any per-user state
}

export function makeBot() {
  const bot = createBot<Session>("BOT_TOKEN", {
    initial: () => ({ step: "idle" }),
    // storage: ...  // omit for MemorySessionStorage (dev default)
    // onError: (err) => { ... }
  });

  // Register commands below
  return bot;
}
```

### createBot options

| Option | Type | Default | Notes |
|---|---|---|---|
| `token` | `string` | required | BotFather token. In production injected at runtime, never baked |
| `initial` | `() => S` | required | Factory for fresh session state |
| `storage` | `StorageAdapter<S>` | `MemorySessionStorage` | Swap for SQLite in production |
| `onError` | `(err: unknown) => void` | `console.error` | Error boundary callback |

### What createBot wires

- grammY `Bot` instance
- Session middleware (grammY `session()` plugin) with `initial` + `storage`
- `bot.catch()` error boundary

### BotContext type

```ts
import type { BotContext } from "@memedev/bot-toolkit";

// BotContext<S> = grammY Context & SessionFlavor<S>
bot.command("start", async (ctx: BotContext<Session>) => {
  ctx.session.step = "started";  // typed session access
  await ctx.reply("Hello!");
});
```

---

## Command routing

```ts
bot.command("start", async (ctx) => {
  await ctx.reply("Welcome!");
});

// Commands support @botusername suffix automatically
// "/start@MyBot" and "/start" both match
```

**Command naming rules:**
- Commands are `[a-z0-9_]+`, case-sensitive (`/Book` ≠ `/book`)
- Each command needs >= 1 test spec for coverage gate
- Register commands in `bot.api.setMyCommands()` (optional, for menu display)

---

## Callback query handling

```ts
// Simple match
bot.callbackQuery("menu:next", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Page 2");
});

// Prefix-based routing (preferred for namespaced data)
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("page:")) {
    // handle pagination
  } else if (data.startsWith("vote:")) {
    // handle voting
  }
  await ctx.answerCallbackQuery();
});
```

**Always call `answerCallbackQuery()`** — otherwise Telegram shows infinite loading spinner:

```ts
await ctx.answerCallbackQuery();                          // silent
await ctx.answerCallbackQuery({ text: "Done!" });         // toast
await ctx.answerCallbackQuery({ text: "Error", show_alert: true }); // alert
```

---

## Session access

```ts
interface Session {
  count: number;
}

bot.command("count", async (ctx: BotContext<Session>) => {
  ctx.session.count = (ctx.session.count ?? 0) + 1;
  await ctx.reply(`Count: ${ctx.session.count}`);
});
```

Session persists across messages from the same user. In dev it's `MemorySessionStorage` (resets on restart). In production, swap to SQLite.

---

## makeBot() factory pattern

**Every bot must export `makeBot()`** — the test harness calls it fresh per spec run:

```ts
// src/index.ts
import { createBot } from "@memedev/bot-toolkit";

export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, {
    initial: () => ({ step: "idle" }),
  });

  // Import and register all handlers
  bot.command("start", startHandler);
  bot.callbackQuery("menu:next", nextHandler);

  return bot;
}

// If running standalone (not under harness):
if (require.main === module) {
  makeBot().start();
}
```

**Critical:** `makeBot()` must return a fresh bot each call. Do NOT reuse a singleton — the harness needs isolation per spec run.

---

## Common mistakes

1. **Singleton bot** — `const bot = createBot(...)` at module level breaks harness isolation. Always wrap in `makeBot()`.
2. **Missing `answerCallbackQuery()`** — spinner never stops, bot seems broken.
3. **Not awaiting reply calls** — handler finishes before the message sends. Always `await ctx.reply(...)`.
4. **Forgetting `export function makeBot()`** — harness can't find the factory, gate fails.
5. **Case mismatch in commands** — `/Book` handler won't match `/book`. Case-sensitive.

---
name: telegram-bot-sessions
description: >
  Implement user session persistence in a Telegram bot. Covers Bot
  API's stateless nature, grammY session plugin + StorageAdapter, and
  the inlined toolkit's MemorySessionStorage + harness isolation
  (the toolkit lives at src/toolkit/ in the bot-starter template).
  USE FOR: session, persistence, bot state, user state, conversation
  flow, ctx.session.step, ctx.session shape, MemorySessionStorage,
  Redis adapter, harness isolation — even if the user doesn't say
  "session" or "persistence" explicitly. DO NOT USE FOR: flow
  patterns over session state (see telegram-bot-flow-patterns), or
  the Bot API foundation (see telegram-bot-api-fundamentals).
  Triggers: session, persistence, bot state, user state, conversation flow, ctx.session.step, ctx.session shape, MemorySessionStorage, Redis adapter, harness isolation.
compatibility: Works with grammY sessions alone, or the inlined toolkit for defaults.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, grammY, session, persistence, redis]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-deploy
---

# telegram-bot-sessions Skill

How to persist user state in a Telegram bot — why it's needed, how grammY solves it, how the toolkit wraps it.

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the discovery-and-claim
> loop. This skill teaches the MemorySessionStorage / SQLite adapter
> patterns you wire into your claimed task's implementation.

---

## 1. Why Sessions Are Needed (Bot API)

Telegram Bot API is **stateless**. Every Update arrives as a fresh HTTP request. The bot has no built-in memory of what a user did before.

```
User: "I want to book"
Bot:  "What service?"
User: "Haircut"
Bot:  "When?"
User:  "Tomorrow 2pm"
Bot:  "Booked!"
```

Without state, the bot can't know that "Haircut" answers the "What service?" question vs being a random message. It has no memory of the conversation step.

### How Bot API handles it — there is no built-in mechanism

Bot API just delivers Updates. It's up to the bot to:
1. Remember who is at what step
2. Store partial data between messages
3. Clear state when a flow completes

**Option: Database.** Write user state to SQLite/Redis on every message. Works but adds latency + complexity.

**Option: In-memory Map.** Fast but lost on restart. Fine for dev, bad for production.

**Option: grammY sessions.** The framework abstracts this away.

---

## 2. grammY Sessions — The Framework Solution

grammY provides a `session()` plugin that stores per-chat state and makes it available as `ctx.session`.

### Basic setup

```ts
import { Bot, session } from "grammy";

interface SessionData {
  step: string;
  service?: string;
}

const bot = new Bot(token);

bot.use(session({
  initial: (): SessionData => ({ step: "idle" }),
  // storage: ...  // defaults to in-memory Map
}));

bot.command("book", async (ctx) => {
  ctx.session.step = "choosing_service";
  await ctx.reply("What service?");
});

bot.on("message:text", async (ctx) => {
  if (ctx.session.step === "choosing_service") {
    ctx.session.service = ctx.message.text;
    ctx.session.step = "choosing_time";
    await ctx.reply("What time?");
  }
});
```

### Session key

grammY keys sessions by `chatId_userId` (`"12345_67890"`). This means:
- **Private chats:** one session per user (chat and user are the same person)
- **Group chats:** one session shared by all users in the chat
- Session is per-chat, not per-user globally

### Session flavor — typing ctx.session

```ts
import { session, type SessionFlavor } from "grammy";

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(token);
bot.use(session({ initial: () => ({ step: "idle" }) }));

// ctx.session is now typed:
bot.command("book", async (ctx) => {
  ctx.session.step = "choosing";  // TypeScript knows this field
});
```

### StorageAdapter interface

grammY sessions work with any storage backend that implements:

```ts
interface StorageAdapter<T> {
  read(key: string): T | undefined;
  write(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  readAllKeys(): string[];
}
```

Built-in options:
- **Default** — in-memory `Map` (fast, lost on restart, fine for dev)
- **SQLite** — durable, survives restarts (add `@grammyjs/storage-sqlite`)
- **Redis** — fast + durable (add `@grammyjs/storage-redis`)
- **Firebase, MongoDB, Supabase** — community adapters available

---

## 3. The toolkit (`src/toolkit/`) — Session Defaults

### MemorySessionStorage

The inlined toolkit (at `src/toolkit/` in the bot-starter template)
ships `MemorySessionStorage` — a grammY-compatible `StorageAdapter`
backed by `Map`.

```ts
import { MemorySessionStorage } from "../src/toolkit/storage/memory.js";

// Implements StorageAdapter:
const store = new MemorySessionStorage<SessionData>();
store.write("123_456", { step: "idle" });
store.read("123_456");    // { step: "idle" }
store.has("123_456");     // true
store.delete("123_456");
store.readAllKeys();      // []
```

**You rarely instantiate it directly.** `createBot()` uses it by default:

```ts
const bot = createBot<Session>(token, {
  initial: () => ({ step: "idle" }),
  // storage omitted → MemorySessionStorage used automatically
});
```

### Session shape design

Keep sessions **flat and serializable** — no functions, no class instances, no circular refs:

```ts
interface Session {
  // Dialog state
  step: string;

  // Flow data (optional until set)
  serviceId?: string;
  slotDate?: string;
  slotTime?: string;

  // Simple counters
  bookingsCount?: number;
}
```

Every session starts from `initial()`:

```ts
initial: () => ({
  step: "idle",
  bookingsCount: 0,
})
```

### Harness isolation

The test harness creates a **fresh bot per spec** via `makeBot()`. Each bot gets its own `MemorySessionStorage`:

```
Spec 1 ("booking flow"):
  makeBot() → fresh MemorySessionStorage → session starts from initial()

Spec 2 ("cancel flow"):
  makeBot() → another fresh MemorySessionStorage → session starts from initial()
```

- No session leaks between specs
- No cleanup needed between runs
- Each spec sees exactly the state `initial()` defines

### SQLite in production

For production bots, swap to SQLite (same StorageAdapter interface, same bot code):

```ts
import { SqliteSessionStorage } from "../src/toolkit/storage/sqlite.js"; // planned

const bot = createBot<Session>(token, {
  initial: () => ({ step: "idle" }),
  storage: new SqliteSessionStorage("./data/sessions.db"),
});
```

Until the toolkit ships SQLite adapter, use grammY's `@grammyjs/storage-sqlite` directly — same interface.

### Migration

Adding fields to session:

```ts
// V1
interface Session { step: string; }

// V2 — add optional field (safe, no migration needed)
interface Session {
  step: string;
  theme?: "light" | "dark";  // optional — defaults to undefined
}

// Access with default:
const theme = ctx.session.theme ?? "light";
```

- **MemoryStorage:** restarts wipe everything — no migration needed
- **SQLite:** optional fields safe to add. Required new fields need migration step that fills defaults for existing rows

---

## Quick Reference

| What | grammY | Toolkit |
|---|---|---|
| Activate sessions | `bot.use(session({...}))` | Auto via `createBot()` |
| Type ctx.session | `Context & SessionFlavor<S>` | `BotContext<S>` (pre-built) |
| Storage (dev) | In-memory Map (default) | MemorySessionStorage (default) |
| Storage (prod) | `@grammyjs/storage-sqlite` | SqliteSessionStorage (planned) |
| Session key | `chatId_userId` | Same |
| Harness isolation | Manual setup | Automatic — fresh per spec |

---

## Common mistakes

1. **Storing non-serializable data** — no functions, no class instances. Plain objects only.
2. **Not initializing fields in `initial()`** — missing fields are `undefined`, not defaults.
3. **Relying on session across restarts (MemoryStorage)** — ephemeral. Design flows restart-safe.
4. **Session is per-chat, not per-user** — same user in different chats = different sessions.
5. **Session key = `chatId_userId` string** — don't confuse with `chat.id` alone.

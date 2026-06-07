---
name: telegram-bot-sessions
description: >
  Use when implementing user session persistence in a memedev bot.
  Covers MemorySessionStorage (dev/harness), SQLite adapter (preview),
  session shape design, and migration patterns.
  Triggers: session, persistence, bot state, SQLite bot.
compatibility: Requires @memedev/bot-toolkit.
license: MIT
---

# telegram-bot-sessions Skill

How to implement user session persistence in a memedev bot.

## MemorySessionStorage (default)

`createBot()` defaults to `MemorySessionStorage` — an in-memory grammY `StorageAdapter`. Good for development and test harness. Resets on restart.

```ts
import { MemorySessionStorage } from "@memedev/bot-toolkit";

// Implements grammY StorageAdapter:
// read(key) / write(key, value) / delete(key) / has(key) / readAllKeys()
```

**You never need to instantiate it directly** — `createBot()` does it for you:

```ts
const bot = createBot<Session>("TOKEN", {
  initial: () => ({ step: "idle" }),
  // storage omitted → MemorySessionStorage used automatically
});
```

---

## Session shape design

Define a typed session interface. Keep it flat and serializable (no functions, no classes):

```ts
interface Session {
  // Dialog state
  step: string;

  // Booking flow state
  serviceId?: string;
  slotDate?: string;
  slotTime?: string;

  // Counters
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

Access session through typed context:

```ts
import type { BotContext } from "@memedev/bot-toolkit";

bot.command("book", async (ctx: BotContext<Session>) => {
  ctx.session.step = "choosing_service";
  ctx.session.bookingsCount = (ctx.session.bookingsCount ?? 0) + 1;
  await ctx.reply("Choose a service:");
});
```

---

## SQLite adapter (preview)

Production bots swap in a SQLite adapter. It implements the same `StorageAdapter<S>` interface, so the rest of the bot code doesn't change.

```ts
import { SqliteSessionStorage } from "@memedev/bot-toolkit/sqlite"; // planned

const bot = createBot<Session>(token, {
  initial: () => ({ step: "idle" }),
  storage: new SqliteSessionStorage("./data/sessions.db"),
});
```

Until the SQLite adapter ships, use `MemorySessionStorage` for dev and plan the swap later.

---

## Session key format

grammY uses `chatId_userId` as the session key (e.g., `"12345_67890"`). This means:
- Session is per-chat, not per-user
- Group chats share one session
- Private chats get one session per user

---

## Migration patterns

When adding fields to your session shape:

```ts
// Old session:
interface SessionV1 { step: string; }

// New session with migration:
interface SessionV2 {
  step: string;
  theme?: "light" | "dark";  // new optional field
}

// In createBot, handle migration in initial or middleware:
const bot = createBot<SessionV2>(token, {
  initial: () => ({ step: "idle", theme: "light" }),
});

// For existing sessions, access ctx.session.theme with a default:
const theme = ctx.session.theme ?? "light";
```

**With MemorySessionStorage:** restarts wipe all sessions — no migration needed.
**With SQLite:** optional fields (like `theme?`) are safe to add. Required new fields need a migration step.

---

## Harness and sessions

The test harness creates a **fresh bot per spec** via `makeBot()`. Each bot has its own `MemorySessionStorage`, so:
- Specs are isolated — no session leaks between tests
- Session starts from `initial()` for each spec
- No cleanup needed between runs

```ts
// In test spec:
{
  "name": "booking flow",
  "steps": [
    { "send": { "text": "/start" }, "expect": [{ "method": "sendMessage" }] },
    { "send": { "text": "/book" },  "expect": [{ "method": "sendMessage", "payload": { "text": "Choose a service:" } }] }
  ]
}
```

Session state (`step = "idle"`) resets fresh for the next spec — no cross-contamination.

---

## Common mistakes

1. **Storing non-serializable data in session** — no functions, no class instances, no circular refs. Plain objects only.
2. **Not initializing session fields** — always provide defaults in `initial()`.
3. **Relying on session across restarts with MemoryStorage** — dev memory storage is ephemeral. Design flows to be restart-safe.
4. **Forgetting session is per-chat, not per-user** — same user in different chats = different sessions.

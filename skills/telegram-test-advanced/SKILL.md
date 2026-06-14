---
name: telegram-test-advanced
description: >
  Use when a Telegram bot's tests outgrow declarative BotSpec JSON — mocking
  external dependencies (DB / HTTP / payments), simulating Telegram API failures
  (429 rate limit, blocked user, message-not-modified), and writing raw
  handleUpdate tests with direct assertions. Assumes the tokenless harness model
  from telegram-test-specs.
  Triggers: mock bot dependencies, test error paths, rate limit test, blocked user test,
  programmatic bot test, handleUpdate test, simulate api failure, payment test.
compatibility: Requires grammY + a test runner (vitest). @agntdev/bot-toolkit for the makeBot() factory.
license: MIT
---

# telegram-test-advanced Skill

How to test a Telegram bot when declarative specs run out of road — mocking the
bot's own dependencies, forcing Telegram API failures, and dropping to raw
`handleUpdate` tests.

> **Built for the agntdev pipeline.** Read [telegram-test-specs](../telegram-test-specs/SKILL.md)
> **first** — it owns the tokenless harness model, the BotSpec JSON format, and
> the coverage gate. This skill is the escape hatch for the cases that JSON
> can't express. See [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the
> discovery-and-claim loop, and [telegram-bot-basics](../telegram-bot-basics/SKILL.md)
> for the `makeBot()` factory these tests rely on.

---

## 1. When You've Outgrown BotSpec JSON

The declarative harness in [telegram-test-specs](../telegram-test-specs/SKILL.md)
feeds synthetic Updates into a fresh `makeBot()`, captures every outgoing API
call, and returns `{ ok: true }` for all of them. That covers most bots. Three
things it **cannot** express push you to programmatic tests:

| Need | Why JSON can't do it | Go to |
|---|---|---|
| Command / callback happy paths | — (JSON is perfect here) | **Stay in specs** |
| Coverage gate | Only specs count toward it | **Stay in specs** |
| "When the bot queries the DB, return X" | No hook for the bot's *own* deps | §3 |
| "Telegram returns 429 / blocks the user" | Capture transformer always returns `ok: true` | §4 |
| "Exactly N calls, in this order, with this shape" | `expect` is deep-subset, order-lenient | §2 |
| Edited messages, payments, `my_chat_member` | Awkward to hand-write as raw Updates | §5 |

> **Load-bearing rule:** programmatic tests do **not** count toward the
> command-coverage gate. Keep one spec per command in `telegram-test-specs`
> form, and use the programmatic tests below only for the hard paths. If you
> move a command's only test here, the gate reports it as uncovered and the bot
> won't publish.

---

## 2. The Programmatic Escape Hatch

When you need real code — ordering, exact call counts, computed assertions —
write a vitest test that drives the bot directly. There is **no test helper in
`@agntdev/bot-toolkit`**; you hand-roll the same two pieces the harness uses
internally: a fake `botInfo` (so grammY skips the `getMe` network call) and a
capture transformer.

```ts
// tests/helpers.ts
import type { Bot } from "grammy";

// Skip the getMe network call: grammY uses botInfo if it's already set.
export const FAKE_BOT_INFO = {
  id: 1, is_bot: true, first_name: "TestBot", username: "test_bot",
  can_join_groups: true, can_read_all_group_messages: false,
  supports_inline_queries: false, can_connect_to_business: false,
  has_main_web_app: false,
} as const;

export interface Call { method: string; payload: any }

// Install a transformer that records each call and returns fake success.
// Returns the live array of captured calls.
export function captureCalls(bot: Bot<any>): Call[] {
  const calls: Call[] = [];
  bot.botInfo = { ...FAKE_BOT_INFO };
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload });
    return { ok: true, result: true } as any;
  });
  return calls;
}

// Minimal Update builders (extend per §5).
let seq = 0;
export function textUpdate(text: string, over: Record<string, any> = {}) {
  const id = ++seq;
  const isCmd = text.startsWith("/");
  return {
    update_id: id,
    message: {
      message_id: id,
      date: 0,
      chat: { id: 1, type: "private" },
      from: { id: 1, is_bot: false, first_name: "User" },
      text,
      ...(isCmd ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }] } : {}),
      ...over,
    },
  };
}

export function callbackUpdate(data: string, over: Record<string, any> = {}) {
  const id = ++seq;
  return {
    update_id: id,
    callback_query: {
      id: String(id),
      from: { id: 1, is_bot: false, first_name: "User" },
      message: { message_id: 100, date: 0, chat: { id: 1, type: "private" } },
      data,
      ...over,
    },
  };
}
```

Then the test reads exactly like "Update in → assert calls out":

```ts
// tests/start.test.ts
import { describe, it, expect } from "vitest";
import { makeBot } from "../src/index";
import { captureCalls, textUpdate } from "./helpers";

describe("/start", () => {
  it("greets once and does nothing else", async () => {
    const bot = makeBot();            // fresh bot, fresh session
    const calls = captureCalls(bot);

    await bot.handleUpdate(textUpdate("/start"));

    expect(calls).toHaveLength(1);                 // exact count — JSON can't
    expect(calls[0].method).toBe("sendMessage");
    expect(calls[0].payload.text).toMatch(/welcome/i);
  });
});
```

`bot.handleUpdate(update)` runs the full middleware stack synchronously to
completion, so by the next line every API call the handler made is already in
`calls`. No `await` on the bot beyond `handleUpdate`.

---

## 3. Mocking External Dependencies

A bot that reads a DB or calls an HTTP API has a seam problem: if the handler
imports its dependency from module scope, the test can't replace it.

```ts
// ❌ Untestable — db is baked in at import time
import { db } from "./db";
export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, { initial });
  bot.command("balance", async (ctx) => {
    const bal = await db.getBalance(ctx.from!.id);   // real DB, every test
    await ctx.reply(`Balance: ${bal}`);
  });
  return bot;
}
```

### Primary pattern: dependency injection

Give `makeBot()` an optional `deps` argument whose **default is the real
implementation**. The harness still calls `makeBot()` with no args (so it gets
the real deps), and tests pass fakes.

```ts
// src/index.ts
import { db as realDb } from "./db";

export interface Deps {
  db: { getBalance(userId: number): Promise<number> };
  fetch: typeof globalThis.fetch;
}

const defaultDeps: Deps = { db: realDb, fetch: globalThis.fetch };

export function makeBot(deps: Deps = defaultDeps) {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, { initial });
  bot.command("balance", async (ctx) => {
    const bal = await deps.db.getBalance(ctx.from!.id);
    await ctx.reply(`Balance: ${bal}`);
  });
  return bot;
}
```

```ts
// tests/balance.test.ts
const fakeDb = { getBalance: async () => 42 };
const bot = makeBot({ db: fakeDb, fetch: stubFetch });   // fresh fakes per test
const calls = captureCalls(bot);

await bot.handleUpdate(textUpdate("/balance"));

expect(calls[0].payload.text).toBe("Balance: 42");
```

This composes with the `makeBot()` factory contract from
[telegram-bot-basics](../telegram-bot-basics/SKILL.md): one fresh bot **and**
one fresh set of fakes per call, so nothing leaks between tests.

### Fallback: `vi.mock()`

When you can't change the factory signature (e.g. a shared module imported deep
in a flow), mock the module:

```ts
import { vi } from "vitest";
vi.mock("./db", () => ({
  db: { getBalance: vi.fn(async () => 42) },
}));
```

Prefer injection — it's explicit and per-test. Reach for `vi.mock` only for
deps you can't thread through `makeBot()`.

---

## 4. Error & Adversarial Paths

The capture transformer in §2 always returns `{ ok: true }`, so the bot never
sees a failure. To test the `bot.catch()` boundary and retry logic, install a
transformer that **fails on purpose**. grammY surfaces two distinct error types:

- **`GrammyError`** — Telegram answered with `ok: false` (e.g. 429, 403). Return
  a non-ok `ApiResponse` from the transformer.
- **`HttpError`** — the request never completed (network). **Throw** from the
  transformer.

```ts
// Telegram rate-limits us → GrammyError with retry_after
export function failWith(bot: Bot<any>, resp: { error_code: number; description: string; parameters?: any }) {
  bot.botInfo = { ...FAKE_BOT_INFO };
  bot.api.config.use(async () => ({ ok: false, ...resp } as any));
}
```

```ts
import { GrammyError } from "grammy";

it("surfaces rate limits to the error boundary", async () => {
  const seen: unknown[] = [];
  const bot = makeBot();
  bot.catch((err) => seen.push(err.error));        // your bot.catch() runs
  failWith(bot, { error_code: 429, description: "Too Many Requests",
                  parameters: { retry_after: 5 } });

  await bot.handleUpdate(textUpdate("/start"));

  expect(seen[0]).toBeInstanceOf(GrammyError);
  expect((seen[0] as GrammyError).error_code).toBe(429);
});
```

Common adversarial cases worth a test:

| Scenario | Transformer returns / does | Assert |
|---|---|---|
| Rate limit | `{ ok: false, error_code: 429, parameters: { retry_after } }` | retry / backoff path runs |
| Blocked by user | `{ ok: false, error_code: 403, description: "bot was blocked by the user" }` | bot stops messaging that user, no crash |
| Message not modified | `{ ok: false, error_code: 400, description: "message is not modified" }` | swallowed, not surfaced as a real error |
| Network down | `throw new Error("ECONNRESET")` | becomes `HttpError`, boundary handles it |

> A bot with no `bot.catch()` lets these escape `handleUpdate` and your test
> rejects — which is itself a finding: production polling would crash. Assert
> the boundary exists.

---

## 5. Edge-Case Update Fixtures

The `textUpdate` / `callbackUpdate` builders in §2 cover most input. These are
the shapes specs handle awkwardly — add them to `tests/helpers.ts` as needed.

```ts
// Edited message — bot may re-validate or ignore
export function editedTextUpdate(text: string) {
  const id = ++seq;
  return { update_id: id, edited_message: {
    message_id: id, date: 0, edit_date: 1, chat: { id: 1, type: "private" },
    from: { id: 1, is_bot: false, first_name: "User" }, text } };
}

// Media message — photo (file_id, no text)
export function photoUpdate(caption?: string) {
  const id = ++seq;
  return { update_id: id, message: {
    message_id: id, date: 0, chat: { id: 1, type: "private" },
    from: { id: 1, is_bot: false, first_name: "User" },
    photo: [{ file_id: "AgAC", file_unique_id: "u", width: 90, height: 90 }],
    ...(caption ? { caption } : {}) } };
}

// Bot blocked / unblocked / kicked — drives my_chat_member handlers
export function myChatMemberUpdate(status: "member" | "kicked") {
  const id = ++seq;
  return { update_id: id, my_chat_member: {
    chat: { id: 1, type: "private" }, date: 0,
    from: { id: 1, is_bot: false, first_name: "User" },
    old_chat_member: { status: status === "kicked" ? "member" : "kicked", user: FAKE_BOT_INFO },
    new_chat_member: { status, user: FAKE_BOT_INFO } } };
}

// Payments — Telegram asks to confirm before charging
export function preCheckoutUpdate(payload: string, totalAmount: number) {
  const id = ++seq;
  return { update_id: id, pre_checkout_query: {
    id: String(id), from: { id: 1, is_bot: false, first_name: "User" },
    currency: "USD", total_amount: totalAmount, invoice_payload: payload } };
}

// Inline query — @bot typed in any chat
export function inlineQueryUpdate(query: string) {
  const id = ++seq;
  return { update_id: id, inline_query: {
    id: String(id), from: { id: 1, is_bot: false, first_name: "User" },
    query, offset: "" } };
}
```

Example — a payment bot must `answerPreCheckoutQuery({ ok: true })` or the
charge stalls:

```ts
await bot.handleUpdate(preCheckoutUpdate("order:42", 1500));
expect(calls.find((c) => c.method === "answerPreCheckoutQuery")?.payload.ok).toBe(true);
```

---

## Quick Reference

| Helper | Purpose |
|---|---|
| `captureCalls(bot)` | Record outgoing API calls, return fake `ok` (§2) |
| `failWith(bot, resp)` | Force Telegram `ok: false` → `GrammyError` (§4) |
| `FAKE_BOT_INFO` | Skip the `getMe` network call |
| `textUpdate(text)` | Command / plain text Update |
| `callbackUpdate(data)` | Button tap Update |
| `editedTextUpdate / photoUpdate / myChatMemberUpdate / preCheckoutUpdate / inlineQueryUpdate` | Edge-case inputs (§5) |
| `makeBot(deps)` | Inject fakes; default = real deps (§3) |

| Error type | Cause | Simulate |
|---|---|---|
| `GrammyError` | Telegram returned `ok: false` | transformer returns non-ok response |
| `HttpError` | request never completed | transformer throws |

---

## Common mistakes

1. **Counting on programmatic tests for coverage** — the gate only counts
   `telegram-test-specs` JSON. Move a command's only test here and the bot
   fails to publish. Keep a spec per command; use these for the hard paths.
2. **Transformer always returns `ok`** — copying `captureCalls` into an error
   test means the failure never happens and the assertion is vacuous. Use
   `failWith` for error paths.
3. **Mocking at module scope but the factory cached the real dep** — if
   `makeBot()` closed over the real `db` at import time, `vi.mock` after import
   is too late. Inject via `makeBot(deps)` instead.
4. **Reusing fakes across tests** — a `vi.fn()` stub accumulates calls. Build
   fresh fakes per `makeBot()` call, same as the fresh-bot rule.
5. **`GrammyError` vs `HttpError` mix-up** — returning a non-ok response is a
   `GrammyError`; throwing is an `HttpError`. Asserting the wrong type passes by
   accident or fails confusingly.
6. **No `bot.catch()`** — without it, a forced failure escapes `handleUpdate`
   and rejects your test. That's a real bug (production crash), not a test
   artifact — assert the boundary handles it.

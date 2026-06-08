---
name: telegram-test-specs
description: >
  Use when writing dialog test specs for a Telegram bot. Covers why tokenless
  testing exists, how the harness replays Updates and captures API calls,
  BotSpec JSON format, coverage rules, and the test harness CLI.
  Tests are the objective review gate — all specs must pass for the bot to publish.
  Triggers: write bot tests, dialog specs, harness, command coverage.
compatibility: Requires @agntdev/bot-toolkit test harness.
license: MIT
---

# telegram-test-specs Skill

How to write dialog test specs for a Telegram bot — why tokenless testing, how the harness works, and the spec format.

---

## 1. Why Tokenless Testing

Testing a Telegram bot normally requires a **real bot token** and network calls to `api.telegram.org`. This means:

- Need BotFather token per test
- Tests hit real API (slow, rate-limited)
- Can't run in CI without secrets
- Hard to assert exact API calls

### The harness approach

Instead of calling Telegram's API, the harness:
1. Builds your bot **in-process** (just imports `makeBot()`)
2. Feeds it **synthetic Updates** (no network)
3. **Captures** every outgoing API call the bot tries to make
4. **Compares** captured calls against expected calls

```
BotSpec JSON  →  harness feeds synthetic Updates  →  bot handles them  →  captures API calls  →  compares vs expected
```

No Telegram. No token. No network. Runs anywhere. Deterministic.

### Gate verdict

The harness emits ONE machine-readable line on stdout:

```
GATE:<nonce>:{"ok":true,"total":3,"passed":3,"failed":0,"coverage":{...},"results":[...]}
```

- `ok: true` → all specs pass AND all declared commands covered
- Exit code `0` always (verdict is in JSON; non-zero = harness crashed)
- Nonce authenticates the verdict (bot code can't forge it)

---

## 2. How the Harness Works

### Bot factory

Harness imports your `makeBot()` and calls it fresh per spec:

```ts
import { makeBot } from "./src/index";

// Harness does this internally for each spec:
const bot = makeBot();  // fresh bot, fresh session, fresh state
```

### Capture transformer

The harness installs a grammY **transformer** that intercepts every outgoing API call:

```ts
bot.api.config.use(async (prev, method, payload) => {
  // Instead of calling api.telegram.org:
  calls.push({ method, payload });       // record it
  return { ok: true, result: stub };     // return fake success
});
```

This means `ctx.reply("Hi")`, `ctx.editMessageText(...)`, `ctx.answerCallbackQuery()` — all get captured, none hit the network.

### Fake botInfo

grammY normally calls `getMe` on startup. The harness skips this:

```ts
bot.botInfo = { id: 1, is_bot: true, first_name: "TestBot", username: "test_bot", ... };
```

### Synthetic Updates

The harness builds grammY-compatible Update objects from your spec:

```ts
// { "send": { "text": "/start" } } becomes:
{
  update_id: 1,
  message: {
    message_id: 1,
    chat: { id: 1, type: "private" },
    from: { id: 1, first_name: "User" },
    text: "/start",
    entities: [{ type: "bot_command", offset: 0, length: 6 }]
  }
}
```

- `/command` text auto-gets `bot_command` entity → grammY command router matches
- `chatId` defaults to `1`, `userId` to `1`
- Callback queries include original message → `editMessageText` works

---

## 3. BotSpec Format

A spec file is a JSON object describing a dialog:

```json
{
  "name": "start command greets user",
  "strict": false,
  "steps": [
    {
      "send": { "text": "/start" },
      "expect": [
        { "method": "sendMessage", "payload": { "text": "Welcome!" } }
      ]
    }
  ]
}
```

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Unique, human-readable |
| `strict` | `boolean` | no | Default `false` |
| `steps` | `SpecStep[]` | yes | Ordered user actions + expected responses |

### SpecStep — send (what user does)

Three variants:

```jsonc
// 1. Text message
{ "send": { "text": "/start" } }

// 2. Text with specific chat/user
{ "send": { "text": "/book", "chatId": 42, "userId": 99 } }

// 3. Callback button tap
{ "send": { "callback": "menu:book", "messageId": 100 } }

// 4. Raw Update object (advanced)
{ "send": { "update": { "update_id": 1, "message": {...} } } }
```

### SpecStep — expect (what bot should reply)

```jsonc
// Assert method was called with specific payload (deep-subset match)
{ "method": "sendMessage", "payload": { "text": "Welcome!" } }

// Assert method was called, any payload
{ "method": "editMessageText" }

// Assert method was called (no payload check)
{ "method": "answerCallbackQuery" }
```

**Deep-subset matching:** `payload: { text: "Welcome!" }` matches `{ chat_id: 1, text: "Welcome!", ... }`. You assert what you care about without pinning auto-filled fields like `chat_id`, `message_id`, `parse_mode`.

### Matching modes

**Subsequence (default, `strict: false`):** Every expected call must appear **in order**, but **extra calls are allowed**.

```json
{
  "send": { "callback": "menu:next" },
  "expect": [{ "method": "editMessageText" }]
}
// pass — answerCallbackQuery fired too, but was incidental
```

**Strict (`strict: true`):** Exact count + positional match. Use when "and nothing else" matters.

```json
{
  "strict": true,
  "steps": [
    { "send": { "callback": "menu:next" }, "expect": [
      { "method": "editMessageText" }
    ] }
  ]
}
// fail — answerCallbackQuery fired but wasn't in expect[]
```

Recommendation: subsequence for most specs, strict only for targeted assertions.

---

## 4. Command Coverage Rules

The gate checks: **every declared command must have >= 1 meaningful spec exercising it.**

A spec is "meaningful" for a command when:
1. The `send` step contains a `/command` text
2. That step's `expect[]` has >= 1 entry

```jsonc
// ✅ Counts toward /book coverage:
{ "send": { "text": "/book" }, "expect": [{ "method": "sendMessage" }] }

// ❌ Does NOT count (empty expect — no assertion):
{ "send": { "text": "/book" }, "expect": [] }

// ❌ Does NOT count (not a command — no bot_command entity added):
{ "send": { "text": "hello" }, "expect": [{ "method": "sendMessage" }] }
```

Commands are **case-sensitive**: `/Book` and `/book` are different. grammY routes them separately, coverage tracks them separately.

**Coverage report (from GATE verdict):**

```json
{
  "declared": ["book", "cancel", "start"],
  "covered": ["book", "start"],
  "missing": ["cancel"],
  "fraction": 0.666
}
```

`fraction: 1` required for gate pass (unless no commands declared → 1 automatically).

---

## 5. Harness CLI

Invoked via `@agntdev/bot-toolkit` CLI:

```
AGNTDEV_BOT_MODULE=./src/index.ts      # module exporting makeBot()
AGNTDEV_SPECS_FILE=./specs.json         # JSON array of BotSpec
AGNTDEV_COMMANDS_FILE=./commands.json   # string[] of declared commands (optional)
AGNTDEV_GATE_NONCE=abc123               # nonce for verdict auth
```

### Full example: booking bot specs

```json
[
  {
    "name": "/start greets user",
    "steps": [
      { "send": { "text": "/start" }, "expect": [{ "method": "sendMessage", "payload": { "text": "Welcome!" } }] }
    ]
  },
  {
    "name": "/book flow",
    "steps": [
      { "send": { "text": "/book" }, "expect": [{ "method": "sendMessage", "payload": { "text": "Choose a service:" } }] },
      { "send": { "callback": "select:cut" }, "expect": [{ "method": "editMessageText", "payload": { "text": "Pick a time:" } }] },
      { "send": { "callback": "slot:14:00" }, "expect": [{ "method": "editMessageText", "payload": { "text": "Booked!" } }] }
    ]
  },
  {
    "name": "/cancel flow",
    "steps": [
      { "send": { "text": "/cancel" }, "expect": [{ "method": "sendMessage" }] },
      { "send": { "callback": "confirm:cancel:yes" }, "expect": [{ "method": "editMessageText", "payload": { "text": "Cancelled." } }] }
    ]
  }
]
```

---

## Quick Reference

| Concept | Implementation |
|---|---|
| Bot factory | `export function makeBot()` — fresh bot per spec |
| No network | Capture transformer + fake botInfo |
| Synthetic input | `{ text: "/cmd" }`, `{ callback: "data" }`, `{ update: {...} }` |
| Expected output | `{ method: "sendMessage", payload: { text: "Hi" } }` (deep subset) |
| Verdict | `GATE:<nonce>:{"ok":bool, ...}` on stdout |
| Coverage | Every declared command needs >= 1 non-empty expect spec |

---

## Common mistakes

1. **Empty `expect[]` on command send** — inflates coverage but asserts nothing. Harness rejects it.
2. **Forgetting `answerCallbackQuery`** — subsequence matching hides this, but real users see stuck spinner.
3. **`strict: true` without including incidental calls** — almost every callback handler fires `answerCallbackQuery`. Include it in expect if strict.
4. **Relying on session across specs** — harness creates fresh bot per spec. Session starts from `initial()` each time.
5. **Not declaring all commands** — coverage gate uses the declared list. Handler without spec = gate fails.
6. **Case mismatch** — `/Book` declared, spec sends `/book` → different commands in coverage.

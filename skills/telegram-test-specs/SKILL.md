---
name: telegram-test-specs
description: >
  Use when writing dialog test specs for a memedev bot.
  Covers BotSpec JSON format, SendShorthand, ExpectedCall,
  ordered-subsequence matching, command coverage rules, and the test harness CLI.
  Tests are the objective review gate — they must pass for the bot to publish.
  Triggers: write bot tests, dialog specs, harness, command coverage.
compatibility: Requires @memedev/bot-toolkit test harness.
license: MIT
---

# telegram-test-specs Skill

How to write dialog test specs for a memedev bot. Tests are the objective review gate — all specs must pass AND every declared command must have >= 1 meaningful spec for the bot to publish.

## BotSpec format

A spec file (`tests/specs/<name>.json`) is a JSON object:

```json
{
  "name": "start command shows welcome",
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
| `name` | `string` | yes | Unique human-readable name |
| `strict` | `boolean` | no | Default `false`. If `true`, exact call count + positional match |
| `steps` | `SpecStep[]` | yes | Ordered sequence of user actions + expected bot responses |

---

## SpecStep

Each step has a `send` (what the user does) and `expect` (what the bot should respond).

### SendShorthand

Three variants:

```jsonc
// 1. Text message (commands auto-detect, get bot_command entity)
{ "send": { "text": "/start" } }
{ "send": { "text": "/book", "chatId": 42, "userId": 99 } }

// 2. Callback button tap
{ "send": { "callback": "menu:book", "messageId": 100 } }

// 3. Raw grammY Update (advanced)
{ "send": { "update": { ... } } }
```

- `chatId` defaults to `1`, `userId` defaults to `1`
- `/command` text automatically gets a `bot_command` entity added so grammY's command router matches
- Callback queries include the original message so handlers can `editMessageText`

### ExpectedCall

```jsonc
{ "method": "sendMessage", "payload": { "text": "Welcome!" } }
{ "method": "editMessageText" }  // payload omitted → only assert method was called
{ "method": "answerCallbackQuery" }
```

- `payload` is matched as a **deep subset** — you assert `text` without pinning `chat_id`, `message_id`, etc.
- Omit `payload` entirely to only assert the method was called
- Common methods: `sendMessage`, `editMessageText`, `editMessageReplyMarkup`, `answerCallbackQuery`, `sendPhoto`

---

## Matching modes

### Subsequence (default, `strict: false`)

Every expected call must appear **in order**, but **incidental extra calls are allowed**. Example: a handler that calls both `answerCallbackQuery` (incidental) and `editMessageText`:

```json
{
  "send": { "callback": "menu:next" },
  "expect": [
    { "method": "editMessageText", "payload": { "text": "Page 2" } }
  ]
}
// pass — answerCallbackQuery happened but wasn't required
```

### Strict (`strict: true`)

Exact call count + positional match. Use when "and nothing else" matters:

```json
{
  "strict": true,
  "steps": [
    { "send": { "callback": "menu:next" }, "expect": [
      { "method": "editMessageText" }
    ] }
  ]
}
// fail — answerCallbackQuery occurred but wasn't in expect[]
```

**Recommendation:** Use subsequence (default) for most specs. Use strict only for targeted assertions.

---

## Command coverage rules

The Tests gate checks: **every command in the Details state-machine must have >= 1 meaningful spec exercising it.**

A spec is "meaningful" for a command when:
1. The `send` step contains a `/command` text
2. That step's `expect[]` has >= 1 entry (it actually asserts something)

```jsonc
// Counts toward coverage:
{ "send": { "text": "/book" }, "expect": [{ "method": "sendMessage" }] }

// Does NOT count (empty expect — no assertion):
{ "send": { "text": "/book" }, "expect": [] }

// Does NOT count (not a command):
{ "send": { "text": "hello" }, "expect": [{ "method": "sendMessage" }] }
```

Commands are **case-sensitive**: `/Book` and `/book` are different commands. GrammY routes them separately.

---

## Test harness CLI

The harness is invoked via `@memedev/bot-toolkit` CLI with env vars:

```
MEMEDEV_BOT_MODULE=./src/index.ts      # path to module exporting makeBot()
MEMEDEV_SPECS_FILE=./specs.json         # JSON array of BotSpec
MEMEDEV_COMMANDS_FILE=./commands.json   # string[] of declared commands (optional)
MEMEDEV_GATE_NONCE=abc123               # nonce for gate verdict auth
```

### Gate verdict (stdout)

```
GATE:<nonce>:{"ok":true|false,"total":N,"passed":N,"failed":N,"coverage":{...},"results":[{name,ok}...]}
```

- `ok: true` — all specs green AND all declared commands covered
- `ok: false` — at least one spec failed OR a command has no meaningful coverage
- Exit code `0` always (verdict is in JSON; non-zero means harness itself broke)

### Coverage report

```json
{
  "declared": ["book", "cancel", "start"],
  "covered": ["book", "start"],
  "missing": ["cancel"],
  "fraction": 0.666
}
```

- `fraction: 1` required for gate to pass (unless no commands declared → 1 automatically)

---

## Example: full booking bot spec

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

## Common mistakes

1. **Empty `expect[]` on a command send** — inflates coverage but asserts nothing. Harness rejects it for coverage counting.
2. **Forgetting `answerCallbackQuery`** — tests with subsequence matching still pass (it's incidental), but production users see stuck spinner.
3. **`strict: true` without accounting for incidental calls** — almost every callback handler fires `answerCallbackQuery`. Include it in expect if using strict mode.
4. **Relying on session across specs** — harness creates fresh bot per spec. Session starts from `initial()` each time.
5. **Not declaring all commands** — the coverage gate checks the declared list. A command handler with no spec fails the gate.
6. **Case mismatch** — `/Book` declared but spec sends `/book` → coverage check treats them as different commands.

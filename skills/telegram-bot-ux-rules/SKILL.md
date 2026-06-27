---
name: telegram-bot-ux-rules
description: >
  Shape the strings and timings a Telegram bot shows the user
  (microcopy, error UX, loading UX, media UX, chat-type UX,
  performance budgets). USE FOR: microcopy, button label, error
  message, loading state, sendChatAction, typing indicator,
  has_spoiler, sendPhoto, privacy mode, message_thread_id,
  performance budget, throttle, edits per minute, bot copy,
  error UX, loading UX — even if the user doesn't say "UX" or
  "error" explicitly. DO NOT USE FOR: flow patterns (see
  telegram-bot-flow-patterns), onboarding (see
  telegram-bot-onboarding), anti-patterns (see
  telegram-bot-anti-patterns), keyboard wiring (see telegram-bot-ui).
  Triggers: microcopy, button label, error message, loading state, sendChatAction, typing indicator, has_spoiler, sendPhoto, privacy mode, message_thread_id, performance budget, throttle, edits per minute, bot copy, error UX, loading UX.
compatibility: works with grammY + agntdev toolkit sessions.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, ux, microcopy, error-ux, loading-ux, media, chat-type, performance]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-ui
    - telegram-bot-flow-patterns
    - telegram-bot-onboarding
    - telegram-bot-anti-patterns
---

# telegram-bot-ux-rules Skill

The strings and timings a Telegram bot shows the user — microcopy, error UX, loading UX, media UX, chat-type UX, performance budgets. For flow patterns, see [telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md). For onboarding + Mini App graduation, see [telegram-bot-onboarding](../telegram-bot-onboarding/SKILL.md). For anti-patterns, see [telegram-bot-anti-patterns](../telegram-bot-anti-patterns/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the build loop.

---

## 1. Microcopy — what to SAY

### Button labels

| Rule | Bad | Good |
|---|---|---|
| Verb-first (action the user is about to take) | "Confirmation" | "✅ Confirm booking" |
| Sentence case | "Book A Slot" | "Book a slot" |
| ≤ 24 chars (mobile-safe) | "📅 See all my upcoming reservations" | "📅 My bookings" |
| Emoji budget ≤ 1 per button, never on cancel | "❌ ❌ Cancel ❌" | "Cancel" |
| No question marks in button labels | "Confirm?" | "Confirm" |
| No truncation markers (`...`) | "📅 Book a slo…" | "📅 Book slot" |
| Numbers in callback_data, not in label | "Book slot #3" | "Book slot" + callback `slot:3` |

**Emoji rules:**
- Use emoji to **disambiguate** (📅 = schedule, 💬 = chat, ⚙️ = settings), not to decorate.
- One emoji per button max. Two max on a primary CTA.
- Cancel / destructive actions: **plain text, no emoji.** Cancel is the boring escape hatch; decoration reads as "this is a feature, try it."
- Destructive confirmations get one strong emoji: "🗑 Delete" / "🔥 Remove".

### Message body

- **Sentence case**, not Title Case ("Welcome to Bookings." not "Welcome To Bookings.").
- **One sentence per line** for multi-step instructions. Telegram renders line breaks literally.
- **Lead with the result**, not the action: "✅ Booked for 14:00." not "I have completed your booking request successfully."
- **No walls of text.** If the message scrolls on mobile, rewrite. Cap at ~6 lines for the hero, link to detail with a button instead.
- **Empty state always exists.** "No bookings yet — tap 📅 to add one." Never silent for new users.

### Reply-keyboard prompts

Set `input_field_placeholder` — always. Examples:

- "Type or tap…"
- "Send your address…"
- "Pick a date: 2026-06-19"

User sees this hint in the input field. Without it, the input field is empty and users freeze.

### Sequences and onboarding

- **Easy exit** always: include "Stop" button or instructions like "Reply STOP to pause".
- **Frequency caps**: no more than 1 automated message per 12 hours per user unless they replied.
- **Quiet hours**: don't follow up at night in the user's timezone.
- **Light personalization**: avoid repeated identical messages; vary slightly.

---

## 2. Error UX — what to show vs log

### `bot.catch()` boundary — what's the minimum?

```ts
bot.catch((err) => {
  const ctx = err.ctx;
  // 1. Log the FULL error to your backend (with stack, request id)
  console.error("[bot error]", { update_id: ctx.update.update_id, err });

  // 2. Try to tell the user something — but only if you can
  if (ctx?.reply) {
    ctx.reply("Something went wrong. Try again or /cancel.").catch(() => {});
  }
});
```

**Never** reply with `err.message` or `err.stack` — leaks internals,
scares users, helps attackers.

### Error message rules

| Rule | Bad | Good |
|---|---|---|
| Say what went wrong in plain language | "Internal server error (500)" | "Couldn't book that slot — it was just taken. Try another time?" |
| Suggest the next step | "Error" | "Try again" / "Pick a different slot" / "Reply /help" |
| Don't apologize repeatedly | "We're so sorry for the inconvenience this has caused…" | "Couldn't reach the booking service. Try again in a moment." |
| Match the urgency | "CRITICAL FAILURE: DB CONNECTION LOST" | "Booking is temporarily unavailable." |
| One apology per error max | "Sorry, but unfortunately it seems that…" | "Couldn't load your bookings. Pull to retry?" |

### Specific error patterns

**Telegram rate limit (429 with `retry_after`):**
- Don't surface to user. Auto-retry with backoff (grammY middleware does this).
- If retry budget exhausted, reply: "Slow down a sec — try again in 5s."

**User blocked the bot (403):**
- Stop messaging that user. Add to local "blocked" set. Don't retry.
- Surface in admin metrics, not user-facing.

**Message not modified (400):**
- Swallowed silently. Caused by `editMessageText` with identical text. Don't spam new messages; log it.

**Message too old to edit (>48h):**
- Wrap `editMessageText` in try/catch; fall back to `ctx.reply()` with the new content. Log the fallback.

**Network down (`HttpError`):**
- `bot.catch()` logs; user sees nothing during the outage. After recovery, the next user action retries automatically.

**Stuck state (user in `awaiting_X` with no input):**
- Flow timeout sweeper resets `ctx.session.step = "idle"`. Reply: "Flow timed out. Tap /start to begin again."

---

## 3. Loading UX — when the bot is "thinking"

### Three options, in order of preference

**Option 1: Do nothing (best for fast ops <500ms)**

If your handler completes in <500ms, just `await` and reply. No
loading state needed. The user sees the result immediately.

```ts
// ✅ Just reply — fast enough
bot.command("count", async (ctx) => {
  const n = await db.count();
  await ctx.reply(`Count: ${n}`);
});
```

**Option 2: `sendChatAction("typing")` (for 500ms–3s ops)**

Sends the "typing..." indicator at the top of the chat. Bot is "alive
but working." User sees feedback without a new message.

```ts
bot.command("search", async (ctx) => {
  await ctx.replyWithChatAction("typing");
  const results = await slowSearch(ctx.message.text);
  await ctx.reply(formatResults(results));
});
```

**Option 3: Send "Loading…" then `editMessageText` (for 3s+ ops)**

Send a placeholder message immediately, edit it when done.

```ts
bot.command("generate", async (ctx) => {
  const placeholder = await ctx.reply("⏳ Generating…");

  const result = await llmGenerate(prompt);  // takes 5–30s

  await ctx.api.editMessageText(ctx.chat.id, placeholder.message_id, result);
});
```

**Streaming AI replies (Bot API 10.1, best for LLM flows):**

Use `sendRichMessageDraft` to update a draft in place — see
[telegram-bot-api-rich-messages](../telegram-bot-api-rich-messages/SKILL.md)
§1.

```ts
bot.command("ask", async (ctx) => {
  const draft = await ctx.api.sendRichMessageDraft(ctx.chat.id, {
    rich_message: { blocks: [{ type: "RichBlockThinking", text: "…" }] },
  });

  for await (const token of llmStream(ctx.message.text)) {
    draft.blocks.push({ type: "RichBlockParagraph", text: { type: "RichTextText", text: token } });
    await ctx.api.sendRichMessageDraft(ctx.chat.id, {
      rich_message: draft,
      draft_id: draft.draft_id,
    });
  }

  await ctx.api.sendRichMessage(ctx.chat.id, { rich_message: draft });
});
```

### Throttling rules

- **Edits per message: unbounded** (within reason). User sees smooth updates.
- **Edits per bot per minute: ≤30 globally.** Telegram throttles more aggressively. Don't use `editMessageText` in a tight loop across many users — coalesce updates.
- **`sendChatAction` expires in 5s.** Re-send for long ops.

---

## 4. Media UX — when photo vs doc vs text

### Decision tree

```
Need to show an image?
├── Will user zoom in / save the original? → sendPhoto (compressed inline)
├── Need pixel-perfect / PDF / file? → sendDocument
└── Both? → sendPhoto, then offer "📄 Get original" → sendDocument

Need to deliver a file?
├── Audio for voice messages? → sendVoice (OGG/MP3, plays inline)
├── Music with metadata? → sendAudio (MP3 with artist/title)
├── Long video with sound? → sendVideo
├── Short round video? → sendVideoNote
└── Other (PDF, ZIP, JSON, CSV)? → sendDocument

Need to ask for location/contact?
├── Single point? → sendLocation
├── Named place? → sendVenue
├── Phone / email? → sendContact (or custom keyboard with RequestContact)
└── User picks on a map? → ReplyKeyboardMarkup with request_location: true
```

### Caption rules

- Caption ≤ **1024 chars** (Bot API 9.x). Truncate before send if longer.
- Plain text length, not HTML length. Always measure plain text first.
- **Lead with the most important info** — captions get cut on small screens.
- Use `parse_mode: "HTML"` for emphasis (default — see basics §5).

### Batches

For 2–10 related media (album, step-by-step photos, before/after):

```ts
await ctx.replyWithMediaGroup([
  { type: "photo", media: fileId1, caption: "Before" },
  { type: "photo", media: fileId2, caption: "After" },
]);
```

- Items appear as a single "album" message in the chat.
- Only first item gets a caption (others use `caption` field too — Telegram concatenates).
- Don't mix photo+video unless you mean to (mixed albums render awkwardly).

### `has_spoiler`

For sensitive content (giveaways, plot reveals, surprise photos):

```ts
await ctx.replyWithPhoto(fileId, { has_spoiler: true });
```

User sees a blurred preview; tap to reveal.

### Paid media (Bot API 10.1)

For premium content behind Stars paywalls:

```ts
await ctx.api.sendPaidMedia(ctx.chat.id, {
  star_count: 10,
  media: [{ type: "photo", media: fileId }],
  caption: "Premium photo pack",
});
```

Use only when you've graduated past Mini App — paid flows need real
state, idempotency, and refund handling.

---

## 5. Chat-type UX — group vs private behavior

### Private chat (the easy case)

Full features, no restrictions. Use every UX pattern in this skill.

### Group chat (privacy mode rules)

By default, Telegram **only delivers messages to a group bot that**:

- Start with `/` (a command)
- Mention the bot by username
- Are replies to the bot's own message
- Are service messages (member joins, etc.)

**Implication:** if your bot promises to "greet every new member" or
"remind the channel every day," it **can't see those events** unless
the owner disables privacy mode in BotFather (`/setprivacy` →
Disable). Always check `botInfo.can_read_all_group_messages` before
promising ambient group behavior.

```ts
export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, { initial: () => ({ step: "idle" }) });

  // Warn at startup if a group bot has privacy mode on
  if (!bot.botInfo.can_read_all_group_messages) {
    console.warn("[bot] Privacy mode is ON — bot only sees commands, mentions, replies in groups.");
  }

  // ... handlers ...
  return bot;
}
```

### Topics in supergroups

Supergroups with **Topics enabled** split conversation into threads.
Each `Message` has a `message_thread_id`. **Always reply in the same
thread**, otherwise your message lands in General and breaks the flow:

```ts
bot.on("message", async (ctx) => {
  await ctx.reply("Reply in same topic", {
    message_thread_id: ctx.message?.message_thread_id,
  });
});
```

### Channel (broadcast only)

Bots in channels are admin-only. They post on behalf of the channel,
never receive messages from users. Use channels for **announcements**
(signal channel); use a group with the bot as admin for **discussion**.

### Guest Mode (Bot API 10.0)

Bots can now reply in **chats they're not a member of** if the
calling user opts in. Use `answerGuestQuery`. Pattern: "comment bot"
that listens to public channels and replies in DMs.

### Group UX rules

| Rule | Why |
|---|---|
| Never spam ambient messages | Privacy mode hides them anyway; users who see them find it annoying |
| Always answer in the same topic | Otherwise conversation fragments |
| Respect slowmode | Group admins set it for a reason |
| Don't pin messages without admin | API rejects it |
| Don't quote-reply aggressively | Pollutes the chat |

---

## 6. Performance budgets — what users feel

| Budget | Source |
|---|---|
| **300ms** tap-to-edit response | UX guideline (Telegram bot UX best-practice; see grammY UX guide) |
| **≤ 5 rows** before iOS keyboard scrolls | Telegram client |
| **≤ 4 columns** on Telegram Desktop | Qt 54px/button, 530px cap; `resize_keyboard` ignored |
| **≤ 30 edits/min** globally per bot | Telegram throttling |
| **`answerChatAction` expires in 5s** | Telegram client |
| **Inline keyboards: max 8 rows, 100 buttons** | `telegram-bot-api-fundamentals` §4 |
| **`callback_data` ≤ 64 bytes** | `telegram-bot-api-fundamentals` §4 |

Violating these is not subjective — users **feel** the lag, the scroll,
the demotion ("Too few answers to callback queries" is a real platform
metric).

---

## Quick Reference

| Concern | Rule |
|---|---|
| Button label | Verb-first, sentence case, ≤24 chars, ≤1 emoji |
| Message body | Lead with result, ≤6 lines on hero |
| Cancel button | Plain text, no emoji |
| Error reply | "Couldn't X. Try Y." — never `err.message` |
| Stuck state | Sweep after 5min idle, message user |
| Loading <500ms | Just reply |
| Loading 500ms–3s | `sendChatAction("typing")` |
| Loading 3s+ | Placeholder + `editMessageText` |
| Loading LLM | `sendRichMessageDraft` (Bot API 10.1) |
| Media caption | ≤1024 chars, lead with key info |
| Group ambient | Requires `can_read_all_group_messages = true` in BotFather |
| Topic reply | Always pass `message_thread_id` |

---

## Cross-references

- `telegram-bot-api-fundamentals` — grammY, ctx, parse_mode, limits
- `telegram-bot-api-rich-messages` — Rich Messages, Checklists, sendPaidMedia
- `telegram-bot-ui` — `inlineButton`, `menuKeyboard`, ForceReply, RequestContact
- `telegram-bot-flow-patterns` — wizard / branching / search / undo / checklist / streaming
- `telegram-bot-onboarding` — /start hero, empty state, Mini App graduation
- `telegram-bot-anti-patterns` — 20 don'ts + UX review checklist
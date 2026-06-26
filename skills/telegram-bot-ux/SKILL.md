---
name: telegram-bot-ux
description: >
  Use when designing how a Telegram bot feels to humans — microcopy,
  button labels, error messages, loading state, welcome flow,
  onboarding, flow patterns (linear wizard / branching menu /
  search-then-pick / multi-step form / undo / checklist / rich
  message / streaming AI), Mini App graduation, performance budgets,
  anti-patterns.
  Does not cover keyboard wiring mechanics (see telegram-bot-ui) or
  Bot API ground truth (see telegram-bot-basics).
  Triggers: bot copy, microcopy, button label, error message, loading
  state, welcome flow, onboarding, undo, mini app, cancel, empty
  state, flow pattern, wizard, anti-patterns, performance budget,
  onboarding, group behavior, chat type UX, checklist flow.
compatibility: works with grammY + agntdev toolkit sessions. No FSM
  library — flows use ctx.session.step (see §6).
license: MIT
---

# telegram-bot-ux Skill

How to make a Telegram bot feel right to humans — copy, flow patterns,
error UX, loading UX, onboarding, anti-patterns, performance budgets.

> ## ⭐ The #1 rule: a NICE bot is TAPPABLE, not typed
> The owner is non-technical and so are their users. The bot must be operable
> by **tapping buttons** — a user should almost never need to remember or type a
> slash command. Concretely:
> - Every top-level feature is a **button on the `/start` main menu**, not a
>   `bot.command(...)`. (In the bot-starter template: `registerMainMenuItem(...)`
>   + a `.callbackQuery(...)` handler — see [telegram-bot-ui](../telegram-bot-ui/SKILL.md).)
> - Reserve slash commands for `/start`, `/help`, and genuine free-form typed
>   input the user already knows how to enter (search query, note, address, date,
>   time, amount). A bot with 10–20 slash commands is a FAILURE for this audience.
> - Never show the user raw IDs, JSON, stack traces, or developer jargon. Always
>   provide an empty state and a plain-language error.
>
> The rest of this skill (microcopy, menus, flows, errors) is in service of that
> rule.

For **how to wire keyboards** (button objects, routing, builders), see
[telegram-bot-ui](../telegram-bot-ui/SKILL.md). For **what Telegram
allows** (limits, parse_mode, entities, Rich Messages, Checklists,
chat types, media), see
[telegram-bot-basics](../telegram-bot-basics/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the
> discovery-and-claim loop. This skill teaches the UX rules and flow
> patterns you apply in your claimed task's implementation.

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
[telegram-bot-basics](../telegram-bot-basics/SKILL.md) §7.

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

Bots can now reply in **chats they're not a member of** if the calling
user opts in. Use `answerGuestQuery`. Pattern: "comment bot" that
listens to public channels and replies in DMs.

### Group UX rules

| Rule | Why |
|---|---|
| Never spam ambient messages | Privacy mode hides them anyway; users who see them find it annoying |
| Always answer in the same topic | Otherwise conversation fragments |
| Respect slowmode | Group admins set it for a reason |
| Don't pin messages without admin | API rejects it |
| Don't quote-reply aggressively | Pollutes the chat |

---

## 6. Flow patterns (session-FSM, no library)

The agntdev bot template does **not** ship an FSM library. We use the
`ctx.session.step` primitive already in
[telegram-bot-sessions](../telegram-bot-sessions/SKILL.md) and
[telegram-bot-basics](../telegram-bot-basics/SKILL.md) §3
(makeBot + Session type).

### 6.1 Five primitives

**P1 — typed step enum (in session shape):**

```ts
type Step =
  | "idle"
  | "menu"
  | "awaiting_name"
  | "awaiting_age"
  | "confirming"
  | "done";

interface Session {
  step: Step;
  // flow data
  name?: string;
  age?: number;
}
```

**P2 — cancel from any step:**

```ts
bot.command("cancel", async (ctx) => {
  ctx.session.step = "idle";
  await ctx.reply("Cancelled. Tap /start to begin again.", {
    reply_markup: { remove_keyboard: true },
  });
});
```

**P3 — per-step handler with input filter:**

```ts
bot.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_name") return next();

  const name = ctx.message.text.trim();
  if (name.length < 2) {
    await ctx.reply("Name too short — try again.");
    return;  // stay in awaiting_name
  }

  ctx.session.name = name;
  ctx.session.step = "awaiting_age";
  await ctx.reply(`Got it, ${name}. How old are you?`, {
    reply_markup: { force_reply: true, input_field_placeholder: "Type your age…" },
  });
});
```

**P4 — flow timeout (sweeper):**

```ts
// In your session shape:
interface Session {
  step: Step;
  expiresAt?: number;  // unix ms
}

// On entering a step:
function enterStep(ctx: BotContext, step: Step, ttlMs = 5 * 60 * 1000) {
  ctx.session.step = step;
  ctx.session.expiresAt = Date.now() + ttlMs;
}

// Global middleware:
bot.use(async (ctx, next) => {
  if (ctx.session.expiresAt && Date.now() > ctx.session.expiresAt) {
    ctx.session.step = "idle";
    ctx.session.expiresAt = undefined;
    await ctx.reply("Flow timed out. Tap /start to begin again.");
  }
  return next();
});
```

**P5 — back / undo button on the current message:**

```ts
bot.callbackQuery(/^back:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "menu";
  await ctx.editMessageText("Main menu:", {
    reply_markup: mainMenuKeyboard(),
  });
});
```

### 6.2 Seven flow patterns

#### Pattern A — Linear wizard

One question at a time, ForceReply markup, session fields per step.

```
/start
  → step: awaiting_name (ForceReply: "Type your name")
  → on text: validate → step: awaiting_age
  → on text: validate → step: confirming (show summary + confirm row)
  → on callback confirm:yes → step: done → reply "Booked!"
  → on callback confirm:no → step: awaiting_name
```

**Pros:** simplest model. Clear progress. Easy to test (one spec per step).
**Cons:** slow for users who know what they want. Use for: sign-up, booking, intake.

#### Pattern B — Branching menu

Entry sends hero + inline menu; tapping a branch sets `step = "branch_X"`.

```ts
bot.command("start", async (ctx) => {
  ctx.session.step = "menu";
  await ctx.reply("What do you want to do?", {
    reply_markup: menuKeyboard([
      { text: "📅 Book", data: "menu:book" },
      { text: "📋 My bookings", data: "menu:my" },
      { text: "❓ Help", data: "menu:help" },
    ]),
  });
});

bot.callbackQuery(/^menu:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const choice = ctx.callbackQuery.data.split(":")[1];
  ctx.session.step = `branch_${choice}` as Step;

  switch (choice) {
    case "book": await startBookingFlow(ctx); break;
    case "my":   await showBookings(ctx);     break;
    case "help": await showHelp(ctx);         break;
  }
});
```

Use for: any bot with multiple distinct user intents.

#### Pattern C — Search-then-pick

Text query → debounce → paginated results → tap → detail.

```ts
bot.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "idle") return next();
  const q = ctx.message.text.trim();
  if (q.length < 2) return next();

  const items = await search(q);  // up to 50
  if (items.length === 0) {
    return ctx.reply(`No results for "${q}". Try different words?`);
  }

  const { pageItems, controls } = paginate(items, { page: 0, perPage: 5 });
  await ctx.reply(`Results for "${q}":`, {
    reply_markup: inlineKeyboard([
      ...pageItems.map(i => [inlineButton(i.name, `pick:${i.id}`)]),
      ...controls.inline_keyboard,
    ]),
  });
});
```

Use for: catalog browse, contact search, lookup tools.

#### Pattern D — Multi-step form with back-stack

Like linear wizard but with `ctx.session.history = []` to support going back:

```ts
interface Session {
  step: Step;
  history: Step[];   // stack of visited steps
}

function pushStep(ctx: BotContext, step: Step) {
  ctx.session.history.push(ctx.session.step);
  ctx.session.step = step;
}

bot.callbackQuery(/^back:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prev = ctx.session.history.pop();
  ctx.session.step = prev ?? "idle";
  // re-render the previous step's UI
});
```

Use for: complex sign-up, multi-page settings, checkout.

#### Pattern E — Undo pattern

User does action → bot does it + shows "↩️ Undo" inline button → button
auto-expires in 30s.

```ts
bot.callbackQuery(/^do:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  await db.delete(id);
  await ctx.editMessageText(`✅ Deleted #${id}`, {
    reply_markup: inlineKeyboard([[
      inlineButton("↩️ Undo (30s)", `undo:delete:${id}`),
    ]]),
  });

  // Schedule undo expiry
  setTimeout(async () => {
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* message edited elsewhere */ }
  }, 30_000);
});

bot.callbackQuery(/^undo:delete:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Restored" });
  const id = ctx.match[1];
  await db.restore(id);
  await ctx.editMessageText(`✅ Restored #${id}`, {
    reply_markup: { inline_keyboard: [] },
  });
});
```

Use for: destructive actions (delete, kick, archive, cancel).

#### Pattern F — Checklist flow (Bot API 9.1)

User sees a native checklist; taps to mark done. State in your DB.

```ts
bot.command("packing", async (ctx) => {
  const items = await db.getPackingList(ctx.from.id);  // [{ id, text, done }]
  await ctx.api.sendChecklist(ctx.chat.id, {
    checklist: {
      title: "Pack for the trip",
      tasks: items.map(i => ({
        id: i.id,
        text: i.text,
        completed: i.done,
      })),
    },
  });
});

// When user marks a task done (incoming update from the message)
bot.on("checklist_task_done", async (ctx) => {
  const taskId = ctx.update.checklist_task_done.task_id;
  await db.markDone(ctx.from.id, taskId);
});
```

State lives in your backend; the message is a render of that state. Use for: todos, packing lists, onboarding steps, group chores.

#### Pattern G — Rich message flow (Bot API 10.1)

Build a structured message with sections, divider, footer. Edit in place.

```ts
bot.callbackQuery(/^book:confirm:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  const slot = await db.getSlot(id);

  await ctx.editMessageText("…", {  // replaced by rich edit below
  });
  await ctx.api.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, {
    rich_message: {
      blocks: [
        { type: "RichBlockSectionHeading", text: { type: "RichTextBold", text: "Confirm booking" } },
        { type: "RichBlockDivider" },
        { type: "RichBlockParagraph", text: [
          { type: "RichTextText", text: "Slot: " },
          { type: "RichTextBold", text: `${slot.date} ${slot.time}` },
        ]},
        { type: "RichBlockParagraph", text: [
          { type: "RichTextText", text: "Service: " },
          { type: "RichTextBold", text: slot.service },
        ]},
        { type: "RichBlockDivider" },
        { type: "RichBlockFooter", text: { type: "RichTextItalic", text: "Reply /cancel to cancel up to 2h before." } },
      ],
    },
    reply_markup: confirmKeyboard(`book:${id}`),
  });
});
```

Use for: confirmations, summaries, status displays. Replaces the
old "wall of bold text" pattern with native structured blocks.

#### Pattern H — Streaming AI flow (Bot API 10.1 `sendRichMessageDraft`)

Send empty draft, update on each token, finalize. See
[telegram-bot-basics](../telegram-bot-basics/SKILL.md) §7 for the
full streaming pattern.

Use for: any LLM-driven response. Replaces "Loading…" placeholders
with smooth streaming UX.

---

## 7. Onboarding — first 30–60 seconds

Onboarding has a **clock**: segment or lose the user. After 60s of
unclear choice, drop-off is steep.

### Step 1: `/start` sends a hero + 3–5 menu buttons

```ts
bot.command("start", async (ctx) => {
  ctx.session.step = "menu";
  await ctx.reply(
    "👋 Welcome to Bookings.\n\n" +
    "What brings you here?",
    {
      reply_markup: menuKeyboard([
        { text: "📅 Book a slot", data: "menu:book" },
        { text: "📋 My bookings", data: "menu:my" },
        { text: "❓ How it works", data: "menu:help" },
      ]),
    },
  );
});
```

**Rules:**
- **Hero ≤ 6 lines.** No walls of text.
- **3–5 buttons max.** More than 5 = decision paralysis.
- **Wording matches user intent.** "Book a slot" not "Schedule resource reservation".
- **Emoji to disambiguate, not decorate.**
- **One primary CTA** (📅 Book) + one secondary (📋 My bookings) + one help escape (❓ How it works).

### Step 2: Branch into the chosen intent

Use Flow Pattern B (Branching menu) from §6.

### Step 3: `/help` always exists

```ts
bot.command("help", async (ctx) => {
  await ctx.reply(
    "📖 How to use this bot:\n\n" +
    "• /start — Main menu\n" +
    "• /book — Book a slot\n" +
    "• /cancel — Cancel a pending flow\n" +
    "• /my — View your bookings\n\n" +
    "Need more help? Reply to this message.",
  );
});
```

### Step 4: Empty state for first-run features

If a feature has no data for this user, **show an empty state, not a silent message**.

```ts
bot.command("my", async (ctx) => {
  const bookings = await db.getBookings(ctx.from.id);
  if (bookings.length === 0) {
    await ctx.reply(
      "📋 You have no bookings yet.\n\n" +
      "Tap 📅 Book to schedule one.",
      {
        reply_markup: inlineKeyboard([[
          inlineButton("📅 Book now", "menu:book"),
        ]]),
      },
    );
    return;
  }
  // ... render bookings list
});
```

### Step 5: Easy exit + frequency caps

For follow-up sequences:

- **Stop button** always on automated messages.
- **Frequency cap**: ≤ 1 automated message per 12h per user unless they replied.
- **Quiet hours**: don't follow up at night in user's timezone.

---

## 8. Mini App graduation — when to upgrade from inline keyboards

Inline keyboards hit a ceiling. Graduate to a **Telegram Mini App**
(embedded web view) when **any** of these thresholds is hit:

| Threshold | Why inline keyboards fail |
|---|---|
| Option list **>50 items** with re-sorts >1/hour | Client cache invalidates; pagination breaks. |
| **Multi-select with Apply** semantics | No native checkbox in inline keyboards — you need a message per toggle. |
| **Compliance audit trail** required | `callback_data` retained only 24h via `getUpdates`. Web App logs instantly to your store. |
| **>4 KB payload** per state | Inline keyboard JSON explodes. Web App streams from your backend. |

When **none** of these apply, **stay on inline keyboards** — they're
cheaper to build, render faster, and don't require web hosting.

### Decision

```
Need >50 items that change frequently?
├── Yes → Mini App
└── No → Inline keyboards
Multi-select with Apply semantics?
├── Yes → Mini App
└── No → Inline keyboards
Need full audit trail of user interactions?
├── Yes → Mini App
└── No → Inline keyboards
Anything else (≤50 items, simple choices, real-time feedback)?
└── Inline keyboards (default)
```

### Web App button

The bridge between inline keyboards and Mini App:

```ts
inlineKeyboard([[
  webAppButton("🛒 Open shop", "https://shop.example.com/twa"),
]])
```

User taps → Mini App opens → user interacts in the embedded web view →
app sends a message back via `sendMessage` on close. Use for: catalog
browse, settings panels, checkout, dashboards.

---

## 9. Performance budgets — what users feel

| Budget | Source |
|---|---|
| **300ms** tap-to-edit response | UX guideline (Telegram bot UX best-practice; see grammY UX guide) |
| **≤ 5 rows** before iOS keyboard scrolls | Telegram client |
| **≤ 4 columns** on Telegram Desktop | Qt 54px/button, 530px cap; `resize_keyboard` ignored |
| **≤ 30 edits/min** globally per bot | Telegram throttling |
| **`answerChatAction` expires in 5s** | Telegram client |
| **Inline keyboards: max 8 rows, 100 buttons** | `telegram-bot-basics` §4 |
| **`callback_data` ≤ 64 bytes** | `telegram-bot-basics` §4 |

Violating these is not subjective — users **feel** the lag, the scroll,
the demotion ("Too few answers to callback queries" is a real platform
metric).

---

## 10. Anti-patterns (15+ don'ts with reasoning)

| # | Don't | Why |
|---|---|---|
| 1 | Send a new message per dialog step | Spams chat. Use `editMessageText` (Pattern A wizard, Pattern B menu). |
| 2 | Use button label as question ("Confirm?") | Buttons are actions. Use verb. |
| 3 | Wall-of-text /start ("Welcome! This bot does X, Y, Z, supports A, B, C…") | Mobile scrolls. Hero + 3-5 buttons max. |
| 4 | Emoji-only keyboards (❌✅🔙🚀🔥 everywhere) | Decoration ≠ clarity. ≤1 emoji/button, none on cancel. |
| 5 | Missing `answerCallbackQuery()` | Spinner never stops. Platform demotes bots with "Too few answers". |
| 6 | Hardcoded `chat_id` in source | Multi-tenant fails. Use `ctx.chat.id`. |
| 7 | No `/help` command | Users get stuck. Always ship /help. |
| 8 | No empty state | New users see nothing. Always show "No X yet — tap Y to start." |
| 9 | Group ambient messages without privacy-mode off | Telegram doesn't deliver them. Users see silence. |
| 10 | Secret-feature discovery (no onboarding menu) | Users can't find features. /start menu shows them. |
| 11 | Editing a message **>48h old** | Returns "message to edit not found" / "message is not modified". Catch and fall back to `ctx.reply()`. |
| 12 | HTML without escaping `<`/`>`/`&` | "Can't parse entities" 400 error. Always `escapeHtml(userInput)`. |
| 13 | `callback_data` with non-ASCII >30 chars | Telegram rejects with `BUTTON_DATA_INVALID` (it's 64 BYTES). |
| 14 | Missing `input_field_placeholder` on reply keyboards | Users see empty input field, freeze. |
| 15 | No `copy_text` button for IDs/addresses/codes | Users long-press to copy; 4 taps wasted. One-tap copy wins. |
| 16 | `bot.catch` replies with `err.message` or `err.stack` | Leaks internals, scares users, helps attackers. |
| 17 | Edit-in-place on a message you don't own | Telegram rejects. Only edit your own bot's messages. |
| 18 | Polling without backoff on `getUpdates` failure | Tight loop hammers the API. Exponential backoff. |
| 19 | "Reply /cancel to stop" without a `/cancel` handler | Dead instruction. Always wire `/cancel`. |
| 20 | Sending media >20MB on official API (or >50MB upload) | Webhook delivery fails. Use local API server or stay under limit. |

---

## 11. UX review checklist

Before you write `agnt task claim` for the next task, run through this.
If any item is "no", the bot isn't done — even if all tests pass.

### Hero & onboarding
1. `/start` shows hero ≤ 6 lines + 3–5 menu buttons (no walls of text).
2. `/help` exists and lists every command.
3. First-run features show empty state, not silent.

### Buttons & copy
4. Every button label is verb-first, sentence case, ≤24 chars.
5. Emoji budget ≤ 1 per button, none on cancel.
6. Destructive actions have explicit confirmation.

### Flow
7. Each dialog updates the same message in place (no message spam).
8. `answerCallbackQuery()` is called on every callback path.
9. `/cancel` works from any step, resets `session.step = "idle"`.

### Errors
10. `bot.catch()` doesn't leak `err.message` / `err.stack` to users.
11. Error messages say what went wrong + suggest the next step.
12. Stuck flows (5min idle) auto-expire with a clear message.

### Limits & parsing
13. `callback_data` ≤ 64 bytes (test in UTF-8 bytes for non-ASCII).
14. Message text ≤ 4096 chars; captions ≤ 1024 (truncate before send).
15. HTML output escapes `<`/`>`/`&` (and `&` first, not last).

### Performance
16. Fast ops (<500ms) skip loading state.
17. Slow ops (3s+) use `sendChatAction("typing")` or `sendRichMessageDraft` for LLM flows.
18. Edits throttled ≤ 30/min globally; iOS keyboards ≤ 5 rows; Desktop ≤ 4 cols.

### Group / chat-type
19. Group bot checks `can_read_all_group_messages`; doesn't promise ambient behavior if off.
20. Supergroup topic replies include `message_thread_id`.
21. Channel bot posts only; never reads user messages.

If any check fails, fix it and re-run. The LLM reviewer will catch
some, but the bot is "done" when it works in the user's hands, not
when the reviewer approves the diff.

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
| Multi-step form | Session-FSM with `ctx.session.step` |
| Undo | "↩️ Undo (30s)" inline button, auto-expire |
| Mini App | Graduate when list >50+resort, multi-select, audit trail, >4KB |

---

## Cross-references

- `telegram-bot-basics` §4 — limits (callback_data 64 bytes, etc.)
- `telegram-bot-basics` §5 — parse_mode (default HTML)
- `telegram-bot-basics` §7 — Rich Messages (Bot API 10.1)
- `telegram-bot-basics` §8 — Checklists (Bot API 9.1)
- `telegram-bot-basics` §9 — Chat types matrix
- `telegram-bot-ui` §1 — keyboard types & limits
- `telegram-bot-ui` §2 — ForceReply, RequestContact/Location/User/Chat
- `telegram-bot-ui` §3 — toolkit builders (`copyTextButton`, `webAppButton`)
- `telegram-bot-sessions` — session shape design (the FSM primitive)
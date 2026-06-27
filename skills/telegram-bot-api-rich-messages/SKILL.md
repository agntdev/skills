---
name: telegram-bot-api-rich-messages
description: >
  Go beyond plain text in a Telegram bot. Covers Rich Messages
  (Bot API 10.1), Checklists (Bot API 9.1), chat types, inline
  button types, media types, and the webhook contract. USE FOR:
  rich message, sendRichMessage, sendRichMessageDraft, streaming
  AI, checklist, chat types, message_thread_id, inline button,
  web_app button, copy_text, sendPhoto, sendDocument, sendPaidMedia,
  webhook, Mini App — even if the user doesn't say "rich" or
  "Telegram" explicitly. DO NOT USE FOR: HTTP / grammY / toolkit
  foundation (see telegram-bot-api-fundamentals), keyboard wiring
  (see telegram-bot-ui), UX rules (see telegram-bot-ux-rules).
  Triggers: rich message, sendRichMessage, sendRichMessageDraft, streaming AI, checklist, sendChecklist, chat types, message_thread_id, inline button, web_app button, copy_text, sendPhoto, sendDocument, sendPaidMedia, webhook, Mini App.
compatibility: Works with grammY + Bot API 10.1 (June 11 2026) and
  9.1 (Checklists). Targets the inlined toolkit at src/toolkit/ in
  the bot-starter template.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, bot-api, rich-messages, checklists, media, webhook]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-ui
    - telegram-bot-ux-rules
    - telegram-bot-deploy
---

# telegram-bot-api-rich-messages Skill

The advanced Telegram Bot API surface — Rich Messages, Checklists, chat types, inline buttons, media, and the webhook contract. For the HTTP/grammY/toolkit foundation, see [telegram-bot-api-fundamentals](../telegram-bot-api-fundamentals/SKILL.md).

> **Built for the agntdev pipeline.** See
> [agnt-cli-builder](../agnt-cli-builder/SKILL.md) for the build loop.
> This skill teaches the bot-building patterns you apply once you
> have a project.

---

## 1. Rich Messages (Bot API 10.1, June 11 2026) — new UX primitive

The biggest Bot API addition in 2026. Bots can now send **structured
messages** with section headings, dividers, footers, tables, expandable
details, embedded media blocks (photo/video/map), and **streaming AI
replies**.

### RichText classes (text formatting as objects)

Instead of `parse_mode`, you compose a `RichMessage` from typed blocks:

```ts
const richMessage = {
  blocks: [
    {
      type: "RichBlockSectionHeading",
      text: { type: "RichTextBold", text: "Booking confirmed" },
    },
    { type: "RichBlockDivider" },
    {
      type: "RichBlockParagraph",
      text: [
        { type: "RichTextText", text: "Your slot: " },
        { type: "RichTextBold", text: "14:00 today" },
      ],
    },
    {
      type: "RichBlockList",
      items: [
        { type: "RichBlockListItem", text: { type: "RichTextText", text: "Service: cut" } },
        { type: "RichBlockListItem", text: { type: "RichTextText", text: "Barber: Alex" } },
      ],
    },
    { type: "RichBlockDivider" },
    {
      type: "RichBlockFooter",
      text: { type: "RichTextItalic", text: "Reply /cancel to cancel up to 2h before." },
    },
  ],
};

await ctx.api.sendRichMessage(chatId, { rich_message: richMessage });
```

### Streaming AI replies (`sendRichMessageDraft`)

For LLM-driven flows. Send an empty draft, update it on each token, finalize:

```ts
// 1. Open an empty draft
const draft = await ctx.api.sendRichMessageDraft(chatId, {
  rich_message: { blocks: [] },
});

// 2. Stream tokens from your LLM, editing the draft in place
for await (const token of llmStream(prompt)) {
  draft.blocks.push({ type: "RichBlockParagraph", text: { type: "RichTextText", text: token } });
  await ctx.api.sendRichMessageDraft(chatId, {
    rich_message: draft,
    draft_id: draft.draft_id,
  });
}

// 3. Finalize — converts the draft into a real message
await ctx.api.sendRichMessage(chatId, { rich_message: draft });
```

`sendRichMessageDraft` is **editable** (acts like an `editMessageText`
for rich content). Use it for any AI/LLM flow — Claude-style "thinking"
blocks (`RichBlockThinking`), structured outputs, anything where you'd
otherwise spam new messages.

### Useful block types

| Block | Purpose |
|---|---|
| `RichBlockParagraph` | Body text (single paragraph). |
| `RichBlockSectionHeading` | H1/H2 visual break. |
| `RichBlockDivider` | Horizontal rule between sections. |
| `RichBlockFooter` | Small grey text under main content. |
| `RichBlockList` + `RichBlockListItem` | Bulleted/numbered lists. |
| `RichBlockBlockQuotation` | Indented quote. |
| `RichBlockPullQuotation` | Large quote with side accent. |
| `RichBlockTable` + `RichBlockTableCell` | Tabular data. |
| `RichBlockDetails` | Collapsible section. |
| `RichBlockMap` | Embedded map. |
| `RichBlockPhoto` / `RichBlockVideo` / `RichBlockAnimation` / `RichBlockAudio` / `RichBlockVoiceNote` | Media blocks (don't need a separate `sendPhoto`). |
| `RichBlockCollage` / `RichBlockSlideshow` | Multi-media blocks. |
| `RichBlockThinking` | "Thinking" indicator (Claude-style). |

**Heads-up:** Rich Messages is **Bot API 10.1** (June 11 2026) — one week
old at time of writing. Some grammY types may lag the spec. If the
types don't compile, declare the object as `any` once and move on;
the wire format is stable.

For flow patterns using rich messages (e.g. confirmation flow with
footer + details block), see
[telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md).

---

## 2. Checklists (Bot API 9.1, July 3 2025) — todos as native UI

Bots can send **checklist messages** — todo-style lists where users
mark items done by tapping. No web app, no inline keyboard hacks.

```ts
// Send a checklist
await ctx.api.sendChecklist(chatId, {
  checklist: {
    title: "Pack for the trip",
    tasks: [
      { id: "1", text: "Passport" },
      { id: "2", text: "Charger" },
      { id: "3", text: "Sunscreen" },
    ],
  },
});

// Mark a task done (from server, e.g. via webhook from your backend)
await ctx.api.editMessageChecklist(chatId, messageId, {
  checklist: {
    tasks: [
      { id: "1", text: "Passport", completed: true },
      { id: "2", text: "Charger" },
      { id: "3", text: "Sunscreen" },
    ],
  },
});
```

**Good for:** shopping lists, packing lists, onboarding checklists,
task trackers, group chores. State lives in your backend (`completedTaskIds`
in your DB); the message is a render of that state.

For the full flow pattern (user checks off items → bot updates session
→ bot renders updated checklist), see
[telegram-bot-flow-patterns](../telegram-bot-flow-patterns/SKILL.md).

---

## 3. Chat types matrix — what works where

| | Private | Group | Supergroup | Channel |
|---|---|---|---|---|
| Inline keyboard | ✅ | ✅ | ✅ | ❌ (no callbacks from channels) |
| Reply keyboard | ✅ | ✅ | ✅ | ❌ |
| `sendMessage` | ✅ | ✅ (privacy-mode gated) | ✅ | ✅ (broadcast only) |
| Bot ambient messages (no mention) | ✅ | ⚠️ **Privacy mode off** | ⚠️ **Privacy mode off** | ❌ |
| Commands without mention | ✅ | ⚠️ **Privacy mode off** | ⚠️ **Privacy mode off** | ❌ |
| Inline queries | ✅ (in any chat) | ✅ (in any chat) | ✅ (in any chat) | ❌ |
| Topics (`message_thread_id`) | n/a | n/a | ✅ | n/a |
| `pinChatMessage` | n/a | ✅ (needs admin) | ✅ | ✅ |
| Slowmode respected | n/a | ✅ | ✅ | n/a |
| `can_read_all_group_messages` | n/a | controls ambient reads | controls ambient reads | ✅ (always reads) |

### Privacy mode in groups — the silent killer

By default, Telegram **only delivers messages to a group bot that**:

- Start with `/` (a command)
- Mention the bot by username
- Are replies to the bot's own message
- Are service messages (member joins, etc.)

If your bot sends ambient messages in a group ("Good morning everyone!"),
**users see them only if the bot has `can_read_all_group_messages = true`
in BotFather settings AND privacy mode is disabled**. Default is OFF.
For group UX rules, see [telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md) §5.

### Topics in supergroups

Supergroups with **Topics enabled** add a `message_thread_id` field to
every `Message`. Bot handlers must thread their replies back to the
right topic:

```ts
bot.on("message", async (ctx) => {
  const threadId = ctx.message?.message_thread_id;
  await ctx.reply("Reply in same topic", {
    message_thread_id: threadId,  // undefined = General topic
  });
});
```

Without `message_thread_id` on the reply, the bot's message lands in
General and breaks the conversation flow.

### Channels (broadcast)

Bots in channels are admin-only. They post on behalf of the channel,
never receive messages from users (no `from`, no `chat` writes). Use
channels for **announcements** (signal channel); use a group with the
bot as admin for **discussion**.

### Guest Mode (Bot API 10.0, May 8 2026)

Bots can now reply in **chats they're not a member of** if the
calling user opts in. Use `answerGuestQuery` and the new
`guest_message` Update type. Pattern: a "comment bot" that listens to
public channels and replies in DMs without being added to them. Bot API
10.0 also added bot-to-bot communication via username when both bots
opt in.

---

## 4. Inline button types — what's in the `InlineKeyboardButton`

```ts
type InlineKeyboardButton =
  | { text: string; callback_data: string }                           // standard tap → callback
  | { text: string; url: string }                                     // open URL
  | { text: string; switch_inline_query: string }                      // open @bot in current chat
  | { text: string; switch_inline_query_current_chat: string }        // same, query auto-filled
  | { text: string; web_app: { url: string } }                        // open Mini App (Bot API 9.4+)
  | { text: string; login_url: { url: string; ... } }                 // Telegram Login Widget
  | { text: string; copy_text: { text: string } }                      // one-tap copy to clipboard (Bot API 7.x+)
  | { text: string; pay: boolean };                                   // payment button
```

**`copy_text`** is stupidly useful and underused. Builders add a "Your
order ID: ABC-123" text and expect users to long-press to copy. Use a
`copy_text` button instead:

```ts
inlineKeyboard([[
  { text: "📋 Copy order ID", copy_text: { text: orderId } },
  { text: "📦 Track", callback_data: `track:${orderId}` },
]]);
```

For **when to use each** (callbacks for choices, URLs for off-app
destinations, Mini Apps when the flow has grown past keyboard capacity),
see [telegram-bot-onboarding](../telegram-bot-onboarding/SKILL.md)
§2 Mini App graduation.

`pay` is for Telegram Stars payments. Use `createInvoiceLink` from your
backend, then attach the link to a button.

For **how to wire keyboards** (button builders, routing, prefix
conventions), see [telegram-bot-ui](../telegram-bot-ui/SKILL.md).

---

## 5. Media types — when to use which

| Method | When | Limit |
|---|---|---|
| `sendPhoto` | Image, will be displayed inline | 10 MB, ≤10000 px on each side |
| `sendAnimation` | GIF / H.264 / silent video | 50 MB |
| `sendVideo` | Video with sound | 50 MB |
| `sendVideoNote` | Round video message | 50 MB |
| `sendVoice` | Voice message (OGG/MP3) | 50 MB |
| `sendAudio` | Music file with metadata | 50 MB |
| `sendDocument` | Any file the others don't cover | 50 MB |
| `sendLocation` | Single point | n/a |
| `sendVenue` | Named place | n/a |
| `sendContact` | vCard | n/a |
| `sendPoll` | Quiz / multiple-choice | 1–10 options, ≤100 chars each |
| `sendMediaGroup` | Batch of 2–10 media items as one album | mix photo+video ok |
| `sendSticker` | `.webp` or `.tgs` or `.webm` sticker | 500 KB static, 64 KB `.tgs` |
| `sendLivePhoto` (Bot API 10.0) | Photo + short video combined | 10 MB |
| `sendPaidMedia` (Bot API 10.1) | Stars-paid media behind a paywall | per-item Stars price |

**Caption ≤1024 chars** for any media with `caption` field (Bot API
9.x raised it from 1024 to 1024 — same).

### When photo vs document

- **Photo**: rendered inline, compressed automatically. User taps to
  zoom. **Default for any image.**
- **Document**: downloaded as-is, no compression, no inline preview.
  Use for: high-res images users want to keep, PDFs, files.

For UX patterns (captions, batches, spoiler flags), see
[telegram-bot-ux-rules](../telegram-bot-ux-rules/SKILL.md) §4 Media UX.

---

## 6. Webhook contract (deploy basics)

The platform handles your webhook (see
[telegram-bot-deploy](../telegram-bot-deploy/SKILL.md) for full contract).
For ground truth when debugging:

| | Official API | Local API server |
|---|---|---|
| File download max | 20 MB | Unlimited |
| File upload max | 50 MB | 2000 MB |
| HTTPS port | 443, 80, 88, 8443 | any |
| Max connections / bot | 1–100 | 1–100000 |
| URL required | HTTPS with valid cert | HTTP OK on private net |

Webhook payload size limit is not strictly bounded, but updates with
files >20 MB on official API will fail to deliver. For bots handling
large file flows, **prefer `getUpdates` (long polling)** — agntdev's
deploy contract uses polling by default.

---

## Quick Reference

| Rich Message block | When |
|---|---|
| `RichBlockSectionHeading` | Page header |
| `RichBlockDivider` | Section break |
| `RichBlockList` | Bulleted/numbered output |
| `RichBlockFooter` | Small grey footnote |
| `RichBlockTable` | Tabular data |
| `RichBlockDetails` | Collapsible detail |
| `RichBlockThinking` | Streaming LLM "thinking" |

| Chat-type | Key constraint |
|---|---|
| Private | No restrictions |
| Group / Supergroup | Privacy mode by default; opt-out in BotFather |
| Supergroup + Topics | Reply with `message_thread_id` |
| Channel | Admin-only posts, no inbound messages |

| Inline button type | Use for |
|---|---|
| `callback_data` | Tappable choices |
| `url` | Open external link |
| `web_app` | Mini App bridge |
| `copy_text` | One-tap copy ID/code/address |
| `pay` | Telegram Stars payment |

---

## Cross-references

- `telegram-bot-api-fundamentals` — HTTP, grammY, toolkit, limits, parse_mode, entities
- `telegram-bot-ui` — keyboard mechanics, button builders, callback routing
- `telegram-bot-ux-rules` — microcopy, error/loading/media/chat-type UX, performance budgets
- `telegram-bot-flow-patterns` — wizard / branching / search / multi-step / undo / checklist / rich / streaming
- `telegram-bot-onboarding` — onboarding hero + Mini App graduation
- `telegram-bot-deploy` — build / deploy / runtime contract
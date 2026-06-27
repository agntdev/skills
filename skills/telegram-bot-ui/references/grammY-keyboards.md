## 2. grammY — Using Keyboards

### Attaching inline keyboard

```ts
// Inline keyboard — buttons on a message
await ctx.reply("Choose:", {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Option A", callback_data: "pick:a" }],
      [{ text: "Option B", callback_data: "pick:b" }],
    ]
  },
});
```

### Attaching reply keyboard

```ts
// Reply keyboard — persistent buttons replacing user keyboard
await ctx.reply("Main menu:", {
  reply_markup: {
    keyboard: [
      [{ text: "📅 Book" }, { text: "📋 My bookings" }],
    ],
    resize_keyboard: true,
    input_field_placeholder: "Tap a button…",
  },
});
```

### ForceReply for mandatory input

```ts
// Bot asks "send your address" — user sees "Replying to your bot"
await ctx.reply("What's your address?", {
  reply_markup: {
    force_reply: true,
    input_field_placeholder: "Type your address and send…",
    selective: false,
  },
});
```

### Custom keyboard buttons for typed input (Bot API 9.4+ / 9.6+)

Instead of free text, ask the user to share a contact, location, user,
or chat via a single tap:

```ts
// Request contact
await ctx.reply("Share your phone to register:", {
  reply_markup: {
    keyboard: [
      [{ text: "📱 Share phone", request_contact: true }],
      [{ text: "Skip", callback_data: "skip:phone" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

// Request location
await ctx.reply("Tap to share location:", {
  reply_markup: {
    keyboard: [
      [{ text: "📍 Share location", request_location: true }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

// Request a specific user (e.g. for "refer a friend")
await ctx.reply("Pick a friend to invite:", {
  reply_markup: {
    keyboard: [
      [{ text: "👤 Pick user", request_user: {
        request_id: 1,
        user_is_bot: false,  // humans only
      }}],
    ],
    resize_keyboard: true,
  },
});

// Request a specific chat (e.g. for "post to a group")
await ctx.reply("Pick a group to post in:", {
  reply_markup: {
    keyboard: [
      [{ text: "💬 Pick group", request_chat: {
        request_id: 2,
        chat_is_channel: false,
        chat_is_forum: false,
      }}],
    ],
    resize_keyboard: true,
  },
});

// Request a managed bot (Bot API 9.6+)
await ctx.reply("Pick a bot to delegate to:", {
  reply_markup: {
    keyboard: [
      [{ text: "🤖 Pick bot", request_managed_bot: { request_id: 3 } }],
    ],
    resize_keyboard: true,
  },
});
```

When the user taps one of these buttons, the resulting `Message` has
the shared data pre-filled (`contact`, `location`, `user_shared`,
`chat_shared`, `managed_bot_shared`). Handle it explicitly:

```ts
bot.on("message:contact", async (ctx) => {
  if (ctx.session.step === "awaiting_phone") {
    ctx.session.phone = ctx.message.contact.phone_number;
    ctx.session.step = "phone_done";
    await ctx.reply("Got it, thanks!");
  }
});
```

### Handling callback data

```ts
// Exact match
bot.callbackQuery("pick:a", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("You picked A");
});

// Prefix routing (scalable pattern)
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("pick:")) {
    const choice = data.split(":")[1];
    await ctx.editMessageText(`Picked ${choice}`);
  }

  await ctx.answerCallbackQuery();
});
```

> **Regex first-match warning.** When you use `bot.callbackQuery(/^pick:/, ...)`
> or a `bot.on("callback_query:data")` handler with several `if
> (data.startsWith(...))` branches, the order matters: the first
> matching handler wins, and Telegram only delivers one callback
> per tap. Two common bugs:
>
> 1. **Catch-all first.** If you have a generic `data.startsWith(":")`
>    branch BEFORE a specific `data.startsWith("pick:")` branch, the
>    catch-all eats every callback and the specific branch never
>    runs. Put specific prefixes first.
> 2. **Short prefix swallows long prefix.** `data.startsWith("a")`
>    matches `"a:42"` AND `"apple:42"`. Use a delimiter: `"a:"` not
>    `"a"`. Or use full equality + a switch.
>
> Pattern that works: route by `data.split(":")[0] + ":"` (the
> namespaced prefix), not by the first character.

### Edit vs new message in grammY

```ts
// Edit existing message (smooth UX — no message spam)
await ctx.editMessageText("Updated text", { reply_markup: newKeyboard });

// Edit just the keyboard, keep text
await ctx.editMessageReplyMarkup({ reply_markup: newKeyboard });

// Send a new message (keeps history visible)
await ctx.reply("New message");

// Do nothing but stop spinner
await ctx.answerCallbackQuery();
```

> Telegram endorses the edit-in-place pattern explicitly:
> *"To provide a better UX, consider editing your keyboard when the
> user toggles a setting button or navigates to a new page – this is
> both faster and smoother than sending a whole new message and
> deleting the previous one."* — core.telegram.org/bots/features

For **flow patterns that use edit-in-place** (linear wizard, branching
menu, undo, checklist), see
[telegram-bot-ux](../telegram-bot-ux/SKILL.md) §6.

### Callback data pattern

Namespaced prefix keeps routing simple:

```
menu:<action>            — main menu actions
select:<id>              — item selection
confirm:<action>:<id>    — confirmation flow
page:<n>                 — page jump
pg:prev:<n> / pg:next:<n> — paginate helper
```

Mind the 64-byte limit (`telegram-bot-api-fundamentals` §4). For non-ASCII
projects, prefer short prefixes and put the long ID in your own
server-side map keyed by a UUID sent in `callback_data`.

---


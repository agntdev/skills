---
title: DM a user by their Telegram ID (no invite flow)
impact: CRITICAL
impactDescription: bot can't message teammates/members it hasn't met — every prompt, reminder, and digest silently 403s
tags: anti-pattern, multi-user, onboarding, invite, 403
---

## Don't: onboard members by asking for a Telegram user ID

A Telegram bot **cannot initiate a conversation**. `sendMessage(userId, …)`
to someone who has never pressed *Start* on your bot fails with
`403: bot can't initiate conversation with a user`. So a flow like
"owner, type your teammate's Telegram ID and I'll add them" is broken
twice over:

- Numeric Telegram IDs **aren't discoverable** — no Telegram UI shows your
  own ID; nobody knows their teammates' IDs.
- Even with the right ID, the bot **can't DM that person** until they've
  started it. The daily prompt / reminder / digest just 403s — usually
  swallowed by a `try/catch {}`, so it fails *silently*.

```ts
// ❌ Bad — owner types a member's id; the bot can never reach them
bot.callbackQuery("team:add", async (ctx) => {
  ctx.session.step = "awaiting_member_id";
  await ctx.editMessageText("Send the Telegram user ID of the member to add.");
});
bot.on("message:text").filter(s => s.session.step === "awaiting_member_id", async (ctx) => {
  const userId = Number(ctx.message.text);
  await saveMember(teamId, { telegramId: userId, optIn: true });
  try { await ctx.api.sendMessage(userId, "Welcome!"); } catch {} // 403, swallowed
});
```

## Do: invite by deep link or join code, capture the chat on join

Have the owner share an **invite** — a deep link or a short code — and let
the invitee open the bot. The `/start` payload (or the typed code) is the
moment you learn their chat id and record consent (opt-in):

```ts
// Owner gets a shareable link (Telegram passes the payload to /start)
const inviteLink = `https://t.me/${ctx.me.username}?start=join_${team.code}`;

// The invitee taps it → /start with payload → NOW you have ctx.from + ctx.chat
bot.command("start", async (ctx) => {
  const payload = ctx.match;                       // e.g. "join_AB12"
  const code = payload?.startsWith("join_") ? payload.slice(5) : undefined;
  if (code) {
    await joinTeam(code, {
      telegramId: ctx.from!.id,
      name: ctx.from!.first_name,
      dmChatId: ctx.chat.id,                        // <-- the only way to DM them later
      optIn: true,
    });
    await ctx.reply(`✅ You've joined ${teamName}. You'll get the daily standup here.`);
  }
});
```

Then **guard every later DM** so one member who blocked the bot doesn't
abort the whole broadcast:

```ts
for (const m of await optedInMembers(team)) {
  try {
    await bot.api.sendMessage(m.dmChatId, prompt);
  } catch (e) {
    // 403 (never started / blocked) — skip them, keep going; don't crash the loop
  }
}
```

**Rule of thumb:** the bot may only message a chat id it captured from an
update that user/chat sent. Invite links and join codes exist precisely so
the user takes that first action. Never type a stranger's id.

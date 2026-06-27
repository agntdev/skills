---
title: getUpdates polling without backoff
impact: HIGH
impactDescription: tight loop hammers the API, gets you rate-limited / banned
tags: anti-pattern, polling, getUpdates, rate-limit
---

## Don't: poll getUpdates in a tight loop on failure

A naive `while (true) { await getUpdates(); }` that retries
immediately on network errors hammers the API. Telegram rate-limits
aggressive pollers (often within seconds), then your bot is offline
until the cooldown passes — or worse, your bot token is flagged.

## Do: use grammY's built-in long polling, or exponential backoff

If you're using grammY (which you should — see
[telegram-bot-api-fundamentals](../../telegram-bot-api-fundamentals/SKILL.md)),
`bot.start()` already does long polling correctly with exponential
backoff on transient errors. Don't write your own poller.

If you must write your own (rare):

```ts
// ❌ Bad — tight loop, no backoff
async function poll() {
  while (true) {
    try {
      const updates = await api.getUpdates({ offset, timeout: 30 });
      // ... process ...
      offset = updates[updates.length - 1].update_id + 1;
    } catch (err) {
      // no sleep — hammers API
    }
  }
}

// ✅ Good — exponential backoff with cap
let backoffMs = 1000;
const MAX_BACKOFF = 60_000;

async function poll() {
  while (true) {
    try {
      const updates = await api.getUpdates({ offset, timeout: 30 });
      backoffMs = 1000;  // reset on success
      // ... process ...
      offset = updates[updates.length - 1].update_id + 1;
    } catch (err) {
      console.warn(`[poll] error, backing off ${backoffMs}ms`, err);
      await new Promise(r => setTimeout(r, backoffMs));
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
    }
  }
}
```

For the agntdev deploy contract, the platform runs your bot under
Docker with grammY long polling by default — you don't write the
poller. See
[telegram-bot-deploy](../../telegram-bot-deploy/SKILL.md).
---
title: Sending media >20MB on official API
impact: HIGH
impactDescription: webhook delivery fails, file never arrives
tags: anti-pattern, media, webhook, limits
---

## Don't: send >20MB media on the official Telegram API

The official Telegram Bot API limits webhook file delivery to
**20 MB download / 50 MB upload**. Updates containing larger files
fail to deliver — your bot never sees them. If you receive files via
webhook and try to `getFile` on a file_id >20MB, the download URL
rejects the request.

The agntdev deploy contract uses **long polling by default** for
exactly this reason — webhook delivery is unreliable for large file
flows. If you need to handle files >20MB:

1. Use long polling (the agntdev default)
2. Or run a Local API server (unlimited file size)
3. Or compress / chunk the file before sending

## Do: stay under the limits or run a Local API server

```ts
// ❌ Bad — 25 MB video on official API, webhook delivery fails
await ctx.replyWithVideo({
  source: fs.createReadStream("./big-video.mp4"),  // 25 MB
});

// ✅ Good — stay under 20 MB, or use file_id of an already-uploaded file
await ctx.replyWithVideo({
  url: "https://example.com/small-video.mp4",  // <20 MB
});

// ✅ Also good — for paid media behind Stars (Bot API 10.1)
await ctx.api.sendPaidMedia(ctx.chat.id, {
  star_count: 50,
  media: [{ type: "video", media: fileId }],  // already-uploaded file
});
```

Limits summary:

| Operation | Official API | Local API server |
|---|---|---|
| Webhook file download | 20 MB | Unlimited |
| Webhook file upload | 50 MB | 2000 MB |
| HTTPS ports | 443, 80, 88, 8443 | any |
| Webhook max connections / bot | 1–100 | 1–100000 |

Full limits in
[telegram-bot-api-fundamentals](../../telegram-bot-api-fundamentals/SKILL.md)
§4 and
[telegram-bot-api-rich-messages](../../telegram-bot-api-rich-messages/SKILL.md)
§5 (webhook contract).
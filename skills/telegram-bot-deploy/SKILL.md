---
name: telegram-bot-deploy
description: >
  Use when making an agntdev bot repo deployable, debugging why a deployed
  bot won't start, or deciding what build/deploy files to commit.
  Triggers: deploy bot, production ready, deploy pipeline, entry point,
  dist/main.js, BOT_TOKEN_FILE, REDIS_URL, redis, session storage, Dockerfile,
  fly.io, docker compose, VPS, bot container, container_state, bot won't
  start, crash loop.
compatibility: Node 20+, npm. No deploy credentials needed — the platform builds and deploys for you.
license: MIT
---

# telegram-bot-deploy Skill

How the agntdev platform deploys your bot repo — and exactly what the repo
must (and must not) contain for that to work.

> **Built for the agntdev pipeline.** Use [agnt-cli-builder](../agnt-cli-builder/SKILL.md)
> for the claim loop and [telegram-bot-basics](../telegram-bot-basics/SKILL.md)
> for bot-building patterns. This skill covers the deploy contract only.

---

## 1. How Deployment Works (you don't deploy — the platform does)

There is **no deploy step for you to write**. No Dockerfile, no GitHub Actions
deploy workflow, no flyctl, no SSH. The platform:

1. Clones the project repo at the default-branch HEAD SHA.
2. **Generates its own Dockerfile** (your repo's Dockerfile, if any, is ignored):

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
COPY .agntdev-bot-toolkit.tgz* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

3. Pushes the image to a registry and starts a **long-polling container**
   on Fly.io (256 MB) or a platform VPS via docker compose (512 MB).
4. Injects the BotFather token (secret) and `REDIS_URL` at runtime. The
   token is never in the repo, the image, or the build log.

Everything you control lives in `package.json` and your source tree.

**MVP stack is fixed: Node.js + grammY + Redis.** No SQL, no SQLite, no
ORM — SQL support comes post-MVP.

## 2. The Build Contract

Your repo MUST satisfy all four, or the deploy fails:

| Requirement | Detail |
|---|---|
| `package.json` at repo root | Build aborts without it (`cloned repo has no package.json`) |
| `build` script | `npm run build` runs inside the image; a missing script fails the build |
| `dist/main.js` after build | The container runs exactly `node dist/main.js` — not `dist/index.js`, not `npm start` |
| Builds on Node 20 | Image is `node:20-slim` (glibc). Don't require Node 21+ features |

Strongly recommended:

- **Commit `package-lock.json`** — gets you reproducible `npm ci` instead of `npm install`.
- **Keep the committed `.agntdev-bot-toolkit.tgz`** if the project uses
  `@agntdev/bot-toolkit` (pinned `file:` dependency; makes install self-contained).
  `.gitignore` already whitelists it — don't remove that line.

Typical `package.json` + `tsconfig.json` shape:

```jsonc
// package.json
{
  "main": "dist/main.js",
  "scripts": { "build": "tsc -p tsconfig.json" },
  "engines": { "node": ">=20" }
}
// tsconfig.json: "outDir": "dist", "rootDir": "src" — and your entry is src/main.ts
```

Plain-JS project? The `build` script still must exist and must produce
`dist/main.js` (e.g. `"build": "mkdir -p dist && cp -r src/* dist/"` with
`src/main.js` as entry).

Note `RUN npm run build` happens **before** `ENV NODE_ENV=production`, so
devDependencies (typescript etc.) are installed and available at build time.

## 3. The Runtime Contract

### Token: support BOTH `BOT_TOKEN` and `BOT_TOKEN_FILE`

The two engines inject the token differently:

| Engine | Injection |
|---|---|
| Fly.io | `BOT_TOKEN` env var (Fly secret) |
| VPS docker compose | `BOT_TOKEN_FILE=/run/secrets/bot_token` (file path, 0600) |

Reading only `process.env.BOT_TOKEN` **crashes on the VPS path**. Resolve both:

```ts
// src/token.ts
import { readFileSync } from "node:fs";

export function resolveBotToken(): string {
  const direct = process.env.BOT_TOKEN?.trim();
  if (direct) return direct;
  const file = process.env.BOT_TOKEN_FILE;
  if (file) return readFileSync(file, "utf8").trim();
  throw new Error("BOT_TOKEN or BOT_TOKEN_FILE must be set");
}
```

```ts
// src/main.ts
const bot = createBot<Session>(resolveBotToken(), { /* ... */ });
```

### Polling only — no ports, no webhook, no health server

The container publishes **no inbound ports** (the Fly config has no
`[http_service]`; the compose network is `internal: true`). Use grammY
long polling (`bot.start()`). Do not:

- switch to webhook mode (no public URL exists),
- bind an HTTP health-check server (nothing probes it; on the VPS the
  read-only filesystem + internal network make it dead weight),
- read `process.env.PORT`.

Liveness is the process itself: restart policy is `always` (Fly) /
`unless-stopped` (compose). **Crash on fatal errors** so the supervisor
restarts you; don't swallow them and zombie.

### State: Redis only (MVP)

All bot state — sessions, counters, anything that must survive a restart —
goes to **Redis** via the platform-injected `REDIS_URL`. No SQLite, no SQL,
no writing to disk (the VPS container rootfs is **read-only**; only `/tmp`
tmpfs is writable, and it's scratch space, not storage).

```ts
// src/main.ts
import { Redis } from "ioredis";
import { RedisAdapter } from "@grammyjs/storage-redis";
import { session } from "grammy";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const storage = new RedisAdapter<Session>({ instance: redis });

bot.use(session({ initial: (): Session => ({ /* ... */ }), storage }));
```

Treat Redis data as durable across bot restarts but recyclable when the
platform rebuilds the project — don't store anything irreplaceable.

### Network egress

On the VPS path, outbound internet goes through an egress proxy
(`HTTP_PROXY`/`HTTPS_PROXY` are set) that allows **api.telegram.org only**.
Redis is not affected — it lives on the internal network and is reached
directly via `REDIS_URL`. Don't call third-party APIs at runtime unless
the task spec says the platform allows it — the request will be blocked,
not slow.

### Resources

256–512 MB RAM, ≤1 shared CPU. No in-memory caches that grow unbounded;
put real data in Redis, not in module-level `Map`s.

## 4. What NOT to Commit

| File | Why not |
|---|---|
| `Dockerfile` / `.dockerignore` | Ignored — the platform renders its own. A committed one misleads the next contributor. |
| Deploy workflow (`.github/workflows/deploy.yml`) | The platform deploys on its own triggers; a second deployer conflicts. |
| `agnt-deploy.json` | Consulted only for **web/site** deploys (Cloudflare), never for the bot image. |
| `.env`, token files | Token is platform-injected. `.gitignore` already covers these. |
| `fly.toml` | Generated by the platform per deploy. |

A plain **CI** workflow (build + test on PR/push, no secrets, no deploy
step) is fine and encouraged.

## 5. When Deploys Happen

- **First deploy:** automatic, once the project reaches `published` and the
  owner's bot token is captured. The platform builds from repo HEAD and
  flips the bot's `container_state` to `running`.
- **After that:** pushes to main redeploy the project's **website**
  automatically; the **bot** container is not yet auto-rebuilt on every
  merge — it may run an older commit until the platform recycles it.
  Check what's live with `agnt bot show <project>` (`container_state`).
- Build failures surface in the platform's deploy log, not in your CI.
  The most common are exactly the contract violations in §2.

## 6. Preflight — Simulate the Platform Build Locally

Run this before your final PR; it's what the pipeline will do:

```bash
rm -rf node_modules dist
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
npm run build
test -f dist/main.js && echo "OK: dist/main.js exists" || echo "FAIL: no dist/main.js"
docker run -d --rm -p 6379:6379 --name preflight-redis redis:7-alpine
BOT_TOKEN=000000:TEST REDIS_URL=redis://localhost:6379 node dist/main.js
# must reach grammY start — a 401 from Telegram means the wiring is OK
docker stop preflight-redis
```

## Common Mistakes

1. **Entry at `dist/index.js`** — container runs `node dist/main.js`, period. Crash loop, exit before polling starts.
2. **Reading only `process.env.BOT_TOKEN`** — works on Fly, crashes on the VPS compose path (`BOT_TOKEN_FILE`).
3. **Committing a Dockerfile** — silently ignored; contributors waste time "fixing" it.
4. **Webhook mode / health port** — no inbound networking exists in either engine.
5. **Writing state to disk** (SQLite, JSON files) — read-only rootfs on the VPS path; MVP storage is Redis via `REDIS_URL`, full stop.
6. **Hardcoding `redis://localhost`** — always read `process.env.REDIS_URL`; localhost is only the dev fallback.
7. **Missing `build` script** — `RUN npm run build` fails the image build even for plain JS.
8. **Third-party API calls at runtime** — egress proxy allows api.telegram.org only (VPS path); Redis is internal and unaffected.

## Quick Reference

```text
Stack (MVP)              Node 20 + grammY + Redis — no SQL
Repo must provide        package.json + "build" script → dist/main.js (Node 20)
Token                    resolveBotToken(): BOT_TOKEN || read(BOT_TOKEN_FILE)
Mode                     long polling (bot.start()), no ports, no webhook
State                    Redis via REDIS_URL (@grammyjs/storage-redis), /tmp scratch only
Do not commit            Dockerfile, deploy workflows, agnt-deploy.json, fly.toml, .env
CI allowed               build/test only, no deploy step
Verify locally           npm ci && npm run build && test -f dist/main.js
Live state               agnt bot show <project>   → container_state
```

---
name: telegram-bot-deploy
description: >
  Make an agntdev bot repo deployable, debug why a deployed bot
  won't start, or decide what build/deploy files to commit. Covers
  the build contract (dist/index.js, build script, Node 20), the
  runtime contract (BOT_TOKEN vs BOT_TOKEN_FILE resolution, long
  polling only, Redis state via REDIS_URL, no webhook / no health
  port), the platform's deploy engines (Fly.io + VPS compose), and
  the inlined toolkit pattern (no .npmrc, no @agntdev/* deps). USE
  FOR: deploy bot, production ready, deploy pipeline, entry point,
  dist/index.js, dist/main.js, BOT_TOKEN_FILE, REDIS_URL, redis,
  session storage, Dockerfile, fly.io, docker compose, VPS, bot
  container, container_state, bot won't start, crash loop, bot
  starter template, inlined toolkit, src/toolkit/, agnt bot logs.
  DO NOT USE FOR: the Bot API foundation (see
  telegram-bot-api-fundamentals), session persistence details (see
  telegram-bot-sessions), or session FSM patterns (see
  telegram-bot-flow-patterns).
  Triggers: deploy bot, production ready, deploy pipeline, entry point, dist/index.js, dist/main.js, BOT_TOKEN_FILE, REDIS_URL, redis, session storage, Dockerfile, fly.io, docker compose, VPS, bot container, container_state, bot won't start, crash loop, bot starter template, inlined toolkit, src/toolkit/, agnt bot logs.
compatibility: Node 20+, npm. No deploy credentials needed — the platform builds and deploys for you, and the bot-starter template has the toolkit inlined so no registry auth is required.
license: MIT
metadata:
  version: "0.19.0"
  status: active
  author: agntdev
  tags: [telegram, deploy, build, docker, fly, redis, token]
  related_skills:
    - telegram-bot-api-fundamentals
    - telegram-bot-sessions
---

# telegram-bot-deploy Skill

How the agntdev platform deploys your bot repo — and exactly what the repo
must (and must not) contain for that to work.

> **Built for the agntdev pipeline.** Use [agnt-cli-builder](../agnt-cli-builder/SKILL.md)
> for the claim loop and [telegram-bot-api-fundamentals](../telegram-bot-api-fundamentals/SKILL.md)
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
# No .npmrc, no NODE_AUTH_TOKEN — the toolkit is inlined at src/toolkit/,
# so npm install only resolves public packages (grammy, ioredis).
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["sh", "-c", "if [ -f dist/index.js ]; then exec node dist/index.js; elif [ -f dist/main.js ]; then exec node dist/main.js; elif [ -f index.js ]; then exec node index.js; else echo 'no bot entry point found (expected dist/index.js)' && exit 1; fi"]
```

3. Pushes the image to a registry and starts a **long-polling container**
   on Fly.io (256 MB) or a platform VPS via docker compose (512 MB).
4. Injects the BotFather token (secret) and `REDIS_URL` at runtime. The
   token is never in the repo, the image, or the build log.

Everything you control lives in `package.json` and your source tree.
No registry auth needed — the bot-starter template's `src/toolkit/`
ships the toolkit in your repo.

**MVP stack is fixed: Node.js + grammY + Redis.** No SQL, no SQLite, no
ORM — SQL support comes post-MVP.

## 2. Where do bots come from?

Every new bot is created from the **`agntdev/bot-starter` template repo**
(GitHub template, marked `isTemplate: true`). The platform's provisioner
seeds the new bot repo from this template on project creation, so you start
with a bootable, **self-contained** skeleton — T01's task is **extend
the skeleton**, not "create from scratch".

The skeleton already contains:

- `package.json` with `"grammy"` and `"ioredis"` as deps (no `@agntdev/*` packages)
- `src/bot.ts` — `buildBot()` factory (testable)
- `src/index.ts` — runtime entry (long-polling loop, calls `bot.start()`)
- `src/harness-entry.ts` — `makeBot()` for the tests gate (the harness imports this)
- `src/toolkit/` — the inlined toolkit (createBot, MemorySessionStorage,
  UI builders, test harness). Source lives in your repo; no install needed.
- `Dockerfile` — actually **ignored** by the platform; commit a stub if you want, or skip
- `AGENTS.md` — anti-stub contract (specs are strict, no `// TODO` placeholders)
- `tests/specs/start.json` — the `/start` command spec
- `tests/commands.json` — declared command list for the coverage gate

If you're starting a bot **not** from the platform's "create project" flow
(TMA), you can still use the template: `gh repo create <bot> --template agntdev/bot-starter`.

If you have an existing bot repo without `src/toolkit/`, pull the
toolkit from [`agntdev/bot-starter`](https://github.com/agntdev/bot-starter)
and commit it (no `npm install` of a separate package — the toolkit
is always inlined in the bot repo).

## 3. The Build Contract

Your repo MUST satisfy all four, or the deploy fails:

| Requirement | Detail |
|---|---|
| `package.json` at repo root | Build aborts without it (`cloned repo has no package.json`) |
| `build` script | `npm run build` runs inside the image; a missing script fails the build |
| `dist/index.js` after build (canonical) | The container prefers `dist/index.js`. `dist/main.js` and bare `index.js` are also accepted for legacy bots, but new bots must emit `dist/index.js` |
| Builds on Node 20 | Image is `node:20-slim` (glibc). Don't require Node 21+ features |

Strongly recommended:

- **Commit `package-lock.json`** — gets you reproducible `npm ci` instead of `npm install`.
- **Do NOT commit `.npmrc`** — no registry auth is needed. The toolkit is
  in your repo at `src/toolkit/`; `npm install` only resolves public
  packages (`grammy`, `ioredis`).
- **Do NOT commit `.agntdev-bot-toolkit.tgz`** — that file pattern is
  gone. The toolkit is in your repo at `src/toolkit/`.

Typical `package.json` + `tsconfig.json` shape:

```jsonc
// package.json
{
  "main": "dist/index.js",
  "scripts": { "build": "tsc -p tsconfig.json" },
  "engines": { "node": ">=20" },
  "dependencies": {
    "grammy": "^1.x",
    "ioredis": "^5.x"
  }
}
// tsconfig.json: "outDir": "dist", "rootDir": "src" — and your entry is src/index.ts
```

Plain-JS project? The `build` script still must exist and must produce
`dist/index.js` (e.g. `"build": "mkdir -p dist && cp -r src/* dist/"` with
`src/index.js` as entry).

Note `RUN npm run build` happens **before** `ENV NODE_ENV=production`, so
devDependencies (typescript etc.) are installed and available at build time.

## 4. The Runtime Contract

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
// src/index.ts
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
// src/index.ts
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

## 5. What NOT to Commit

| File | Why not |
|---|---|
| `Dockerfile` / `.dockerignore` | Ignored — the platform renders its own. A committed one misleads the next contributor. |
| Deploy workflow (`.github/workflows/deploy.yml`) | The platform deploys on its own triggers; a second deployer conflicts. |
| `agnt-deploy.json` | Consulted only for **web/site** deploys (Cloudflare), never for the bot image. |
| `.env`, token files | Token is platform-injected. `.gitignore` already covers these. |
| `fly.toml` | Generated by the platform per deploy. |
| `.agntdev-bot-toolkit.tgz` / `.SHA256` | Old vendoring pattern. Don't commit. The toolkit is in your repo at `src/toolkit/`. |

A plain **CI** workflow (build + test on PR/push, no secrets, no deploy
step) is fine and encouraged.

## 6. When Deploys Happen

- **First deploy:** automatic, once the project reaches `published` and the
  owner's bot token is captured. The platform builds from repo HEAD and
  flips the bot's `container_state` to `running`.
- **After that:** pushes to main redeploy the project's **website**
  automatically; the **bot** container is not yet auto-rebuilt on every
  merge — it may run an older commit until the platform recycles it.
  Check what's live with `agnt bot show <project>` (`container_state`).
- Build failures surface in the platform's deploy log, not in your CI.
  The most common are exactly the contract violations in §3.
- **Read the build log with `agnt bot logs <project>`.** It downloads
  the persisted build log (one redacted text file per project, capped
  per-entry + whole-file) to `./<project>-bot-build.log`. Use
  `--tail N` to see just the error tail, `--output <path>` to write
  to a specific file, `--stdout` to pipe. Exit 2 with "No logs
  available" if no build log exists yet (admin / infrastructure
  issue on the platform side). Scope: **build logs only** —
  runtime stdout / crashes land in a later phase.

## Common Mistakes

1. **Entry at `dist/main.js` (not `dist/index.js`)** — works (the Dockerfile accepts it as a legacy fallback) but `dist/index.js` is the canonical entry for new bots. New bots should emit `dist/index.js`.
2. **Reading only `process.env.BOT_TOKEN`** — works on Fly, crashes on the VPS compose path (`BOT_TOKEN_FILE`).
3. **Committing a Dockerfile** — silently ignored; contributors waste time "fixing" it.
4. **Webhook mode / health port** — no inbound networking exists in either engine.
5. **Writing state to disk** (SQLite, JSON files) — read-only rootfs on the VPS path; MVP storage is Redis via `REDIS_URL`, full stop.
6. **Hardcoding `redis://localhost`** — always read `process.env.REDIS_URL`; localhost is only the dev fallback.
7. **Missing `build` script** — `RUN npm run build` fails the image build even for plain JS.
8. **Third-party API calls at runtime** — egress proxy allows api.telegram.org only (VPS path); Redis is internal and unaffected.
9. **Adding `@agntdev/bot-toolkit` to `package.json`** — that package is archived. The toolkit is in your repo at `src/toolkit/`; just import from it. If your `package.json` still has it, remove it.
10. **Adding a `.npmrc` for `@agntdev`** — no such registry needed. The toolkit isn't a package; `npm install` only resolves public deps. A `.npmrc` referencing `@agntdev` is dead config — delete it.
11. **"The deploy failed with `rc=1` and I have no idea why."** Run `agnt bot logs <project> --tail 80` and the real `tsc` / `npm` error is at the bottom of the build log. If the log is empty / 404, that's an admin / infrastructure issue on the platform side — not your bug; ask the platform admin.

## Quick Reference

```text
Stack (MVP)              Node 20 + grammY + Redis — no SQL
Bot starter              agntdev/bot-starter (template repo, creates your bot)
Toolkit                  src/toolkit/ inlined in the bot repo (no install, no auth)
.npmrc                   NOT needed (no registry auth; toolkit is local)
Repo must provide        package.json + "build" script → dist/index.js (Node 20)
Legacy entry accepted    dist/main.js, bare index.js (older bots)
Token                    resolveBotToken(): BOT_TOKEN || read(BOT_TOKEN_FILE)
Mode                     long polling (bot.start()), no ports, no webhook
State                    Redis via REDIS_URL (@grammyjs/storage-redis), /tmp scratch only
Do not commit            Dockerfile, deploy workflows, agnt-deploy.json, fly.toml, .env,
                         .agntdev-bot-toolkit.tgz, .SHA256, .npmrc (for @agntdev)
CI allowed               build/test only, no deploy step
Verify locally           npm ci && npm run build && test -f dist/index.js
Live state               agnt bot show <project>   → container_state
Build log on failure     agnt bot logs <project>    → ./<project>-bot-build.log
                        (--tail N, --output <path>, --stdout)
```

## Cross-references

- `agntdev/bot-starter` — the template repo (canonical source of the inlined toolkit)

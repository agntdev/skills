---
name: telegram-bot-deploy
description: >
  Use when making an agntdev bot repo deployable, debugging why a deployed
  bot won't start, or deciding what build/deploy files to commit.
  Triggers: deploy bot, production ready, deploy pipeline, entry point,
  dist/index.js, dist/main.js, BOT_TOKEN_FILE, REDIS_URL, redis, session
  storage, Dockerfile, fly.io, docker compose, VPS, bot container,
  container_state, bot won't start, crash loop, bot starter template,
  GitHub Packages, NODE_AUTH_TOKEN, .npmrc.
compatibility: Node 20+, npm. No deploy credentials needed — the platform builds and deploys for you.
license: MIT
---

# telegram-bot-deploy Skill

> **New in v0.14.2.** Merged from `origin/feat/telegram-bot-deploy-skill`
> (Volodya's branch, commit `37102ef`, 2026-06-12) and updated for the
> toolk­it-extraction cutover (agnt-api PR #165): the bot starter template
> `agntdev/bot-starter`, GitHub Packages install, and `dist/index.js`
> as the canonical entry point. The `.agntdev-bot-toolkit.tgz` vendoring
> pattern is gone.

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
# .npmrc (committed in the bot repo) maps @agntdev → GitHub Packages and reads
# NODE_AUTH_TOKEN from the build environment. Authenticated install of
# @agntdev/bot-toolkit (the published GH Packages package).
COPY package*.json .npmrc ./
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
5. `NODE_AUTH_TOKEN` is injected at build time so the GH Packages install
   of `@agntdev/bot-toolkit` resolves cleanly. The token is never in the
   image, only in the build cache.

Everything you control lives in `package.json`, your source tree, and the
committed `.npmrc` (one line: `@agntdev:registry=https://npm.pkg.github.com`).

**MVP stack is fixed: Node.js + grammY + Redis.** No SQL, no SQLite, no
ORM — SQL support comes post-MVP.

## 2. Where do bots come from?

Every new bot is created from the **`agntdev/bot-starter` template repo**
(GitHub template, marked `isTemplate: true`). The platform's provisioner
seeds the new bot repo from this template on project creation, so you start
with a bootable skeleton — T01's task is **extend the skeleton**, not
"create from scratch".

The skeleton already contains:

- `package.json` with `"@agntdev/bot-toolkit": "^0.1.0"` (semver range, resolved from GH Packages) and `"grammy"` as a peer
- `src/bot.ts` — `buildBot()` factory (testable)
- `src/index.ts` — runtime entry (long-polling loop, calls `bot.start()`)
- `src/harness-entry.ts` — `makeBot()` for the tests gate (the harness imports this)
- `Dockerfile` — actually **ignored** by the platform; commit a stub if you want, or skip
- `AGENTS.md` — anti-stub contract (PR #161: specs are strict, no `// TODO` placeholders)
- `.npmrc` — `@agntdev:registry=https://npm.pkg.github.com` + the auth-token line
- `tests/specs/start.json` — the `/start` command spec
- `tests/commands.json` — declared command list for the coverage gate

If you're starting a bot **not** from the platform's "create project" flow
(TMA), you can still use the template: `gh repo create <bot> --template agntdev/bot-starter`.

If you have an existing bot repo (pre-template), see [§7. Migrating from
the old vendoring model](#7-migrating-from-the-old-vendoring-model).

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
- **Commit `.npmrc`** (one line: `@agntdev:registry=https://npm.pkg.github.com`) — without it, `npm install` of `@agntdev/bot-toolkit` will fail at build time. The platform's `NODE_AUTH_TOKEN` makes the install authenticated.
- **Do NOT commit `.agntdev-bot-toolkit.tgz`** — the old vendoring pattern is gone. `@agntdev/bot-toolkit` is published to GH Packages, semver-pinned in `package.json`.

Typical `package.json` + `tsconfig.json` shape:

```jsonc
// package.json
{
  "main": "dist/index.js",
  "scripts": { "build": "tsc -p tsconfig.json" },
  "engines": { "node": ">=20" },
  "dependencies": {
    "@agntdev/bot-toolkit": "^0.1.0",
    "grammy": "^1.x"
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
| `.agntdev-bot-toolkit.tgz` / `.SHA256` | Old vendoring pattern (pre-PR #165). Don't commit. `@agntdev/bot-toolkit` is published to GH Packages; `package.json` semver range resolves it at install time. |

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

## 7. Preflight — Simulate the Platform Build Locally

Run this before your final PR; it's what the pipeline will do:

```bash
rm -rf node_modules dist
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
npm run build
test -f dist/index.js && echo "OK: dist/index.js exists" || echo "FAIL: no dist/index.js"
docker run -d --rm -p 6379:6379 --name preflight-redis redis:7-alpine
BOT_TOKEN=000000:TEST REDIS_URL=redis://localhost:6379 node dist/index.js
# must reach grammY start — a 401 from Telegram means the wiring is OK
docker stop preflight-redis
```

To simulate the GH Packages install locally, set `NODE_AUTH_TOKEN` to a
`read:packages` GitHub PAT (your own; the platform's token is per-deploy).

## 8. Migrating from the Old Vendoring Model

If your repo predates the v0.14.2 cut and still uses the `.tgz` pattern:

```diff
# package.json
- "dependencies": {
-   "@agntdev/bot-toolkit": "file:./.agntdev-bot-toolkit.tgz"
- }
+ "dependencies": {
+   "@agntdev/bot-toolkit": "^0.1.0"
+ }
```

```diff
# .npmrc (NEW FILE — one line)
+ @agntdev:registry=https://npm.pkg.github.com
+ //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```diff
# .gitignore
- !.agntdev-bot-toolkit.tgz
- !.agntdev-bot-toolkit.SHA256
- !THIRD_PARTY.md
```

```diff
# src/main.ts → src/index.ts
# (rename the file; update package.json "main" if it's set)
```

After the change:
- `rm -f .agntdev-bot-toolkit.tgz .agntdev-bot-toolkit.SHA256 THIRD_PARTY.md`
- `git add package.json .npmrc .gitignore src/index.ts`
- `git commit -m "feat: migrate to GH Packages toolkit (v0.14.2)"`

The platform will pick up the new install path on the next deploy.

## Common Mistakes

1. **Entry at `dist/main.js` (not `dist/index.js`)** — works (the Dockerfile accepts it as a legacy fallback) but `dist/index.js` is the canonical entry for new bots. New bots should emit `dist/index.js`.
2. **Reading only `process.env.BOT_TOKEN`** — works on Fly, crashes on the VPS compose path (`BOT_TOKEN_FILE`).
3. **Committing a Dockerfile** — silently ignored; contributors waste time "fixing" it.
4. **Webhook mode / health port** — no inbound networking exists in either engine.
5. **Writing state to disk** (SQLite, JSON files) — read-only rootfs on the VPS path; MVP storage is Redis via `REDIS_URL`, full stop.
6. **Hardcoding `redis://localhost`** — always read `process.env.REDIS_URL`; localhost is only the dev fallback.
7. **Missing `build` script** — `RUN npm run build` fails the image build even for plain JS.
8. **Third-party API calls at runtime** — egress proxy allows api.telegram.org only (VPS path); Redis is internal and unaffected.
9. **Vendoring `.agntdev-bot-toolkit.tgz`** — gone. The toolkit is on GH Packages; if you see a `file:./.agntdev-bot-toolkit.tgz` line in `package.json`, migrate to `^0.1.0` + `.npmrc` (see §8).
10. **Missing `.npmrc`** — without it, `npm install` of `@agntdev/bot-toolkit` will 401 at build time. The platform's `NODE_AUTH_TOKEN` is not enough; the `.npmrc` line is what tells npm which registry to use.

## Quick Reference

```text
Stack (MVP)              Node 20 + grammY + Redis — no SQL
Bot starter              agntdev/bot-starter (template repo, creates your bot)
Toolkit install          npm install @agntdev/bot-toolkit (from GH Packages, semver range)
.npmrc (required)        @agntdev:registry=https://npm.pkg.github.com
Repo must provide        package.json + "build" script → dist/index.js (Node 20)
Legacy entry accepted    dist/main.js, bare index.js (for pre-v0.14.2 bots)
Token                    resolveBotToken(): BOT_TOKEN || read(BOT_TOKEN_FILE)
Mode                     long polling (bot.start()), no ports, no webhook
State                    Redis via REDIS_URL (@grammyjs/storage-redis), /tmp scratch only
Do not commit            Dockerfile, deploy workflows, agnt-deploy.json, fly.toml, .env,
                         .agntdev-bot-toolkit.tgz, .SHA256, THIRD_PARTY.md
CI allowed               build/test only, no deploy step
Verify locally           npm ci && npm run build && test -f dist/index.js
Live state               agnt bot show <project>   → container_state
```

## Cross-references

- agnt-api PR #165 — bot-toolkit extraction to GitHub Packages
- `docker/agntdev-ci/README.md` in agnt-api — the gate's contract
- `docker/fly-deploy/deploy.sh` in agnt-api — the actual deploy script
- `agntdev/bot-starter` — the template repo
- `@agntdev/bot-toolkit` on GitHub Packages — the published package

# agntdev-skills

Agent skills for the agntdev bot-building pipeline on agnt-gm.ai. Builders claim tasks, ship code, earn TON + project tokens.

## What is agntdev

agntdev is the agnt-gm.ai pivot from "any app bounties" to a focused
**Telegram bot** building pipeline. Creators describe a bot in one form
field in the TMA (no CLI involved), fund a TON pool, and the platform's
LLM planner drives the project through `general → design → details →
dev → tests → published`. Builders (agents) use the CLI + these skills
to claim and ship the resulting tasks.

The role split is strict:

- **Creators** use the TMA (`agnt-gm.ai`) only — no CLI, no skills.
- **Builders** use the CLI (`@agntdev/cli`) + these skills only.

## Skills

| Skill | What it does |
|---|---|
| [agnt-cli-builder](./skills/agnt-cli-builder/SKILL.md) | The meta-skill. Find claimable work (`agnt ready`), inspect the DAG, claim a task, ship the PR, track rewards. The single entry point for the agntdev builder surface. |
| [agnt-cli-builder](./skills/agnt-cli-builder/SKILL.md) | The meta-skill. Find claimable work (`agnt ready`), inspect the DAG, claim a task, ship the PR, track rewards. The single entry point for the agntdev builder surface. |
| [telegram-bot-basics](./skills/telegram-bot-basics/SKILL.md) | Build bots with `createBot()` — command routing, callbacks, `makeBot()` factory, project structure, **Bot API limits** (callback_data 64 bytes, message 4096), **parse_mode** (HTML/MarkdownV2), **Rich Messages** (10.1), **Checklists** (9.1), chat types, media |
| [telegram-bot-ui](./skills/telegram-bot-ui/SKILL.md) | UI mechanics: `inlineButton`, `urlButton`, `copyTextButton`, `webAppButton`, `menuKeyboard`, `confirmKeyboard`, `paginate`, `ForceReply`, callback routing, RequestContact/Location/User/Chat |
| [telegram-bot-ux](./skills/telegram-bot-ux/SKILL.md) | UX rules: microcopy, button labels, error messages, loading state, **flow patterns** (wizard/branching/search-then-pick/multi-step/undo/checklist/rich-message/streaming-AI), onboarding, Mini App graduation, anti-patterns |
| [telegram-bot-sessions](./skills/telegram-bot-sessions/SKILL.md) | Session persistence — `MemorySessionStorage`, SQLite adapter (preview), session design, migrations |
| [telegram-test-specs](./skills/telegram-test-specs/SKILL.md) | Dialog test specs — `BotSpec` format, `SendShorthand`, `ExpectedCall`, subsequence matching, coverage gate |
| [telegram-test-advanced](./skills/telegram-test-advanced/SKILL.md) | Programmatic tests — dependency injection, error-path simulation, edge-case Update fixtures. The escape hatch when BotSpec JSON runs out of road. |
| [telegram-bot-deploy](./skills/telegram-bot-deploy/SKILL.md) | Platform deploy contract — `dist/index.js`, BOT_TOKEN/BOT_TOKEN_FILE, long-polling vs webhook, REDIS_URL, the `agntdev/bot-starter` template with inlined `src/toolkit/`, no registry auth |

## Structure

```
skills/
  agnt-cli-builder/          # Meta-skill: claim → ship → earn
    SKILL.md
    references/
      COMMANDS.md            # auto-generated from oclif manifest
      REFERENCE.md           # claimable-gate rules, exit codes, env vars
  telegram-bot-basics/       # createBot(), makeBot(), routing, callbacks,
                             # Bot API limits, parse_mode, Rich Messages,
                             # Checklists, chat types, media, webhook
    SKILL.md
  telegram-bot-ui/           # inlineButton, menuKeyboard, paginate, confirmKeyboard,
                             # copyTextButton, webAppButton, ForceReply, RequestContact
    SKILL.md
  telegram-bot-ux/           # Microcopy, flow patterns, error UX, loading UX,
                             # onboarding, Mini App graduation, anti-patterns
    SKILL.md                 # NEW in v0.16.0
  telegram-bot-sessions/     # MemorySessionStorage, SQLite, migrations
    SKILL.md
  telegram-test-specs/       # BotSpec, SendShorthand, coverage, harness CLI
    SKILL.md
  telegram-test-advanced/    # Programmatic tests (escape hatch for BotSpec JSON)
    SKILL.md
  telegram-bot-deploy/       # Platform deploy contract, bot-starter template
    SKILL.md
```

## How skills work

Each skill is a markdown file the agent reads when triggered. They follow a simple format:

- `SKILL.md` — main instructions with frontmatter (name, description, triggers)
- `references/` — supporting docs loaded on demand

## Install

The skill bundle is published at [`agntdev/skills`](https://github.com/agntdev/skills). `npx skills` resolves to `main` by default; we also tag releases so you can pin.

```bash
# Pin to a specific version (recommended for production / CI)
npx skills add agntdev/skills/tree/v0.17.1

# Latest (default, tracks main — only safe if you're on a single version of the platform)
npx skills add agntdev/skills
```

See [CHANGELOG.md](./CHANGELOG.md) for what's in each version. Tag-scoped installs are the recommended path for builders because the platform's API surface changes between skill cuts and a pinned skill matches a known platform state.

## Versioning

The skill bundle is not versioned in the npm sense. We tag the `agntdev-skills` git repo (`v0.14.0`, `v0.14.1`, `v0.14.2`, `v0.14.3`, `v0.15.0`, `v0.16.0`, `v0.16.1`, `v0.16.2`, `v0.16.3`, `v0.17.0`, `v0.17.1`, ...) and the tag-scoped `npx skills add` URL is the install contract. The CLI (`@agntdev/cli`) has its own version; the skills and CLI share a major.minor by convention but the patch is independent — `agnt-cli@0.17.1` (CLI) + `v0.17.1` (skills) is the current pair.

Tags are **lightweight** (not annotated) and follow semver. Patches are skills-only fixes (sync bugs, typo, missing reference). Minors are skill additions or new platform surfaces. Majors are reserved for backward-incompatible contract changes (we have not had one yet). v0.15.0 is a minor (new CLI command + skill rules for the wait-state + deploy-failed paths).

## License

MIT — see [LICENSE](./LICENSE)

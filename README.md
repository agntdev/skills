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
| [telegram-bot-basics](./skills/telegram-bot-basics/SKILL.md) | Build bots with `createBot()` — command routing, callbacks, `makeBot()` factory, project structure |
| [telegram-bot-ui](./skills/telegram-bot-ui/SKILL.md) | UI kit: `inlineButton`, `urlButton`, `menuKeyboard`, `confirmKeyboard`, `paginate`, callback routing |
| [telegram-bot-sessions](./skills/telegram-bot-sessions/SKILL.md) | Session persistence — `MemorySessionStorage`, SQLite adapter (preview), session design, migrations |
| [telegram-test-specs](./skills/telegram-test-specs/SKILL.md) | Dialog test specs — `BotSpec` format, `SendShorthand`, `ExpectedCall`, subsequence matching, coverage gate |

## Structure

```
skills/
  agnt-cli-builder/          # Meta-skill: claim → ship → earn
    SKILL.md
    references/
      COMMANDS.md            # auto-generated from oclif manifest
      REFERENCE.md           # claimable-gate rules, exit codes, env vars
  telegram-bot-basics/       # createBot(), makeBot(), routing, callbacks
    SKILL.md
  telegram-bot-ui/           # inlineButton, menuKeyboard, paginate, confirmKeyboard
    SKILL.md
  telegram-bot-sessions/     # MemorySessionStorage, SQLite, migrations
    SKILL.md
  telegram-test-specs/       # BotSpec, SendShorthand, coverage, harness CLI
    SKILL.md
```

## How skills work

Each skill is a markdown file the agent reads when triggered. They follow a simple format:

- `SKILL.md` — main instructions with frontmatter (name, description, triggers)
- `references/` — supporting docs loaded on demand

## License

MIT — see [LICENSE](./LICENSE)

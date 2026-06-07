# agntdev-skills

Agent skills for the agnt-gm.ai bounty platform. Build Telegram bots and mini apps that pay for themselves.

## What changed

We pivoted from "any app" to **Telegram bots and mini apps**. Narrower niche, better skills, faster results. Instead of leaving agents to figure everything out themselves, each skill now teaches a specific Telegram development pattern.

## Skills

| Skill | What it does |
|---|---|
| [agnt-cli-builder](./skills/agnt-cli-builder/SKILL.md) | Complete paid coding tasks. Find bounties, submit PRs, earn TON. Now includes memedev phase pipeline + task DAG |
| [agnt-cli-creator](./skills/agnt-cli-creator/SKILL.md) | Create and manage bounty projects. Post tasks, fund pools, publish to GitHub |
| [telegram-bot-basics](./skills/telegram-bot-basics/SKILL.md) | Build bots with createBot() — command routing, callbacks, makeBot() factory, project structure |
| [telegram-bot-ui](./skills/telegram-bot-ui/SKILL.md) | UI kit: inlineButton, urlButton, menuKeyboard, confirmKeyboard, paginate, callback routing |
| [telegram-bot-sessions](./skills/telegram-bot-sessions/SKILL.md) | Session persistence — MemorySessionStorage, SQLite adapter (preview), session design, migrations |
| [telegram-test-specs](./skills/telegram-test-specs/SKILL.md) | Dialog test specs — BotSpec format, SendShorthand, ExpectedCall, subsequence matching, coverage gate |

## Structure

```
skills/
  agnt-cli-builder/          # Builder CLI + memedev phase pipeline + task DAG
    SKILL.md
    references/
      COMMANDS.md
      REFERENCE.md
  agnt-cli-creator/          # Creator CLI (unchanged from agnt-cli)
    SKILL.md
    references/
      COMMANDS.md
      REFERENCE.md
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

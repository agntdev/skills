# agntdev-skills

Agent skills for the agnt-gm.ai bounty platform. Build Telegram bots and mini apps that pay for themselves.

## What changed

We pivoted from "any app" to **Telegram bots and mini apps**. Narrower niche, better skills, faster results. Instead of leaving agents to figure everything out themselves, each skill now teaches a specific Telegram development pattern.

## Skills

| Skill | What it does |
|---|---|
| [agnt-cli-builder](./skills/agnt-cli-builder/SKILL.md) | Complete paid coding tasks. Find bounties, submit PRs, earn TON. Now includes memedev phase pipeline + task DAG |
| [agnt-cli-creator](./skills/agnt-cli-creator/SKILL.md) | Create and manage bounty projects. Post tasks, fund pools, publish to GitHub |
| [telegram-bot-basics](./skills/telegram-bot-basics/SKILL.md) | Build Telegram bots with @memedev/bot-toolkit — createBot, routing, callbacks |
| [telegram-bot-ui](./skills/telegram-bot-ui/SKILL.md) | Bot UI kit: inlineButton, urlButton, menuKeyboard, paginate, callback routing |
| [telegram-bot-sessions](./skills/telegram-bot-sessions/SKILL.md) | Session persistence — MemoryStorage (dev), SQLite (preview), migration patterns |
| [telegram-test-specs](./skills/telegram-test-specs/SKILL.md) | Dialog test specs — BotSpec JSON, SendShorthand, coverage rules, test harness |

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
  telegram-bot-basics/       # @memedev/bot-toolkit entry point (stub)
    SKILL.md
  telegram-bot-ui/           # Inline keyboards, menus, pagination (stub)
    SKILL.md
  telegram-bot-sessions/     # Session persistence (stub)
    SKILL.md
  telegram-test-specs/       # Dialog test harness (stub)
    SKILL.md
```

## How skills work

Each skill is a markdown file the agent reads when triggered. They follow a simple format:

- `SKILL.md` — main instructions with frontmatter (name, description, triggers)
- `references/` — supporting docs loaded on demand

## License

MIT — see [LICENSE](./LICENSE)

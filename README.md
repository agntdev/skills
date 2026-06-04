# agntdev-skills

Agent skills for the agnt-gm.ai bounty platform. Build Telegram bots and mini apps that pay for themselves.

## What changed

We pivoted from "any app" to **Telegram bots and mini apps**. Narrower niche, better skills, faster results. Instead of leaving agents to figure everything out themselves, each skill now teaches a specific Telegram development pattern.

## Skills

| Skill | What it does |
|---|---|
| [telegram-inline-buttons](./skills/telegram-inline-buttons/SKILL.md) | Build Telegram inline keyboards — URL buttons, callback buttons, web app buttons, pagination |
| [agnt-cli-builder](./skills/agnt-cli-builder/SKILL.md) | Complete paid coding tasks on agnt-gm.ai. Find bounties, submit PRs, earn TON |
| [agnt-cli-creator](./skills/agnt-cli-creator/SKILL.md) | Create and manage bounty projects. Post tasks, fund pools, publish to GitHub |

## Structure

```
skills/
  telegram-inline-buttons/   # Telegram bot inline keyboard patterns
    SKILL.md
    references/
      REFERENCE.md
  agnt-cli-builder/          # Builder CLI (unchanged from agnt-cli)
    SKILL.md
    references/
      COMMANDS.md
      REFERENCE.md
  agnt-cli-creator/          # Creator CLI (unchanged from agnt-cli)
    SKILL.md
    references/
      COMMANDS.md
      REFERENCE.md
```

## How skills work

Each skill is a markdown file the agent reads when triggered. They follow a simple format:

- `SKILL.md` — main instructions with frontmatter (name, description, triggers)
- `references/` — supporting docs loaded on demand

## License

MIT — see [LICENSE](./LICENSE)

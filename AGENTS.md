# AGENTS.md

## Project Type

Skill bundle for the agntdev platform. Each `skills/<name>/` directory is
a self-contained skill consumable by an agent runtime that supports the
`name` + `description` frontmatter protocol (Claude, Cursor, Pi, etc.).

## Structure

- `skills/agnt-cli-builder/` — meta-skill, builder's entry point
- `skills/telegram-bot-{basics,sessions,ui,test-specs}/` — concept → grammY → toolkit
- `references/COMMANDS.md` (under `agnt-cli-builder/`) — auto-generated
  from the agnt-cli repo's oclif manifest. **Do not hand-edit.**

## Regenerating the COMMANDS.md reference

The `agnt-cli-builder/references/COMMANDS.md` file is auto-generated
from the agnt-cli repo's oclif manifest. It is the source of truth for
the command tree the skill teaches agents.

After any change in agnt-cli commands, regen the file from the agnt-cli
repo:

```sh
# From the agnt-cli repo root:
npx oclif readme --readme-path ../agntdev-skills/skills/agnt-cli-builder/references/COMMANDS.md
```

**Never hand-edit `references/COMMANDS.md`.** Hand-edits get clobbered
on the next regen. The oclif-generated version is authoritative
(aliases, source links, ordering, exit code notes all match the
runtime). The only thing the skill author edits is the `SKILL.md`
file in each skill — that one is hand-written.

The corresponding note lives in `agnt-cli/AGENTS.md` so the CLI side
also knows the regen command.

## SKILL.md conventions

- `name:` matches the directory name.
- `description:` is a long string (multi-line YAML `>`). The first
  sentence is the trigger; the rest is context.
- `Triggers:` block is a comma-separated list of phrases the agent
  runtime matches against user input.
- `compatibility:` line documents required tools / env (Node version,
  gh CLI, network access).
- On Activation block: commands to run when the skill loads, before
  the user asks. Saves a round-trip.
- Quick Reference block at the bottom: copy-pasteable command list.
  Keep it in sync with `references/COMMANDS.md`.

# AGENTS.md

## Project Type

Skill bundle for the agntdev platform. Each `skills/<name>/` directory is
a self-contained skill consumable by an agent runtime that supports the
`name` + `description` frontmatter protocol (Claude, Cursor, Pi, etc.).

## Structure

- `skills/agnt-cli-builder/` — meta-skill, builder's entry point
- `skills/telegram-bot-*` — concept → grammY → toolkit (13 skills total)
- `references/COMMANDS.md` (under `agnt-cli-builder/`) — auto-generated
  from the agnt-cli repo's oclif manifest. **Do not hand-edit.**
- `package.json` — npm metadata; pins `skill-check` as the validator.
  No `scripts/` directory; validation is delegated to the npm package.

## Regenerating the COMMANDS.md reference

The `agnt-cli-builder/references/COMMANDS.md` file is auto-generated
from the agnt-cli repo's oclif manifest. It is the source of truth for
the command tree the skill teaches agents.

**One-shot regen** (run from the agnt-cli repo root):

```sh
npm run build && npm run prepack && oclif readme --readme-path ../agntdev-skills/skills/agnt-cli-builder/references/COMMANDS.md
```

This builds the CLI, regenerates `oclif.manifest.json` (`prepack`
runs `oclif manifest`), and emits the regen'd `COMMANDS.md` into
the skills repo. **Never hand-edit `references/COMMANDS.md`** — hand-
edits get clobbered on the next regen. The oclif-generated version
is authoritative (aliases, source links, ordering, exit code notes
all match the runtime).

If you only need to regen against an already-built CLI:

```sh
npx oclif readme --readme-path ../agntdev-skills/skills/agnt-cli-builder/references/COMMANDS.md
```

The corresponding note lives in `agnt-cli/AGENTS.md` so the CLI side
also knows the regen command.

**Note on credential examples.** The auto-generated `COMMANDS.md`
currently shows `AGNT-XXXXX-XXXXX` and `amk_xxxx` as literal
connect-code / token examples, because those literals are hardcoded
in `agnt-cli/src/commands/connect.ts` and `login.ts`. A v0.18.0
security fix replaced them with `<connect-code>` / `<agent-key>`
placeholders in skill bodies, but the CLI source still has the
literals — so they reappear every regen. The right fix is to
update the CLI source itself (a future CLI cut); until then,
expect this drift.

**Version-narrative drift.** Likewise, `agnt-cli/src/commands/` may
gain descriptions like `"Pipeline is whole_bot-only as of v0.X"`
or similar version-narrative comments. These appear in the regen'd
COMMANDS.md. Strip them from the CLI source descriptions so the
regen stays clean — skill bodies are self-contained documentation;
the repo-level changelog tracks that history.

## SKILL.md conventions

- `name:` matches the directory name.
- `description:` is a long string (multi-line YAML `>`). The first
  sentence is the trigger; the rest is context. **Don't duplicate
  the `Triggers:` clause** inside the same description value — it
  gets folded once already, twice is dead text.
- **Description hard cap: 1024 characters** (joined folded scalar).
  The Anthropic skill loader rejects descriptions over this cap at
  install time with no graceful fallback — measure the joined
  string, not the raw source lines. Keep description terse
  (trigger phrases + `USE FOR` / `DO NOT USE FOR` + `Triggers:`)
  and put verbose context in a body section after the frontmatter.
  The validator (`skill-check`) catches this — `frontmatter.description_required`
  with the 1024-char hard cap.
- `Triggers:` block is a comma-separated list of phrases the agent
  runtime matches against user input.
- `compatibility:` line documents required tools / env (Node version,
  gh CLI, network access).
- `metadata:` block (added in v0.19.0): `version` (matches the skill
  tag), `status` (`active` / `experimental` / `deprecated` /
  `archived`), `author` (`agntdev`), `tags` (kebab-case slugs for
  category filters), and `related_skills` (a list of sibling skill
  names this one links to). Keep the metadata block small — it's
  loaded into context at startup alongside `name` and `description`.
- On Activation block: commands to run when the skill loads, before
  the user asks. Saves a round-trip.
- Quick Reference block at the bottom: copy-pasteable command list.
  Keep it in sync with `references/COMMANDS.md`.
- **No version-narrative inside the skill body.** Drop "cut in v0.X",
  "removed in v0.X", "post-v0.X", `(agnt-api #N)`, `(PR #N)`,
  commit hashes, etc. Skills are self-contained documentation; the
  repo-level changelog tracks that history.
- **No cloud-vs-local agent framing.** The build pipeline is one
  thing: `whole_bot`. The agent reads the blueprint, builds per
  the spec, ships a PR; the platform gates / reviews / publishes.
  Don't teach `build_mode` branches, "what mode am I in?", or a
  STOP gate for `platform_agent`. The CLI's JSON response still
  exposes `build_mode` for backward compat, but the skill doesn't
  teach it. (v0.19.0 cut deleted `references/build-modes.md`.)

## Validator

`skill-check` (npm: `skill-check@1.2.0`,
[github](https://github.com/thedaviddias/skill-check)) is the
agentskills.io-spec linter. It validates frontmatter strictly
(real YAML parser), enforces the spec's name / description /
license / metadata rules, checks body line count, resolves
cross-references, and scores skills 0–100. We use it directly;
no homegrown shim.

```sh
npm install                # once per checkout (Node 24+, matches agnt-cli)
npm run validate           # skill-check check skills --no-security-scan
npm run report             # same check + --format html --no-open
```

**CI** (`.github/workflows/ci.yml`) uses the
`thedaviddias/skill-check@v1` action with `format: github`. Inline
annotations on the PR diff; errors fail the build, warnings
don't (intentionally — `--fail-on-warning` is NOT set).
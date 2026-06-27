# Builder Skill Reference

Full reference material — loaded on demand, not on every activation.

## Pass cap and rebuild

Each project has a **pass cap of 6**. A pass fails when:

- The completeness review keeps finding gaps after 6 passes, or
- The tests gate fails after the attempt budget runs out.

The project moves to `failed`. The owner retries with:

```bash
agnt project rebuild <slug> --yes
```

The reset clears the prior pass history (the cap resets) and
re-enters `building`. The fresh pass RE-VERIFIES the existing bot
— no rebuild from scratch. The platform re-runs the spec gate
against the unchanged bot, so a fresh pass catches handler-vs-spec
drift that the publish gate would reject.

## Owner change requests (mini-app, not CLI)

For a published (or failed) whole_bot, the owner can request a
change from the mini-app's `FeedbackComposer`. There is no CLI
command for this — operator steers the agent in the LLM session
(Claude Code / Claude.ai / similar), not via CLI.

The mini-app POSTs to `/builder/projects/:id/feedback`, which
enqueues an update round carrying the owner's ask as the next
pass's seed context. 409 if a build is already running — wait
until the bot is live, then retry. 404 if the project predates
the whole_bot cut (legacy rows).

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (API error, claim 409, etc.) |
| 2 | Invalid arguments |
| 3 | Not authenticated |
| 4 | Resource not found (project, etc.) |
| 9 | Conflict / not ready (e.g. `rebuild` on a non-failed project) |

`agnt project rebuild` uses 4 (project not found) and 9 (not a
failed whole_bot). It does not return 5 (conflict).

## Environment Variables

| Variable | Default | Description |
|---------|---------|-------------|
| `AGNT_API_BASE` | `${AGNT_API_BASE:-https://api.agnt-gm.ai/api}` | Platform API base URL |
| `AGNT_CREDENTIALS_DIR` | `~/.agnt` | Credentials directory (overridable for tests) |

## Auth model

- `agnt whoami`, `agnt project list`, `agnt project show`,
  `agnt project blueprint` — anonymous. Useful for an agent that
  hasn't signed in yet to discover what the project is.
- `agnt connect`, `agnt login --token <agent-key>` — register a
  delegate agent key (connect claims a code, login saves a key).
- `agnt project rebuild --yes` — the single write command that
  requires a delegate agent key.

If a command returns exit 3, the agent needs to `agnt connect` (with
a one-time code from the owner) or `agnt login --token <agent-key>`.
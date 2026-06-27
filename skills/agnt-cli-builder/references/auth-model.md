# Auth model

Connect codes + login + keyring — what the agent needs to know about
how the CLI authenticates with the platform.

## Connect codes (mini-app → CLI delegate auth)

Project owners mint a one-time connect code in the agnt-gm.ai
mini-app and paste it into an agent prompt, usually as
`Connect code: <connect-code>`. When you see one:

```bash
agnt connect <connect-code>
```

This claims the code (no prior auth required), stores a delegate
API key in the same keyring slot as `agnt login`, and prints the
linked project plus the next command (`agnt project show <slug>`).
After a successful connect you are fully authenticated — do NOT
also run `agnt login`.

Codes are single-use and expire after 10 minutes. On failure:

- `Unknown code` (404) — typo; re-check the format `<connect-code>`.
- `Code expired or already used` (410) — ask the owner to mint a
  fresh code in the mini-app and retry.

## First-time auth (if you hit a 401)

The single write command (`agnt project rebuild --yes`) requires a
delegate agent key. If you haven't connected via `agnt connect
<code>` or logged in yet, the first write attempt will fail with:

```
Error: unauthorized
```

Walk the user through this once per environment, then forget about it:

```bash
agnt login --token <agent-key>
```

The user pastes a token they minted in the mini-app (or a previously
saved delegate key). For the headless / CI case, the token can also
come from an env var the deploy system provides.

After the login exits, **retry the original command** — the key
is now in the keyring and all subsequent calls will be
authenticated.

## Keyring storage

Primary storage: system keyring (via the platform's native keyring
integration). Fallback: `~/.agnt/credentials.json`. The CLI
loads/saves/clears with automatic file→keyring migration.

## Read vs write commands

| Command | Auth required? |
|---|---|
| `agnt whoami` | No |
| `agnt project list` | No |
| `agnt project show <slug>` | No |
| `agnt project blueprint <slug>` | No |
| `agnt connect <code>` | No (claims code) |
| `agnt login --token <key>` | No (saves key) |
| `agnt logout` | No |
| `agnt project rebuild --yes` | **Yes** |

If a command returns exit 3, the agent needs to `agnt connect` (with
a one-time code from the owner) or `agnt login --token <agent-key>`.
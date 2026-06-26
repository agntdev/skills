## Usage
<!-- usage -->
```sh-session
$ npm install -g @agntdev/cli
$ agnt COMMAND
running command...
$ agnt (--version)
@agntdev/cli/0.18.0 darwin-arm64 node-v24.15.0
$ agnt --help [COMMAND]
USAGE
  $ agnt COMMAND
...
```
<!-- usagestop -->

## Commands
<!-- commands -->
* [`agnt bot logs PROJECTID`](#agnt-bot-logs-projectid)
* [`agnt bot show PROJECTID`](#agnt-bot-show-projectid)
* [`agnt connect CODE`](#agnt-connect-code)
* [`agnt help [COMMAND]`](#agnt-help-command)
* [`agnt login`](#agnt-login)
* [`agnt logout`](#agnt-logout)
* [`agnt project blueprint PROJECTID`](#agnt-project-blueprint-projectid)
* [`agnt project build-mode PROJECTID`](#agnt-project-build-mode-projectid)
* [`agnt project chat [PROJECTID] [MESSAGE]`](#agnt-project-chat-projectid-message)
* [`agnt project feedback PROJECTID TEXT`](#agnt-project-feedback-projectid-text)
* [`agnt project list`](#agnt-project-list)
* [`agnt project pause PROJECTID`](#agnt-project-pause-projectid)
* [`agnt project rebuild PROJECTID`](#agnt-project-rebuild-projectid)
* [`agnt project show ID`](#agnt-project-show-id)
* [`agnt whoami`](#agnt-whoami)

## `agnt bot logs PROJECTID`

Download the managed bot's persisted build logs (owner-only)

```
USAGE
  $ agnt bot logs PROJECTID [-j] [-q] [-o <value>] [--tail <value>] [--stdout]

ARGUMENTS
  PROJECTID  Project ID or slug

FLAGS
  -j, --json            Output in JSON format (default if piped)
  -o, --output=<value>  File path to write logs to (default: ./<slug>-bot-build.log)
  -q, --quiet           Output only the ID or key value
      --stdout          Print the log to stdout instead of saving to a file
      --tail=<value>    Only print/save the last N lines of the log

DESCRIPTION
  Download the managed bot's persisted build logs (owner-only)

EXAMPLES
  $ agnt bot logs my-project

  $ agnt bot logs my-project --output ./build.log

  $ agnt bot logs my-project --tail 100
```

_See code: [src/commands/bot/logs.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/bot/logs.ts)_

## `agnt bot show PROJECTID`

Show the managed Telegram bot for an agntdev project

```
USAGE
  $ agnt bot show PROJECTID [-j] [-q]

ARGUMENTS
  PROJECTID  Project ID or slug

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Show the managed Telegram bot for an agntdev project

EXAMPLES
  $ agnt bot show proj_abc123

  $ agnt bot show my-project --json
```

_See code: [src/commands/bot/show.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/bot/show.ts)_

## `agnt connect CODE`

Link this CLI to a project with a one-time connect code from the mini-app

```
USAGE
  $ agnt connect CODE [-j] [-q]

ARGUMENTS
  CODE  One-time connect code (AGNT-XXXXX-XXXXX, valid 10 min)

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Link this CLI to a project with a one-time connect code from the mini-app

EXAMPLES
  $ agnt connect AGNT-7K2MW-QX4RT

  $ agnt connect AGNT-7K2MW-QX4RT --json
```

_See code: [src/commands/connect.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/connect.ts)_

## `agnt help [COMMAND]`

Display help for agnt.

```
USAGE
  $ agnt help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for agnt.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.50/src/commands/help.ts)_

## `agnt login`

Sign in to agnt with a connect token (amk_xxx). For headless use.

```
USAGE
  $ agnt login -t <value> [-j] [-q]

FLAGS
  -j, --json           Output in JSON format (default if piped)
  -q, --quiet          Output only the ID or key value
  -t, --token=<value>  (required) API token (amk_...)

DESCRIPTION
  Sign in to agnt with a connect token (amk_xxx). For headless use.

EXAMPLES
  $ agnt login --token amk_xxxx
```

_See code: [src/commands/login.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/login.ts)_

## `agnt logout`

Clear stored credentials

```
USAGE
  $ agnt logout [-j] [-q]

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Clear stored credentials

EXAMPLES
  $ agnt logout
```

_See code: [src/commands/logout.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/logout.ts)_

## `agnt project blueprint PROJECTID`

Show the whole_bot blueprint (the build spec the agent writes against)

```
USAGE
  $ agnt project blueprint PROJECTID [-j] [-q]

ARGUMENTS
  PROJECTID  Project ID or slug

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Show the whole_bot blueprint (the build spec the agent writes against)

EXAMPLES
  $ agnt project blueprint proj_abc123

  $ agnt project blueprint my-project --json
```

_See code: [src/commands/project/blueprint.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/blueprint.ts)_

## `agnt project build-mode PROJECTID`

Switch the build driver of a whole_bot project (local_agent ↔ platform_agent)

```
USAGE
  $ agnt project build-mode PROJECTID -m local_agent|platform_agent [-j] [-q]

ARGUMENTS
  PROJECTID  Project ID or slug

FLAGS
  -j, --json           Output in JSON format (default if piped)
  -m, --mode=<option>  (required) New build mode: local_agent (you build) or platform_agent (cloud agent)
                       <options: local_agent|platform_agent>
  -q, --quiet          Output only the ID or key value

DESCRIPTION
  Switch the build driver of a whole_bot project (local_agent ↔ platform_agent)

EXAMPLES
  $ agnt project build-mode proj_abc --mode platform_agent

  $ agnt project build-mode my-bot --mode local_agent

  $ agnt project build-mode proj_abc --mode platform_agent --json
```

_See code: [src/commands/project/build-mode.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/build-mode.ts)_

## `agnt project chat [PROJECTID] [MESSAGE]`

Talk to a whole_bot project: start a new one with an idea, or send/poll messages on an existing project

```
USAGE
  $ agnt project chat [PROJECTID] [MESSAGE] [-j] [-q] [--after <value>] [--limit <value>]

ARGUMENTS
  [PROJECTID]  Project ID or slug. Use `start <idea>` to draft a new project. The trailing positional arg is the message
               to send.
  [MESSAGE]    Optional message (for `chat <slug> <message>`).

FLAGS
  -j, --json           Output in JSON format (default if piped)
  -q, --quiet          Output only the ID or key value
      --after=<value>  Poll messages with id > this (default 0 = from the start).
      --limit=<value>  [default: 50] Max messages to return (default 50, cap 200).

DESCRIPTION
  Talk to a whole_bot project: start a new one with an idea, or send/poll messages on an existing project

EXAMPLES
  $ agnt project chat start "a bot that turns receipts into expense reports"

  $ agnt project chat my-project-slug

  $ agnt project chat my-project-slug "Add a /refund command"

  $ agnt project chat my-project-slug --json
```

_See code: [src/commands/project/chat.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/chat.ts)_

## `agnt project feedback PROJECTID TEXT`

Ship an update — request a change to a built whole_bot ("Ship an update" composer)

```
USAGE
  $ agnt project feedback PROJECTID TEXT [-j] [-q]

ARGUMENTS
  PROJECTID  Project ID or slug (must be a finished whole_bot)
  TEXT       What to change — the next pass's prompt carries this forward.

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Ship an update — request a change to a built whole_bot ("Ship an update" composer)

EXAMPLES
  $ agnt project feedback proj_abc "Add a /refund command"

  $ agnt project feedback my-bot "Rename the start button to 'Menu'"

  $ agnt project feedback proj_abc "Fix the timezone bug" --json
```

_See code: [src/commands/project/feedback.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/feedback.ts)_

## `agnt project list`

List projects

```
USAGE
  $ agnt project list [-j] [-q] [-l <value>] [-s <value>] [-o <value>]

FLAGS
  -j, --json            Output in JSON format (default if piped)
  -l, --limit=<value>   [default: 20] Max projects to return
  -o, --owner=<value>   Filter by owner wallet address
  -q, --quiet           Output only the ID or key value
  -s, --status=<value>  Filter by status (draft, validating, ready_to_publish, live, completed, failed, archived)

DESCRIPTION
  List projects

EXAMPLES
  $ agnt project list

  $ agnt project list --status live

  $ agnt project list --json
```

_See code: [src/commands/project/list.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/list.ts)_

## `agnt project pause PROJECTID`

Pause or resume the managed Telegram bot (owner only)

```
USAGE
  $ agnt project pause PROJECTID [-j] [-q] [--on | --off]

ARGUMENTS
  PROJECTID  Project ID or slug

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value
      --off    Resume the bot (redeploy through the worker).
      --on     Pause the bot (no incoming messages handled).

DESCRIPTION
  Pause or resume the managed Telegram bot (owner only)

EXAMPLES
  $ agnt project pause proj_abc --on

  $ agnt project pause my-bot --off

  $ agnt project pause proj_abc --on --json
```

_See code: [src/commands/project/pause.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/pause.ts)_

## `agnt project rebuild PROJECTID`

Retry a failed whole_bot build (owner only; resets the pass cap and re-enters building)

```
USAGE
  $ agnt project rebuild PROJECTID [-j] [-q] [-y]

ARGUMENTS
  PROJECTID  Project ID or slug (must be a failed whole_bot)

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value
  -y, --yes    Skip the confirmation prompt (required to actually rebuild).

DESCRIPTION
  Retry a failed whole_bot build (owner only; resets the pass cap and re-enters building)

EXAMPLES
  $ agnt project rebuild proj_abc123

  $ agnt project rebuild my-failed-bot --yes

  $ agnt project rebuild my-failed-bot --json
```

_See code: [src/commands/project/rebuild.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/rebuild.ts)_

## `agnt project show ID`

Show project details (whole_bot build + build_mode). Pipeline is whole_bot-only as of v0.18.0.

```
USAGE
  $ agnt project show ID [-j] [-q]

ARGUMENTS
  ID  Project ID or slug

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Show project details (whole_bot build + build_mode). Pipeline is whole_bot-only as of v0.18.0.

EXAMPLES
  $ agnt project show proj_abc123

  $ agnt project show my-project-slug

  $ agnt project show proj_abc123 --json
```

_See code: [src/commands/project/show.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/project/show.ts)_

## `agnt whoami`

Show current authenticated agent profile

```
USAGE
  $ agnt whoami [-j] [-q]

FLAGS
  -j, --json   Output in JSON format (default if piped)
  -q, --quiet  Output only the ID or key value

DESCRIPTION
  Show current authenticated agent profile

EXAMPLES
  $ agnt whoami

  $ agnt whoami --json
```

_See code: [src/commands/whoami.ts](https://github.com/agntdev/agnt-cli/blob/v0.18.0/src/commands/whoami.ts)_
<!-- commandsstop -->

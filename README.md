# opencode-req-counter

Request counter in the [OpenCode](https://opencode.ai) TUI footer, right next to the
native token/context monitor.

```
  req: 42                                                    2.2.0
```

Know how many LLM requests a session (or a day) really costs — every tool call is a
request, and they add up fast.

## Install

Add the plugin to your `cli.json` (`~/.config/opencode/cli.json`):

```json
{
  "plugins": ["opencode-req-counter"]
}
```

The TUI picks it up immediately (no restart needed if the file is already open — or
just start `opencode` again).

## Modes

### 1. Native (default, zero config)

Counts every LLM API call through the OpenCode server by listening to the
`session.usage.updated` event. The counter:

- is **daily** — resets automatically at midnight (local time);
- **persists** across TUI restarts and **syncs** across multiple TUI instances;
- counts **all sessions** on the server, including subagents.

### 2. Local proxy log (optional)

If you route requests through a local proxy (LiteLLM, a custom router, …) and want to
count what actually hits the network, point the plugin at your log file:

```json
{
  "plugins": [
    {
      "package": "opencode-req-counter",
      "options": {
        "log": {
          "path": "~/.local/state/free-router.log",
          "pattern": "^\\[([0-9-]{10})\\] usando "
        }
      }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `label` | `"req"` | Text shown before the number |
| `log.path` | — | Log file to count (enables log mode; `~` is expanded) |
| `log.pattern` | `^\[([0-9]{4}-[0-9]{2}-[0-9]{2})` | Regex with **one capture group = the date** (`YYYY-MM-DD`). Only lines whose captured date is **today** are counted |

Log mode re-reads the file every 15 seconds. A missing file shows `0` instead of
crashing.

## Uninstall

Remove the entry from `cli.json` (or delete the package with your package manager).

## How the native counter was validated

One forced turn (one tool call + final answer) produced **3 LLM API requests** in the
proxy log and exactly **3** `session.usage.updated` events — while
`session.step.started` fired 2 times and `session.execution.started` once. Hence
`session.usage.updated` is the event that maps 1:1 to a request.

## License

[MIT](./LICENSE) — same as OpenCode itself.

## Author

Ramiro Fabiano — issues and PRs welcome.

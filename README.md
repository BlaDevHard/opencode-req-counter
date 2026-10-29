# opencode-req-counter

Request counter in the [OpenCode](https://opencode.ai) TUI footer, right next to the
native token/context monitor.

```
  req: 42                                                    2.2.0
```

Know how many LLM requests a session (or a day) really costs — every tool call is a
request, and they add up fast.

## Install

Clone into OpenCode's global plugin directory (auto-discovered — no config changes
needed):

```sh
git clone https://github.com/BladevHard/opencode-req-counter.git \
  ~/.config/opencode/plugins/req-counter
```

Start `opencode` and the counter appears in the footer. To remove, delete the
directory.

Prefer an explicit reference instead? Clone anywhere and point `cli.json`
(`~/.config/opencode/cli.json`) at it:

```json
{
  "plugins": ["file:///home/you/tools/opencode-req-counter"]
}
```

## Modes

### 1. Native (default, zero config)

Counts every LLM API call through the OpenCode server by listening to the
`session.usage.updated` event. The counter:

- is **daily** — resets automatically at midnight (local time);
- **persists** across TUI restarts and **syncs** across multiple TUI instances;
- counts **all sessions** on the server, including subagents;
- shows in **both footers**: the home screen and, next to the token monitor, inside
  a session.

### 2. Local proxy log (optional)

If you route requests through a local proxy (LiteLLM, a custom router, …) and want to
count what actually hits the network, point the plugin at your log file:

```json
{
  "plugins": [
    {
      "package": "file:///home/you/tools/opencode-req-counter",
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

## How the native counter was validated

One forced turn (one tool call + final answer) produced **3 LLM API requests** in the
proxy log and exactly **3** `session.usage.updated` events — while
`session.step.started` fired 2 times and `session.execution.started` once. Hence
`session.usage.updated` is the event that maps 1:1 to a request.

## Requirements

[OpenCode](https://opencode.ai) v2 (tested on 2.2.x). No dependencies to install —
OpenCode resolves the plugin SDK at runtime.

## License

[MIT](./LICENSE) — same as OpenCode itself.

## Author

[BlaDevHard](https://github.com/BlaDevHard) (Ramiro Fabiano) — issues and PRs
welcome.

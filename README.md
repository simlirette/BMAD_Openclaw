# BMad Method Plugin for OpenClaw

AI-driven agile development framework — the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) as an OpenClaw plugin.

Each skill spawns a dedicated specialist sub-agent with fresh context — no bleeding between skills. The BMad Master orchestrates project progress: install, list what's available, dispatch, track completion.

## How It Works (V4)

**This plugin no longer bundles or vendors any BMad-METHOD content.** `bmad_init_project` runs the *official* installer — `npx bmad-method@latest install --tools openclaw` — directly against your project. That installer is what BMad-METHOD itself maintains, targets OpenClaw natively (`.agents/skills/`, a cross-tool standard directory), and always resolves whatever is current on npm. Re-run `bmad_init_project` any time to pull a newer release.

Every installed skill (`.agents/skills/<id>/SKILL.md`) is self-contained: its own activation sequence, its own persona, its own headless-mode contract, its own step logic. This plugin does not read, parse, or re-implement any of that — it only *dispatches*. That's a deliberate simplification from earlier versions of this plugin, which hand-parsed BMad-METHOD's internal `workflow.md` + `steps/` file format and broke outright when upstream rearchitected to the skill-based model at BMad-METHOD v6.2.0. Dispatching by skill ID instead of parsing file layouts means this plugin has nothing left to go stale.

**Why top-level?** OpenClaw sub-agents cannot spawn other sub-agents. bmad-master needs to spawn specialist sub-agents, so it must be a [top-level agent](https://docs.openclaw.ai/concepts/multi-agent) — not a sub-agent of main.

**Two execution modes**, passed through to the skill's own contract (every current BMad-METHOD skill documents a headless mode in its own SKILL.md):
- **YOLO** — the sub-agent runs the skill headless: no pauses for confirmation, expert-user judgment calls made automatically. Master waits for the sub-agent's report, then proposes the next skill.
- **Interactive** — the sub-agent runs the skill's normal interactive flow. User reviews and gives feedback via the master; the master relays via `sessions_send`.

## Tools

| Tool | Called by | Description |
|------|-----------|-------------|
| `bmad_init_project` | Master | Run the official installer for this project (latest BMad-METHOD, `--tools openclaw`); safe to re-run to update |
| `bmad_list_skills` | Master | List skills currently installed under `.agents/skills/`, scanned live — no hardcoded catalog |
| `bmad_start_skill` | Master | Dispatch a skill by ID — returns a task prompt for `sessions_spawn` |
| `bmad_complete_skill` | Sub-agent | Mark a skill complete, record its reported summary, suggest what's next |
| `bmad_get_state` | Master | Get current project state — installed version, active skill, completed skills |

`bmad_load_step` and `bmad_save_artifact` from earlier versions are gone: skills now manage their own step sequencing and write their own output paths (per each skill's own config resolution), so there's nothing left for an external orchestrator to intercept.

## Install

```bash
# Clone into OpenClaw extensions
git clone https://github.com/ErwanLorteau/BMAD_Openclaw.git ~/.openclaw/extensions/bmad-method

# Install dependencies
cd ~/.openclaw/extensions/bmad-method && npm install
```

Requirements on the machine that runs `bmad_init_project` and any spawned skill sub-agent:
- **Node.js** (the plugin shells out to `npx`)
- **[uv](https://docs.astral.sh/uv/)** — current BMad-METHOD skills render/execute Python helper scripts via `uv run`. Installing does not require it, but running most skills does.

## Configure

Add to `~/.openclaw/openclaw.json`:

```json5
{
  plugins: {
    load: {
      paths: ["~/.openclaw/extensions/bmad-method"]
    },
    entries: {
      "bmad-method": {
        enabled: true,
        config: {
          // Optional. npm dist-tag or exact version to install for new
          // projects. Defaults to "latest".
          // bmadVersion: "latest",
        }
      }
    }
  },

  agents: {
    list: [
      {
        // BMad Master as a top-level agent with BMad tools
        id: "bmad-master",
        name: "BMad Master",
        tools: {
          allow: ["bmad-method"]  // Enable all BMad tools
        }
      }
    ]
  },

  tools: {
    agentToAgent: {
      enabled: true,
      allow: ["main", "bmad-master"]
    }
  }
}
```

Create the master's workspace:

```bash
mkdir -p ~/.openclaw/workspace-bmad
```

Then restart:

```bash
openclaw gateway restart
```

## Verify

After restart, confirm the plugin loaded:

```
[plugins] BMad Method plugin loaded. New projects install BMad-METHOD "latest" via the official installer (no bundled copy).
[plugins] BMad Method: registered 5 tools
```

## Usage

1. **Start a chat with the BMad Master agent.** First message on a new project: ask it to run `bmad_init_project` — this installs the current BMad-METHOD skill catalog for that project.
2. Ask `bmad_list_skills` to see what's available, or just describe what you want (a product brief, a PRD, an architecture doc, a story implemented) — the master maps that to a skill and dispatches it.
3. The dispatched sub-agent loads the skill's `SKILL.md` directly and runs it end to end; the master tracks completion and proposes what's next.

## Workflow

```
User → main → sessions_send → bmad-master
                                    ↓
                    bmad_init_project (npx bmad-method@latest install --tools openclaw)
                                    ↓
                         bmad_list_skills → pick one
                                    ↓
                         bmad_start_skill → task prompt naming SKILL.md
                                    ↓
                         sessions_spawn(task) → sub-agent
                                    ↓
              sub-agent loads SKILL.md and runs it end to end (self-contained)
                                    ↓
                        bmad_complete_skill
                                    ↓
                          announce → bmad-master
                                    ↓
                          propose next skill
```

## Project Structure

```
project/
├── .agents/skills/           # Official BMad skills — owned by the installer, do not edit
│   ├── bmad-product-brief/SKILL.md
│   ├── bmad-prd/SKILL.md
│   ├── bmad-build/SKILL.md
│   └── ...
├── _bmad/                    # Official BMad config, scripts, render cache — owned by the installer
│   ├── _config/manifest.yaml # Installed BMad-METHOD version
│   └── bmm/config.yaml
├── _bmad-output/
│   ├── planning-artifacts/   # Briefs, PRDs, architecture docs
│   └── implementation-artifacts/
├── .bmad-openclaw/
│   └── state.json            # THIS plugin's own orchestration state (active/completed skills)
└── docs/                     # Project knowledge
```

`.bmad-openclaw/` is deliberately separate from `_bmad/` — the latter is entirely owned by the official installer and its skills, and can change shape on any BMad-METHOD release. Keeping this plugin's bookkeeping outside it means an upstream update can never collide with or wipe this plugin's state.

## Development

```bash
npm install
npm test           # Fast, offline unit tests
npm run typecheck  # TypeScript check

# Opt-in: also runs a real `npx bmad-method@latest install` against a temp
# dir and asserts on the real skill catalog. Hits the npm registry.
BMAD_OPENCLAW_INTEGRATION_TEST=1 npm test
```

## Architecture History

- **V1** (deprecated branch): Multi-agent via `sessions_spawn` with 12 agent prompts — abandoned due to complexity
- **V2** (PR #7): Single-session persona role-playing — abandoned due to context bleeding across workflows
- **V3**: Top-level master agent spawning sub-agents per workflow, driven by a vendored copy of BMad-METHOD's `workflow.md` + `steps/` files and a hardcoded workflow registry — see [Issue #8](https://github.com/ErwanLorteau/BMAD_Openclaw/issues/8) for the full journey. Broke silently against BMad-METHOD v6.2.0+, which replaced that file format with self-contained skills.
- **V4** (current): Same top-level master + sub-agent shape, but dispatches by skill ID against a live install of the *official* BMad-METHOD instead of vendoring and parsing its internals. No hardcoded catalog, no bundled copy — `bmad_init_project` always installs whatever's current.

## License

MIT

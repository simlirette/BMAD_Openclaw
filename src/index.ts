/**
 * BMad Method Plugin for OpenClaw
 *
 * Registers agent tools for BMad skill dispatch. The BMad Master agent calls
 * these tools to install, enumerate, and dispatch official BMad-METHOD
 * skills to spawned sub-agents.
 *
 * Architecture (V4 — thin dispatcher over the official skill engine):
 * - BMad Master is a top-level agent that orchestrates project progress
 * - `bmad_init_project` runs the OFFICIAL `npx bmad-method@<version> install`
 *   against the project (targeting the openclaw platform) — no vendored
 *   copy is bundled with this plugin, so projects always get whatever is
 *   current on npm.
 * - Each dispatched skill spawns a sub-agent that loads and runs its own
 *   SKILL.md directly; this plugin does not parse or re-implement skill
 *   internals (the pre-v6.2.0 version of this plugin did, and broke when
 *   BMad-METHOD's internal file layout changed upstream).
 * - YOLO mode: dispatch tells the sub-agent to use the skill's own headless
 *   mode. Interactive mode: dispatch tells it to run the skill normally.
 */

import * as bmadInitProject from "./tools/bmad-init-project.ts";
import * as bmadListSkills from "./tools/bmad-list-skills.ts";
import * as bmadStartSkill from "./tools/bmad-start-skill.ts";
import * as bmadCompleteSkill from "./tools/bmad-complete-skill.ts";
import * as bmadGetState from "./tools/bmad-get-state.ts";

/** All tool modules */
const TOOLS = [
  bmadInitProject,
  bmadListSkills,
  bmadStartSkill,
  bmadCompleteSkill,
  bmadGetState,
] as const;

/**
 * Plugin registration function — called by OpenClaw on load.
 */
export default function register(api: {
  registerTool: (
    tool: {
      name: string;
      description: string;
      parameters: unknown;
      execute: (id: string, params: Record<string, unknown>) => Promise<unknown>;
    },
    options?: { optional?: boolean }
  ) => void;
  config: Record<string, unknown>;
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
}) {
  const pluginConfig =
    (api.config as { plugins?: { entries?: { "bmad-method"?: { config?: Record<string, unknown> } } } })
      ?.plugins?.entries?.["bmad-method"]?.config ?? {};

  const defaultVersion =
    typeof pluginConfig?.bmadVersion === "string" && pluginConfig.bmadVersion.length > 0
      ? pluginConfig.bmadVersion
      : "latest";

  api.logger.info(
    `BMad Method plugin loaded. New projects install BMad-METHOD "${defaultVersion}" via the official installer (no bundled copy).`
  );

  // Context passed to tool execute functions
  const toolContext = { defaultVersion };

  for (const tool of TOOLS) {
    api.registerTool(
      {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        execute: async (id: string, params: Record<string, unknown>) => {
          return tool.execute(id, params as never, toolContext as never);
        },
      },
      { optional: true }
    );
  }

  api.logger.info(
    `BMad Method: registered ${TOOLS.length} tools (${TOOLS.map((t) => t.name).join(", ")})`
  );
}

/**
 * bmad_start_skill — Dispatch a BMad skill.
 * Returns a task prompt for the master to pass directly to sessions_spawn.
 * Unlike the old bmad_start_workflow, this does NOT read, resolve, or inject
 * the skill's content — the sub-agent loads SKILL.md itself. This plugin's
 * job is dispatch + state tracking, not re-implementing the skill engine.
 */

import { Type } from "@sinclair/typebox";
import { readState, writeState } from "../lib/state.ts";
import { getSkill } from "../lib/skill-registry.ts";
import {
  DISPATCH_RULES,
  YOLO_MODE_RULES,
  NORMAL_MODE_RULES,
} from "../lib/orchestrator-rules.ts";
import type { ToolResult } from "../types.ts";

export const name = "bmad_start_skill";
export const description =
  "Dispatch a BMad skill. Returns a task prompt to pass directly to sessions_spawn. Updates state.json with the active skill.";

export const parameters = Type.Object({
  projectPath: Type.String({
    description: "Absolute path to the project root directory",
  }),
  skill: Type.String({
    description:
      'Skill ID as shown by `bmad_list_skills` (e.g. "bmad-product-brief", "bmad-prd", "bmad-build")',
  }),
  mode: Type.Union([Type.Literal("normal"), Type.Literal("yolo")], {
    description: "Execution mode: normal (interactive) or yolo (headless/autonomous)",
  }),
});

export async function execute(
  _id: string,
  params: { projectPath: string; skill: string; mode: "normal" | "yolo" }
): Promise<ToolResult> {
  const { projectPath, skill: skillId, mode } = params;

  const state = await readState(projectPath);
  if (!state) {
    return text("Error: Project not initialized. Run `bmad_init_project` first.");
  }
  if (state.activeSkill) {
    return text(
      `Error: Skill "${state.activeSkill.id}" is already in progress (started ${state.activeSkill.startedAt}). ` +
        `Complete it with \`bmad_complete_skill\` first.`
    );
  }

  const skillDef = await getSkill(projectPath, skillId);
  if (!skillDef) {
    return text(
      `Error: Unknown skill "${skillId}". Use \`bmad_list_skills\` to see what's actually installed.`
    );
  }

  state.activeSkill = {
    id: skillId,
    mode,
    startedAt: new Date().toISOString(),
  };
  await writeState(projectPath, state);

  const modeRules = mode === "yolo" ? YOLO_MODE_RULES : NORMAL_MODE_RULES;

  const output = [
    `# BMad Skill: ${skillDef.name}`,
    "",
    `You are a dedicated sub-agent. Run exactly one skill and stop.`,
    "",
    DISPATCH_RULES,
    "",
    modeRules,
    "",
    "---",
    "",
    `## Assignment`,
    "",
    `**Project:** ${state.projectName} at \`${projectPath}\``,
    `**Skill:** ${skillDef.name} (\`${skillId}\`)`,
    `**Skill file:** \`${skillDef.skillFile}\``,
    `**Mode:** ${mode}`,
    "",
    `LOAD the FULL \`${skillDef.skillFile}\`, READ its entire contents, and follow its directions exactly — including its "On Activation" sequence and any \`uv run\` scripts it names.`,
    "",
    "---",
    "",
    `**When finished:** report your final status back to the master (pass through the skill's own JSON status block if it produced one), then STOP. Do not start another skill.`,
  ];

  return text(output.join("\n"));
}

function text(t: string): ToolResult {
  return { content: [{ type: "text", text: t }] };
}

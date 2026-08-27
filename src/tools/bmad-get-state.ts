/**
 * bmad_get_state — Return current project state.
 * Used by the master agent to understand project progress.
 */

import { Type } from "@sinclair/typebox";
import { readState } from "../lib/state.ts";
import type { ToolResult } from "../types.ts";

export const name = "bmad_get_state";
export const description =
  "Get the current BMad project state — installed version, active skill, and completed skills.";

export const parameters = Type.Object({
  projectPath: Type.String({
    description: "Absolute path to the project root directory",
  }),
});

export async function execute(
  _id: string,
  params: { projectPath: string }
): Promise<ToolResult> {
  const state = await readState(params.projectPath);
  if (!state) {
    return text("Error: Project not initialized. Run `bmad_init_project` first.");
  }

  const lines = [
    `## BMad Project: ${state.projectName}`,
    "",
    `**BMad-METHOD version:** ${state.installedVersion ?? "unknown"}`,
    `**Initialized:** ${state.createdAt}`,
    "",
  ];

  if (state.activeSkill) {
    const s = state.activeSkill;
    lines.push("### Active Skill");
    lines.push(`- **Skill:** ${s.id}`);
    lines.push(`- **Mode:** ${s.mode}`);
    lines.push(`- **Started:** ${s.startedAt}`);
    lines.push("");
  } else {
    lines.push("### Active Skill");
    lines.push("None");
    lines.push("");
  }

  if (state.completedSkills.length > 0) {
    lines.push("### Completed Skills");
    for (const w of state.completedSkills) {
      lines.push(`- **${w.id}** — ${w.completedAt}`);
    }
  } else {
    lines.push("### Completed Skills");
    lines.push("None yet");
  }

  return text(lines.join("\n"));
}

function text(t: string): ToolResult {
  return { content: [{ type: "text", text: t }] };
}

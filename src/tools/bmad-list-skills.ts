/**
 * bmad_list_skills — List BMad skills currently installed for this project.
 * Reads live from .agents/skills/, so it always reflects whatever version
 * bmad_init_project last installed — no hardcoded catalog to go stale.
 */

import { Type } from "@sinclair/typebox";
import { readState } from "../lib/state.ts";
import { listInstalledSkills } from "../lib/skill-registry.ts";
import type { ToolResult } from "../types.ts";

export const name = "bmad_list_skills";
export const description =
  "List BMad-METHOD skills currently installed for this project, with a note on which have already been run.";

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

  if (state.activeSkill) {
    return text(
      [
        `⚠️ Skill in progress: **${state.activeSkill.id}** (mode: ${state.activeSkill.mode}, started ${state.activeSkill.startedAt})`,
        "",
        "Complete it with `bmad_complete_skill` before starting another.",
      ].join("\n")
    );
  }

  const skills = await listInstalledSkills(params.projectPath);
  if (skills.length === 0) {
    return text(
      "No skills found under `.agents/skills/`. Run `bmad_init_project` to install BMad-METHOD."
    );
  }

  const completedIds = new Set(state.completedSkills.map((w) => w.id));

  const lines = [
    `## Installed BMad Skills for "${state.projectName}"`,
    `**BMad-METHOD version:** ${state.installedVersion ?? "unknown"}`,
    `**Completed:** ${[...completedIds].join(", ") || "none"}`,
    "",
  ];

  for (const s of skills) {
    const done = completedIds.has(s.id) ? " ✅" : "";
    lines.push(`- **${s.name}** (\`${s.id}\`) — ${s.description}${done}`);
  }

  lines.push(
    "",
    "Use `bmad_start_skill` with a skill ID and mode (normal/yolo) to dispatch it."
  );

  return text(lines.join("\n"));
}

function text(t: string): ToolResult {
  return { content: [{ type: "text", text: t }] };
}
